import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const priceRules = await prisma.priceRule.findMany({
      orderBy: [
        { type: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(priceRules)
  } catch (error) {
    console.error('Failed to fetch price rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price rules' },
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
    const { name, type, amountType, amountValue, appliesTo, bungalowId, dateStart, dateEnd, weekdayMask } = body

    // Validation
    if (!name || !type || !amountType || amountValue === undefined || !appliesTo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const priceRule = await prisma.priceRule.create({
      data: {
        name,
        type,
        amountType,
        amountValue,
        appliesTo,
        bungalowId: appliesTo === 'BUNGALOW' ? bungalowId : null,
        dateStart: dateStart ? new Date(dateStart) : null,
        dateEnd: dateEnd ? new Date(dateEnd) : null,
        weekdayMask: weekdayMask || null,
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'CREATE',
        entity: 'PRICERULE',
        entityId: priceRule.id,
        meta: {
          createdPriceRule: priceRule,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json(priceRule)
  } catch (error) {
    console.error('Failed to create price rule:', error)
    return NextResponse.json(
      { error: 'Failed to create price rule' },
      { status: 500 }
    )
  }
}
