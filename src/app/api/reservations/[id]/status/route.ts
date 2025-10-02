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
    const { status } = body

    if (!status || !['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
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
      data: { status },
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
          oldStatus: reservation.status,
          newStatus: status,
          customerName: reservation.customerName,
          bungalowName: reservation.bungalow.name,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json(updatedReservation)
  } catch (error) {
    console.error('Failed to update reservation status:', error)
    return NextResponse.json(
      { error: 'Failed to update reservation status' },
      { status: 500 }
    )
  }
}
