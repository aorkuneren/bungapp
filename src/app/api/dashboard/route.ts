import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  // Cache için headers ekle
  const headers = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  }
  const today = new Date()
  const next7Days = new Date(today)
  next7Days.setDate(today.getDate() + 7)

  // Sadece gerekli alanları seç
  const allReservations = await prisma.reservation.findMany({
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
      totalAmount: true,
      createdAt: true,
      bungalowId: true,
      bungalow: { select: { name: true } }
    }
  })

  const activeReservations = allReservations.filter(r => r.status === 'CHECKED_IN')

  const upcomingReservations = allReservations.filter(r => {
    const checkIn = new Date(r.checkIn)
    return r.status !== 'CHECKED_IN' &&
           checkIn > today &&
           checkIn < next7Days
  })

  const todaysReservations = allReservations.filter(r => {
    const checkIn = new Date(r.checkIn)
    return r.status !== 'CHECKED_IN' &&
           checkIn.getFullYear() === today.getFullYear() &&
           checkIn.getMonth() === today.getMonth() &&
           checkIn.getDate() === today.getDate()
  })

  const recentReservations = allReservations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const totalRevenue = allReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  const totalBungalows = await prisma.bungalow.count()
  const occupiedBungalows = new Set(activeReservations.map(r => r.bungalowId)).size
  const occupancyRate = totalBungalows > 0 ? Math.round((occupiedBungalows / totalBungalows) * 100) : 0

  // Bu ayki rezervasyon ve gelir verileri
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const reservationsThisMonth = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= startOfMonth && createdAt <= endOfMonth
  })
  const totalReservationsThisMonth = reservationsThisMonth.length
  const revenueThisMonth = reservationsThisMonth.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)

  // Geçen ayki gelir
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
  const reservationsLastMonth = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= startOfLastMonth && createdAt <= endOfLastMonth
  })
  const revenueLastMonth = reservationsLastMonth.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  const revenueGrowth = revenueLastMonth > 0 ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) : 0

  const activeReservationsThisMonth = reservationsThisMonth.filter(r => r.status === 'CHECKED_IN')
  const occupiedBungalowsThisMonth = new Set(activeReservationsThisMonth.map(r => r.bungalowId)).size
  const occupancyRateThisMonth = totalBungalows > 0 ? Math.round((occupiedBungalowsThisMonth / totalBungalows) * 100) : 0

  return NextResponse.json({
    stats: {
      totalReservations: allReservations.length,
      activeReservations: activeReservations.length,
      totalRevenue,
      occupancyRate,
      totalReservationsThisMonth,
      revenueGrowth,
      occupancyRateThisMonth
    },
    upcomingReservations,
    todaysReservations,
    recentReservations
  }, { headers })
}

