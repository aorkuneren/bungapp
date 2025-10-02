import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'

export interface PricingBreakdown {
  description: string
  amount: Decimal
  type: 'base' | 'rule' | 'extra' | 'discount' | 'tax'
}

export interface PricingResult {
  breakdown: PricingBreakdown[]
  baseAmount: Decimal
  extrasAmount: Decimal
  discountAmount: Decimal
  taxAmount: Decimal
  totalAmount: Decimal
}

export interface QuoteRequest {
  bungalowId: string
  checkIn: Date
  checkOut: Date
  guests: number
  extras?: Array<{ code: string; qty: number }>
}

export class PricingEngine {
  /**
   * Calculate pricing for a reservation
   */
  static async calculatePricing(request: QuoteRequest): Promise<PricingResult> {
    const { bungalowId, checkIn, checkOut, guests, extras = [] } = request
    
    // Get bungalow details
    const bungalow = await prisma.bungalow.findUnique({
      where: { id: bungalowId },
    })
    
    if (!bungalow) {
      throw new Error('Bungalow not found')
    }

    // Calculate nights
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    
    // Get applicable price rules
    const priceRules = await this.getApplicablePriceRules(bungalowId, checkIn, checkOut)
    
    // Calculate base amount
    const baseAmount = new Decimal(bungalow.basePrice).mul(nights)
    
    // Apply price rules
    const { adjustedBaseAmount, breakdown } = await this.applyPriceRules(
      baseAmount,
      priceRules,
      checkIn,
      checkOut,
      guests,
      nights
    )
    
    // Calculate extras
    const { extrasAmount, extrasBreakdown } = await this.calculateExtras(extras)
    
    let taxAmount = new Decimal(0)
    let totalAmount = adjustedBaseAmount.add(extrasAmount)
    let taxBreakdown: any[] = []
    
    // Only add VAT if bungalow price doesn't include VAT
    if (bungalow && !bungalow.priceIncludesVat) {
      // Get VAT rate from system settings or use default 20%
      let vatRate = 20 // Default VAT rate
      
      try {
        const vatSetting = await prisma.systemSetting.findUnique({
          where: { key: 'vatRate' }
        })
        if (vatSetting && vatSetting.value) {
          vatRate = parseFloat(vatSetting.value) || 20
        }
      } catch {
        console.warn('Could not fetch VAT rate from settings, using default 20%')
      }
      
      const taxRate = new Decimal(vatRate).div(100) // Convert percentage to decimal
      const taxableAmount = adjustedBaseAmount.add(extrasAmount)
      taxAmount = taxableAmount.mul(taxRate)
      totalAmount = taxableAmount.add(taxAmount)
      
      taxBreakdown = [{
        description: `KDV (%${vatRate})`,
        amount: taxAmount,
        type: 'tax',
      }]
    }
    
    return {
      breakdown: [
        ...breakdown,
        ...extrasBreakdown,
        ...taxBreakdown,
      ],
      baseAmount: adjustedBaseAmount,
      extrasAmount,
      discountAmount: new Decimal(0), // TODO: Implement discount logic
      taxAmount,
      totalAmount,
    }
  }

  /**
   * Get applicable price rules for a bungalow and date range
   */
  private static async getApplicablePriceRules(
    bungalowId: string,
    checkIn: Date,
    checkOut: Date
  ) {
    return await prisma.priceRule.findMany({
      where: {
        OR: [
          { appliesTo: 'GLOBAL' },
          { appliesTo: 'BUNGALOW', bungalowId },
        ],
        AND: [
          {
            OR: [
              { dateStart: null },
              { dateStart: { lte: checkOut } },
            ],
          },
          {
            OR: [
              { dateEnd: null },
              { dateEnd: { gte: checkIn } },
            ],
          },
        ],
      },
      orderBy: [
        { type: 'asc' }, // MIN_NIGHTS first, then others
        { createdAt: 'asc' },
      ],
    })
  }

  /**
   * Apply price rules to base amount
   */
  private static async applyPriceRules(
    baseAmount: Decimal,
    priceRules: Record<string, any>[],
    checkIn: Date,
    checkOut: Date,
    guests: number,
    nights: number
  ) {
    let adjustedAmount = baseAmount
    const breakdown: PricingBreakdown[] = [
      {
        description: 'Temel fiyat',
        amount: baseAmount,
        type: 'base',
      },
    ]

    for (const rule of priceRules) {
      if (rule.type === 'MIN_NIGHTS') {
        if (nights < rule.amountValue.toNumber()) {
          throw new Error(`Minimum ${rule.amountValue} gece kalınması gerekiyor`)
        }
        continue
      }

      if (rule.type === 'WEEKEND') {
        const isWeekend = this.isWeekend(checkIn, checkOut)
        if (!isWeekend) continue
      }

      if (rule.type === 'HOLIDAY') {
        const isHoliday = await this.isHoliday(checkIn, checkOut)
        if (!isHoliday) continue
      }

      if (rule.type === 'SEASON') {
        const isInSeason = this.isInSeason(checkIn, checkOut, rule.dateStart, rule.dateEnd)
        if (!isInSeason) continue
      }

      if (rule.type === 'PER_PERSON') {
        const extraGuests = Math.max(0, guests - 2) // Assuming 2 is base capacity
        if (extraGuests > 0) {
          const extraAmount = new Decimal(rule.amountValue).mul(extraGuests).mul(nights)
          adjustedAmount = adjustedAmount.add(extraAmount)
          breakdown.push({
            description: `Kişi başı ek ücret (${extraGuests} kişi)`,
            amount: extraAmount,
            type: 'rule',
          })
        }
        continue
      }

      // Apply percentage or fixed adjustments
      let adjustment = new Decimal(0)
      if (rule.amountType === 'PERCENT') {
        adjustment = adjustedAmount.mul(rule.amountValue).div(100)
      } else if (rule.amountType === 'FIXED') {
        adjustment = rule.amountValue
      } else if (rule.amountType === 'NIGHTLY') {
        adjustment = rule.amountValue.mul(nights)
      }

      if (adjustment.gt(0)) {
        adjustedAmount = adjustedAmount.add(adjustment)
        breakdown.push({
          description: rule.name,
          amount: adjustment,
          type: 'rule',
        })
      }
    }

    return { adjustedBaseAmount: adjustedAmount, breakdown }
  }

  /**
   * Calculate extras pricing
   */
  private static async calculateExtras(_extras: Array<{ code: string; qty: number }>) {
    // TODO: Implement extras pricing from database
    const extrasAmount = new Decimal(0)
    const breakdown: PricingBreakdown[] = []

    return { extrasAmount, extrasBreakdown: breakdown }
  }

  /**
   * Check if date range includes weekend
   */
  private static isWeekend(checkIn: Date, checkOut: Date): boolean {
    const current = new Date(checkIn)
    while (current < checkOut) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        return true
      }
      current.setDate(current.getDate() + 1)
    }
    return false
  }

  /**
   * Check if date range includes holiday
   */
  private static async isHoliday(_checkIn: Date, _checkOut: Date): Promise<boolean> {
    // TODO: Implement holiday checking with external API or database
    return false
  }

  /**
   * Check if date range is in season
   */
  private static isInSeason(
    checkIn: Date,
    checkOut: Date,
    seasonStart: Date | null,
    seasonEnd: Date | null
  ): boolean {
    if (!seasonStart || !seasonEnd) return false
    
    return checkIn >= seasonStart && checkOut <= seasonEnd
  }

  /**
   * Check availability for a bungalow and date range
   */
  static async checkAvailability(
    bungalowId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<boolean> {
    const conflictingReservations = await prisma.reservation.findFirst({
      where: {
        bungalowId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        },
        OR: [
          {
            AND: [
              { checkIn: { lt: checkOut } },
              { checkOut: { gt: checkIn } },
            ],
          },
        ],
      },
    })

    return !conflictingReservations
  }
}
