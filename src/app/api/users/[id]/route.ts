import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs'

const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'RESEPSIYONIST']).optional(),
})

// GET /api/users/[id] - Tek kullanıcı getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prisma bağlantısını test et
    await prisma.$connect()

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdReservations: true,
            auditLogs: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    
    // Prisma bağlantı hatası kontrolü
    if (error instanceof Error && error.message.includes('Engine is not yet connected')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/users/[id] - Kullanıcı güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prisma bağlantısını test et
    await prisma.$connect()

    const { id } = await params
    const body = await request.json()
    
    // Boş şifre alanını temizle
    if (body.password === '') {
      delete body.password
    }
    
    const validatedData = UserUpdateSchema.parse(body)

    // Kullanıcının var olup olmadığını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Eğer e-posta güncelleniyorsa, başka kullanıcıda aynı e-posta var mı kontrol et
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor' },
          { status: 400 }
        )
      }
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
    }

    // Şifre güncelleniyorsa hashle (boş string değilse)
    if (validatedData.password && validatedData.password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(validatedData.password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE',
        entity: 'USER',
        entityId: id,
        meta: {
          updatedFields: Object.keys(validatedData),
          updatedUser: {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          }
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    
    // Prisma bağlantı hatası kontrolü
    if (error instanceof Error && error.message.includes('Engine is not yet connected')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Kullanıcı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prisma bağlantısını test et
    await prisma.$connect()

    const { id } = await params

    // Kendi hesabını silmeye çalışıyor mu kontrol et
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz' },
        { status: 400 }
      )
    }

    // Kullanıcının var olup olmadığını kontrol et
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdReservations: true,
            auditLogs: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Kullanıcının aktif rezervasyonu var mı kontrol et
    const activeReservations = await prisma.reservation.count({
      where: {
        createdByUserId: id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
        }
      }
    })

    if (activeReservations > 0) {
      return NextResponse.json(
        { error: 'Bu kullanıcının aktif rezervasyonları bulunuyor. Önce rezervasyonları iptal edin.' },
        { status: 400 }
      )
    }

    // Kullanıcıyı sil
    await prisma.user.delete({
      where: { id }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        entity: 'USER',
        entityId: id,
        meta: {
          deletedUser: {
            name: user.name,
            email: user.email,
            role: user.role,
          }
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    
    // Prisma bağlantı hatası kontrolü
    if (error instanceof Error && error.message.includes('Engine is not yet connected')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
