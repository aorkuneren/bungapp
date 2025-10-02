import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { CustomerCreateSchema } from '@/lib/validation/schemas'
import { createCachedResponse, getFromMemoryCache, setInMemoryCache } from '@/lib/performance/cache'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Create cache key based on query parameters
    const cacheKey = `customers:${status || 'all'}:${search || 'none'}:${limit}:${offset}`
    
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
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { reservations: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where })
    ])

    const serializedCustomers = customers.map(customer => ({
      ...customer,
      totalSpent: customer.totalSpent.toNumber(),
    }))

    const result = {
      customers: serializedCustomers,
      total,
      hasMore: offset + limit < total
    }

    // Cache the result for 30 seconds
    setInMemoryCache(cacheKey, result, 30000)

    return createCachedResponse(result, { maxAge: 30, staleWhileRevalidate: 60 })
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
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
    const validatedFields = CustomerCreateSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, phone, address, notes } = validatedFields.data

    // Check if customer with this email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi ile kayıtlı müşteri zaten mevcut' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        notes,
      },
      include: {
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
        entity: 'CUSTOMER',
        entityId: customer.id,
        meta: {
          customerName: customer.name,
          customerEmail: customer.email,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    const serializedCustomer = {
      ...customer,
      totalSpent: customer.totalSpent.toNumber(),
    }

    return NextResponse.json(serializedCustomer, { status: 201 })
  } catch (error) {
    console.error('Failed to create customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
