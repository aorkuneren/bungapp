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
    const bungalow = await prisma.bungalow.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { reservations: true }
        }
      }
    })

    if (!bungalow) {
      return NextResponse.json({ error: 'Bungalow not found' }, { status: 404 })
    }

    // Convert Decimal to number for JSON serialization
    const serializedBungalow = {
      ...bungalow,
      basePrice: bungalow.basePrice.toNumber()
    }

    return NextResponse.json(serializedBungalow)
  } catch (error) {
    console.error('Failed to fetch bungalow:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bungalow' },
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

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, capacity, basePrice, priceIncludesVat, status, features } = body

    // For bulk updates, we don't require all fields
    // Only validate if fields are provided

    const bungalow = await prisma.bungalow.findUnique({
      where: { id }
    })

    if (!bungalow) {
      return NextResponse.json(
        { error: 'Bungalow not found' },
        { status: 404 }
      )
    }

    // Prepare update data - only include provided fields
    const updateData: Record<string, any> = {}
    
    if (name !== undefined) {
      updateData.name = name
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    }
    
    if (description !== undefined) {
      updateData.description = description || null
    }
    
    if (capacity !== undefined) {
      updateData.capacity = capacity
    }
    
    if (basePrice !== undefined) {
      updateData.basePrice = basePrice
    }
    
    if (priceIncludesVat !== undefined) {
      updateData.priceIncludesVat = priceIncludesVat
    }
    
    if (status !== undefined) {
      updateData.status = status
    }
    
    if (features !== undefined) {
      updateData.features = features
    }

    const updatedBungalow = await prisma.bungalow.update({
      where: { id },
      data: updateData,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { reservations: true }
        }
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE',
        entity: 'BUNGALOW',
        entityId: bungalow.id,
        meta: {
          name: updatedBungalow.name,
          slug: updatedBungalow.slug,
          changes: {
            name: { from: bungalow.name, to: name },
            description: { from: bungalow.description, to: description },
            capacity: { from: bungalow.capacity, to: capacity },
            basePrice: { from: bungalow.basePrice.toNumber(), to: basePrice },
            status: { from: bungalow.status, to: status || bungalow.status },
          }
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    // Convert Decimal to number for JSON serialization
    const serializedUpdatedBungalow = {
      ...updatedBungalow,
      basePrice: updatedBungalow.basePrice.toNumber()
    }

    return NextResponse.json(serializedUpdatedBungalow)
  } catch (error) {
    console.error('Failed to update bungalow:', error)
    return NextResponse.json(
      { error: 'Failed to update bungalow' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if bungalow exists
    const existingBungalow = await prisma.bungalow.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
            }
          }
        }
      }
    })

    if (!existingBungalow) {
      return NextResponse.json(
        { error: 'Bungalow not found' },
        { status: 404 }
      )
    }

    // Check if there are active reservations
    if (existingBungalow.reservations.length > 0) {
      return NextResponse.json(
        { error: 'Bu bungalov aktif rezervasyonlara sahip olduğu için silinemez' },
        { status: 400 }
      )
    }

    // Delete the bungalow
    await prisma.bungalow.delete({
      where: { id }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        entity: 'BUNGALOW',
        entityId: id,
        meta: {
          deletedBungalow: existingBungalow,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json({ message: 'Bungalow deleted successfully' })
  } catch (error) {
    console.error('Failed to delete bungalow:', error)
    return NextResponse.json(
      { error: 'Failed to delete bungalow' },
      { status: 500 }
    )
  }
}
