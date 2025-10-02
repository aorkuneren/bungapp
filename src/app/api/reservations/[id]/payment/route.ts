import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

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
    const { paymentStatus } = body

    // Validate payment status
    if (!paymentStatus || !['NONE', 'PARTIAL', 'COMPLETED'].includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Geçersiz ödeme durumu' },
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

    // Ödeme durumu COMPLETED olduğunda kalan ödemeyi sıfırla
    const updateData: Record<string, any> = {
      paymentStatus,
    }

    if (paymentStatus === 'COMPLETED') {
      updateData.remainingAmount = 0
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        bungalow: {
          select: { name: true, slug: true, priceIncludesVat: true }
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
        action: 'UPDATE_PAYMENT',
        entity: 'RESERVATION',
        entityId: reservation.id,
        meta: {
          code: reservation.code,
          customerName: reservation.customerName,
          bungalowName: reservation.bungalow.name,
          paymentStatusChange: {
            from: reservation.paymentStatus,
            to: paymentStatus
          },
          remainingAmount: paymentStatus === 'COMPLETED' ? 0 : reservation.remainingAmount.toNumber()
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
    console.error('Failed to update payment status:', error)
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    )
  }
}
