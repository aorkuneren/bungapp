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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const priceRule = await prisma.priceRule.findUnique({
      where: { id }
    })

    if (!priceRule) {
      return NextResponse.json(
        { error: 'Price rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(priceRule)
  } catch (error) {
    console.error('Failed to fetch price rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price rule' },
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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existingRule = await prisma.priceRule.findUnique({
      where: { id }
    })

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Price rule not found' },
        { status: 404 }
      )
    }

    const updatedRule = await prisma.priceRule.update({
      where: { id },
      data: {
        name: body.name || existingRule.name,
        type: body.type || existingRule.type,
        amountType: body.amountType || existingRule.amountType,
        amountValue: body.amountValue !== undefined ? body.amountValue : existingRule.amountValue,
        appliesTo: body.appliesTo || existingRule.appliesTo,
        bungalowId: body.appliesTo === 'BUNGALOW' ? body.bungalowId : null,
        dateStart: body.dateStart ? new Date(body.dateStart) : body.dateStart === null ? null : existingRule.dateStart,
        dateEnd: body.dateEnd ? new Date(body.dateEnd) : body.dateEnd === null ? null : existingRule.dateEnd,
        weekdayMask: body.weekdayMask !== undefined ? body.weekdayMask : existingRule.weekdayMask,
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE',
        entity: 'PRICERULE',
        entityId: id,
        meta: {
          oldPriceRule: existingRule,
          newPriceRule: updatedRule,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json(updatedRule)
  } catch (error) {
    console.error('Failed to update price rule:', error)
    return NextResponse.json(
      { error: 'Failed to update price rule' },
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

    const existingRule = await prisma.priceRule.findUnique({
      where: { id }
    })

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Price rule not found' },
        { status: 404 }
      )
    }

    await prisma.priceRule.delete({
      where: { id }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        entity: 'PRICERULE',
        entityId: id,
        meta: {
          deletedPriceRule: existingRule,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json({ message: 'Price rule deleted successfully' })
  } catch (error) {
    console.error('Failed to delete price rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete price rule' },
      { status: 500 }
    )
  }
}
