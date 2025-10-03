import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { PricingEngine } from '@/lib/pricing/engine'
import { Decimal } from '@prisma/client/runtime/library'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('Reschedule API endpoint called')
  
  try {
    const { id } = await params
    console.log('Reschedule API called with id:', id)
    
    const session = await getServerSession(authOptions)
    console.log('Session check:', { hasSession: !!session, hasUser: !!session?.user, hasUserId: !!session?.user?.id })
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { checkIn, checkOut } = body
    
    console.log('Reschedule request body:', { id, checkIn, checkOut })
    
    if (!checkIn || !checkOut) {
      console.log('Missing checkIn or checkOut')
      return NextResponse.json(
        { message: 'Giriş ve çıkış tarihleri gerekli' },
        { status: 400 }
      )
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
      console.log('Invalid date range')
      return NextResponse.json(
        { message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır' },
        { status: 400 }
      )
    }

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { message: 'Giriş ve çıkış tarihleri gerekli' },
        { status: 400 }
      )
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
      return NextResponse.json(
        { message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır' },
        { status: 400 }
      )
    }

    // Rezervasyonu bul
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        bungalow: {
          include: {
            priceRules: true
          }
        }
      },
    })

    if (!existingReservation) {
      return NextResponse.json(
        { message: 'Rezervasyon bulunamadı' },
        { status: 404 }
      )
    }

    // Yeni gece sayısını hesapla
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Fiyat hesaplaması yap
    const pricing = await PricingEngine.calculatePricing({
      bungalowId: existingReservation.bungalowId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: existingReservation.guests,
    })

    // Tutar farkını hesapla
    const priceDifference = pricing.totalAmount.sub(existingReservation.totalAmount)
    const isPriceIncrease = priceDifference.gt(0)
    const isPriceDecrease = priceDifference.lt(0)

    // Yeni kalan ödeme miktarını hesapla
    // Eğer fiyat artışı varsa, mevcut kalan ödemeye ekle
    // Eğer fiyat azalışı varsa, mevcut kalan ödemeyi azalt
    let newRemainingAmount
    const currentRemainingAmount = Number(existingReservation.remainingAmount || 0)
    const priceDiffNumber = Number(priceDifference)
    
    if (isPriceIncrease) {
      // Fiyat artışı: mevcut kalan ödeme + fiyat farkı
      newRemainingAmount = currentRemainingAmount + priceDiffNumber
    } else if (isPriceDecrease) {
      // Fiyat azalışı: mevcut kalan ödeme - fiyat farkı (minimum 0)
      newRemainingAmount = Math.max(0, currentRemainingAmount + priceDiffNumber)
    } else {
      // Fiyat değişmedi: mevcut kalan ödeme aynı kalır
      newRemainingAmount = currentRemainingAmount
    }

    // Rezervasyonu güncelle
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights,
        baseAmount: pricing.baseAmount,
        discountAmount: pricing.discountAmount,
        extrasAmount: pricing.extrasAmount,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        // Yeni kalan ödeme miktarı
        remainingAmount: new Decimal(newRemainingAmount),
        // Eğer kalan ödeme 0 ise ödeme durumunu güncelle
        paymentStatus: newRemainingAmount <= 0 ? 'COMPLETED' : 'PARTIAL',
      },
    })

    // Audit log ekle (geçici olarak session kontrolü olmadan)
    if (session?.user?.id) {
      await prisma.auditLog.create({
        data: {
          action: 'RESCHEDULE',
          entity: 'RESERVATION',
          entityId: id,
          actorUserId: session.user.id,
          meta: {
            oldCheckIn: existingReservation.checkIn.toISOString(),
            oldCheckOut: existingReservation.checkOut.toISOString(),
            newCheckIn: checkIn,
            newCheckOut: checkOut,
            oldTotalAmount: existingReservation.totalAmount,
            newTotalAmount: pricing.totalAmount,
            oldNights: existingReservation.nights,
            newNights: nights,
          },
        },
      })
    }

    return NextResponse.json({
      message: 'Rezervasyon tarihi başarıyla güncellendi',
      reservation: updatedReservation,
      priceDifference: {
        amount: priceDifference,
        isIncrease: isPriceIncrease,
        isDecrease: isPriceDecrease,
        oldTotalAmount: existingReservation.totalAmount,
        newTotalAmount: pricing.totalAmount,
      },
    })
  } catch (error) {
    console.error('Reschedule error:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return NextResponse.json(
      { 
        message: 'Rezervasyon erteleme hatası',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
