import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    console.log('Availability check:', { id, startDate, endDate })

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: 'Başlangıç ve bitiş tarihleri gerekli' },
        { status: 400 }
      )
    }

    // Bungalovun rezervasyonlarını getir
    const reservations = await prisma.reservation.findMany({
      where: {
        bungalowId: id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
        },
        AND: [
          {
            checkIn: {
              lte: new Date(endDate)
            }
          },
          {
            checkOut: {
              gte: new Date(startDate)
            }
          }
        ]
      },
      select: {
        checkIn: true,
        checkOut: true,
        status: true
      }
    })

    // Müsait olmayan günleri hesapla
    const unavailableDates = new Set<string>()
    
    reservations.forEach(reservation => {
      const checkIn = new Date(reservation.checkIn)
      const checkOut = new Date(reservation.checkOut)
      
      // Her rezervasyon için günleri işaretle
      for (let date = new Date(checkIn); date < checkOut; date.setDate(date.getDate() + 1)) {
        unavailableDates.add(date.toISOString().split('T')[0])
      }
    })

    return NextResponse.json({
      unavailableDates: Array.from(unavailableDates)
    })
  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json(
      { message: 'Müsaitlik kontrolü hatası' },
      { status: 500 }
    )
  }
}
