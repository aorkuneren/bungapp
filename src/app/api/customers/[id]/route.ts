import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CustomerUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'BANNED']).optional(),
})

// GET /api/customers/[id] - Tek müşteri getir
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
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        reservations: {
          include: {
            bungalow: {
              select: {
                name: true,
                slug: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Son 10 rezervasyon
        },
        _count: {
          select: {
            reservations: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/customers/[id] - Müşteri güncelle
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
    const validatedData = CustomerUpdateSchema.parse(body)

    // Eğer e-posta güncelleniyorsa, başka müşteride aynı e-posta var mı kontrol et
    if (validatedData.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id }
        }
      })

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Bu e-posta adresi başka bir müşteri tarafından kullanılıyor' },
          { status: 400 }
        )
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: {
            reservations: true
          }
        }
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE',
        entity: 'CUSTOMER',
        entityId: id,
        meta: {
          updatedFields: Object.keys(validatedData),
          customerName: updatedCustomer.name,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error('Error updating customer:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/customers/[id] - Müşteri sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin kontrolü
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    // Müşteriyi kontrol et
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservations: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Aktif rezervasyonu var mı kontrol et
    const activeReservations = await prisma.reservation.count({
      where: {
        customerId: id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
        }
      }
    })

    if (activeReservations > 0) {
      return NextResponse.json(
        { error: 'Bu müşterinin aktif rezervasyonları bulunuyor. Önce rezervasyonları iptal edin.' },
        { status: 400 }
      )
    }

    // Müşteriyi BANNED olarak işaretle (soft delete)
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { status: 'BANNED' }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        entity: 'CUSTOMER',
        entityId: id,
        meta: {
          customerName: customer.name,
          customerEmail: customer.email,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}