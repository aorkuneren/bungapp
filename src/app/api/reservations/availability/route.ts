import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bungalowId = searchParams.get('bungalowId')

    if (!bungalowId) {
      return NextResponse.json(
        { error: 'Bungalow ID is required' },
        { status: 400 }
      )
    }

    // Get all reservations for this bungalow that block availability
    const reservations = await prisma.reservation.findMany({
      where: {
        bungalowId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
      select: {
        checkIn: true,
        checkOut: true,
      },
    })

    // Convert to blocked dates
    const blockedDates: Date[] = []
    
    reservations.forEach(reservation => {
      const checkIn = new Date(reservation.checkIn)
      const checkOut = new Date(reservation.checkOut)
      
      // Add all dates between checkIn and checkOut (exclusive of checkOut)
      const current = new Date(checkIn)
      while (current < checkOut) {
        blockedDates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    })

    return NextResponse.json({
      blockedDates: blockedDates.map(date => date.toISOString()),
    })
  } catch (error) {
    console.error('Availability check failed:', error)
    return NextResponse.json(
      { error: 'Availability check failed' },
      { status: 500 }
    )
  }
}
