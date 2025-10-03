import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { PricingEngine } from '@/lib/pricing/engine'
import { EmailService } from '@/lib/mail/sender'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: Record<string, any> = {}
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          bungalow: {
            select: { name: true, slug: true }
          },
          createdByUser: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.reservation.count({ where })
    ])

    // Convert Decimal fields to numbers for JSON serialization
    const serializedReservations = reservations.map(reservation => ({
      ...reservation,
      baseAmount: reservation.baseAmount.toNumber(),
      discountAmount: reservation.discountAmount.toNumber(),
      extrasAmount: reservation.extrasAmount.toNumber(),
      taxAmount: reservation.taxAmount.toNumber(),
      totalAmount: reservation.totalAmount.toNumber(),
      depositAmount: reservation.depositAmount.toNumber(),
      remainingAmount: reservation.remainingAmount.toNumber(),
    }))

    return NextResponse.json({
      reservations: serializedReservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    })
  } catch (error) {
    console.error('Failed to fetch reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      bungalowId, 
      customerId,
      checkIn, 
      checkOut, 
      guests, 
      customerName, 
      customerEmail, 
      customerPhone, 
      notes,
      manualPrice,
      depositAmount,
      totalAmount
    } = body

    // Validate required fields
    if (!bungalowId || !checkIn || !checkOut || !guests || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      )
    }

    // Check availability
    const isAvailable = await PricingEngine.checkAvailability(
      bungalowId,
      new Date(checkIn),
      new Date(checkOut)
    )

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Seçilen tarihlerde bungalov müsait değil' },
        { status: 400 }
      )
    }

    // Calculate pricing (only if manual price is not provided)
    let pricing
    if (manualPrice === null || manualPrice === undefined) {
      pricing = await PricingEngine.calculatePricing({
        bungalowId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests,
      })
    } else {
      // Use manual pricing
      pricing = {
        baseAmount: manualPrice,
        discountAmount: 0,
        extrasAmount: 0,
        taxAmount: 0,
        totalAmount: manualPrice
      }
    }

    // Generate reservation code
    const code = `RES-${Date.now().toString().slice(-6)}`

    // Calculate nights
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))

    // Calculate deposit and remaining amounts
    const deposit = depositAmount || 0
    const finalTotalAmount = totalAmount || pricing.totalAmount
    const remaining = Math.max(0, finalTotalAmount - deposit)
    
    // Determine payment status
    let paymentStatus = 'NONE'
    if (deposit > 0 && remaining > 0) {
      paymentStatus = 'PARTIAL'
    } else if (deposit > 0 && remaining === 0) {
      paymentStatus = 'COMPLETED'
    }

    // Create or find customer
    let finalCustomerId = customerId
    if (!customerId) {
      // Check if customer already exists by email
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: customerEmail }
      })

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id
        // Update customer info if needed
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: customerName,
            phone: customerPhone,
            totalSpent: {
              increment: finalTotalAmount
            }
          }
        })
      } else {
        // Create new customer
        const newCustomer = await prisma.customer.create({
          data: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            status: 'ACTIVE',
            totalSpent: finalTotalAmount,
          }
        })
        finalCustomerId = newCustomer.id
      }
    } else {
      // Update existing customer's total spent
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          totalSpent: {
            increment: finalTotalAmount
          }
        }
      })
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        code,
        bungalowId,
        customerId: finalCustomerId,
        customerName,
        customerEmail,
        customerPhone,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights,
        guests,
        baseAmount: pricing.baseAmount,
        discountAmount: pricing.discountAmount,
        extrasAmount: pricing.extrasAmount,
        taxAmount: pricing.taxAmount,
        totalAmount: finalTotalAmount,
        depositAmount: deposit,
        remainingAmount: remaining,
        isManualPrice: manualPrice !== null && manualPrice !== undefined,
        paymentStatus: paymentStatus as 'NONE' | 'PARTIAL' | 'COMPLETED',
        status: 'PENDING',
        notes,
        createdByUserId: session.user.id,
      },
      include: {
        bungalow: {
          select: { name: true, slug: true }
        }
      }
    })

    // Send confirmation email
    try {
      await EmailService.sendReservationConfirmation({
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        reservationCode: reservation.code,
        bungalowName: reservation.bungalow.name,
        checkIn: reservation.checkIn.toISOString().split('T')[0],
        checkOut: reservation.checkOut.toISOString().split('T')[0],
        nights: reservation.nights,
        guests: reservation.guests,
        totalAmount: reservation.totalAmount.toNumber(),
        status: reservation.status,
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the reservation creation if email fails
    }


    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'CREATE',
        entity: 'RESERVATION',
        entityId: reservation.id,
        meta: {
          code: reservation.code,
          customerName: reservation.customerName,
          bungalowName: reservation.bungalow.name,
          customerId: finalCustomerId,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    // Convert Decimal fields to numbers for JSON serialization
    const serializedReservation = {
      ...reservation,
      baseAmount: reservation.baseAmount.toNumber(),
      discountAmount: reservation.discountAmount.toNumber(),
      extrasAmount: reservation.extrasAmount.toNumber(),
      taxAmount: reservation.taxAmount.toNumber(),
      totalAmount: reservation.totalAmount.toNumber(),
      depositAmount: reservation.depositAmount.toNumber(),
      remainingAmount: reservation.remainingAmount.toNumber(),
    }

    return NextResponse.json(serializedReservation, { status: 201 })
  } catch (error) {
    console.error('Failed to create reservation:', error)
    
    // More detailed error handling
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Rezervasyon oluşturulamadı' },
      { status: 500 }
    )
  }
}
