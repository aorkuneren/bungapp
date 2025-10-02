import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        bungalow: {
          select: { name: true, slug: true, priceIncludesVat: true }
        },
        createdByUser: {
          select: { name: true, email: true }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

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

    return NextResponse.json(serializedReservation)
  } catch (error) {
    console.error('Failed to fetch reservation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { customerName, customerEmail, customerPhone, guests, notes, status } = body

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !guests) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      )
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        bungalow: {
          select: { name: true }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        customerName,
        customerEmail,
        customerPhone,
        guests,
        notes,
        status: status || reservation.status,
      },
      include: {
        bungalow: {
          select: { name: true, slug: true }
        },
        createdByUser: {
          select: { name: true, email: true }
        }
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE',
        entity: 'RESERVATION',
        entityId: reservation.id,
        meta: {
          code: reservation.code,
          customerName: updatedReservation.customerName,
          bungalowName: reservation.bungalow.name,
          changes: {
            customerName: { from: reservation.customerName, to: customerName },
            customerEmail: { from: reservation.customerEmail, to: customerEmail },
            customerPhone: { from: reservation.customerPhone, to: customerPhone },
            guests: { from: reservation.guests, to: guests },
            status: { from: reservation.status, to: status || reservation.status },
          }
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    // Convert Decimal fields to numbers for JSON serialization
    const serializedUpdatedReservation = {
      ...updatedReservation,
      baseAmount: updatedReservation.baseAmount.toNumber(),
      discountAmount: updatedReservation.discountAmount.toNumber(),
      extrasAmount: updatedReservation.extrasAmount.toNumber(),
      taxAmount: updatedReservation.taxAmount.toNumber(),
      totalAmount: updatedReservation.totalAmount.toNumber(),
      depositAmount: updatedReservation.depositAmount.toNumber(),
      remainingAmount: updatedReservation.remainingAmount.toNumber(),
    }

    return NextResponse.json(serializedUpdatedReservation)
  } catch (error) {
    console.error('Failed to update reservation:', error)
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    )
  }
}
