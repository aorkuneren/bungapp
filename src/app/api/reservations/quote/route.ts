import { NextRequest, NextResponse } from 'next/server'
import { PricingEngine } from '@/lib/pricing/engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bungalowId, checkIn, checkOut, guests, extras } = body

    // Validate required fields
    if (!bungalowId || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check availability
    const isAvailable = await PricingEngine.checkAvailability(
      bungalowId,
      new Date(checkIn),
      new Date(checkOut)
    )

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Seçilen tarihlerde bungalov müsait değil' },
        { status: 400 }
      )
    }

    // Calculate pricing
    const pricing = await PricingEngine.calculatePricing({
      bungalowId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
      extras: extras || [],
    })

    // Convert Decimal to number for JSON response
    const response = {
      breakdown: pricing.breakdown.map(item => ({
        ...item,
        amount: item.amount.toNumber()
      })),
      baseAmount: pricing.baseAmount.toNumber(),
      extrasAmount: pricing.extrasAmount.toNumber(),
      discountAmount: pricing.discountAmount.toNumber(),
      taxAmount: pricing.taxAmount.toNumber(),
      totalAmount: pricing.totalAmount.toNumber(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Pricing calculation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pricing calculation failed' },
      { status: 500 }
    )
  }
}
