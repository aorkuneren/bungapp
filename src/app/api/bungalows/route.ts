import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import slugify from 'slugify'
import { createCachedResponse, getFromMemoryCache, setInMemoryCache } from '@/lib/performance/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Create cache key based on query parameters
    const cacheKey = `bungalows:${status || 'all'}:${search || 'none'}`
    
    // Try to get from cache first
    const cached = getFromMemoryCache(cacheKey)
    if (cached) {
      return createCachedResponse(cached, { maxAge: 30, staleWhileRevalidate: 60 })
    }

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const bungalows = await prisma.bungalow.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { reservations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Convert Decimal to number for JSON serialization
    const serializedBungalows = bungalows.map(bungalow => ({
      ...bungalow,
      basePrice: bungalow.basePrice.toNumber()
    }))

    // Cache the result for 30 seconds
    setInMemoryCache(cacheKey, serializedBungalows, 30000)

    return createCachedResponse(serializedBungalows, { maxAge: 30, staleWhileRevalidate: 60 })
  } catch (error) {
    console.error('Failed to fetch bungalows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bungalows' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.capacity || body.basePrice === undefined) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      )
    }

    const slug = slugify(body.name, { lower: true, strict: true })
    
    const bungalow = await prisma.bungalow.create({
      data: {
        name: body.name,
        slug,
        description: body.description || '',
        capacity: body.capacity,
        basePrice: body.basePrice,
        priceIncludesVat: body.priceIncludesVat !== undefined ? body.priceIncludesVat : true,
        features: body.features || {},
        status: body.status || 'ACTIVE',
      },
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
        action: 'CREATE',
        entity: 'BUNGALOW',
        entityId: bungalow.id,
        meta: {
          bungalowData: bungalow,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    // Convert Decimal to number for JSON serialization
    const serializedBungalow = {
      ...bungalow,
      basePrice: bungalow.basePrice.toNumber()
    }

    return NextResponse.json(serializedBungalow, { status: 201 })
  } catch (error) {
    console.error('Failed to create bungalow:', error)
    return NextResponse.json(
      { error: 'Failed to create bungalow' },
      { status: 500 }
    )
  }
}
