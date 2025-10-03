import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import DashboardClient from './dashboard-client'
import { prisma } from '@/lib/db'

async function getDashboardData() {
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
      customerName: true,
      bungalow: { select: { name: true } }
    }
  })

  const activeReservations = allReservations.filter(r => r.status === 'CHECKED_IN')

  const upcomingReservations = allReservations.filter(r => {
    const checkIn = new Date(r.checkIn)
    return checkIn >= today && checkIn <= next7Days
  }).map(r => ({
    ...r,
    totalAmount: r.totalAmount.toString()
  }))

  const todaysReservations = allReservations.filter(r => {
    const checkIn = new Date(r.checkIn)
    return checkIn.toDateString() === today.toDateString()
  }).map(r => ({
    ...r,
    totalAmount: r.totalAmount.toString()
  }))

  const recentReservations = allReservations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(r => ({
      ...r,
      totalAmount: r.totalAmount.toString()
    }))

  // Stats hesaplamaları
  const totalRevenue = allReservations.reduce((sum, r) => sum + Number(r.totalAmount), 0)
  
  const totalBungalows = await prisma.bungalow.count()
  const occupiedBungalows = new Set(activeReservations.map(r => r.bungalowId)).size
  const occupancyRate = totalBungalows > 0 ? Math.round((occupiedBungalows / totalBungalows) * 100) : 0

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const reservationsThisMonth = allReservations.filter(r => 
    new Date(r.createdAt) >= thisMonth
  )
  const totalReservationsThisMonth = reservationsThisMonth.length

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const reservationsLastMonth = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= lastMonth && createdAt < thisMonth
  })
  const revenueGrowth = reservationsLastMonth.length > 0 
    ? Math.round(((totalReservationsThisMonth - reservationsLastMonth.length) / reservationsLastMonth.length) * 100)
    : 0

  const activeReservationsThisMonth = reservationsThisMonth.filter(r => r.status === 'CHECKED_IN')
  const occupiedBungalowsThisMonth = new Set(activeReservationsThisMonth.map(r => r.bungalowId)).size
  const occupancyRateThisMonth = totalBungalows > 0 ? Math.round((occupiedBungalowsThisMonth / totalBungalows) * 100) : 0

  return {
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
  }
}

export default async function DashboardPage() {
  // Geçici olarak authentication kontrolünü devre dışı bırakıyoruz
  // const session = await getServerSession(authOptions)
  
  // if (!session) {
  //   return (
  //     <DashboardLayout>
  //       <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
  //         <div className="flex items-center justify-center h-64">
  //           <div className="text-center">
  //             <p className="text-red-600 mb-4">Oturum açmanız gerekiyor</p>
  //             <a 
  //               href="/auth/login"
  //               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
  //             >
  //               Giriş Yap
  //             </a>
  //           </div>
  //         </div>
  //       </div>
  //     </DashboardLayout>
  //   )
  // }

  const dashboardData = await getDashboardData()

  return (
    <DashboardLayout>
      <DashboardClient initialData={dashboardData} />
    </DashboardLayout>
  )
}