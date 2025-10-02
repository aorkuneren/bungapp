"use client"

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { 
  Calendar, 
  Home, 
  Users, 
  BarChart3, 
  Settings,
  Plus,
  Eye,
  Clock,
  TrendingUp
} from 'lucide-react'
import { format, addDays, isAfter, isBefore } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState, useTransition, useEffect } from 'react'

function ReservationCard({ reservation }: { reservation: any }) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'default'
      case 'PENDING': return 'secondary'
      case 'CHECKED_IN': return 'default'
      case 'CHECKED_OUT': return 'outline'
      case 'CANCELLED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Onaylandı'
      case 'PENDING': return 'Beklemede'
      case 'CHECKED_IN': return 'Giriş Yapıldı'
      case 'CHECKED_OUT': return 'Çıkış Yapıldı'
      case 'CANCELLED': return 'İptal'
      default: return status
    }
  }

  return (
    <Link href={`/reservations/${reservation.id}`}>
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">{reservation.customerName}</p>
            <Badge variant={getStatusBadgeVariant(reservation.status)} className="text-xs">
              {getStatusText(reservation.status)}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">{reservation.bungalow.name}</p>
          <p className="text-xs text-gray-400">
            {format(new Date(reservation.checkIn), 'dd MMM yyyy', { locale: tr })} - 
            {format(new Date(reservation.checkOut), 'dd MMM yyyy', { locale: tr })}
          </p>
          <p className="text-xs font-medium text-green-600">₺{Number(reservation.totalAmount).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-xs">Detay</Badge>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true)
        console.log('Dashboard verisi yükleniyor...')
        
        const res = await fetch('/api/dashboard')
        console.log('API response status:', res.status)
        
        if (!res.ok) {
          const errorText = await res.text()
          console.error('API hatası:', res.status, errorText)
          throw new Error(`API çağrısı başarısız: ${res.status}`)
        }
        
        const data = await res.json()
        console.log('Dashboard verisi alındı:', data)
        setDashboardData(data)
      } catch (error) {
        console.error('Dashboard verisi yüklenirken hata:', error)
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboard()
  }, [])

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Dashboard yükleniyor...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (!session) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">Dashboard verisi yüklenemedi</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const { stats, upcomingReservations, todaysReservations, recentReservations } = dashboardData

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Hoş geldiniz, {session.user?.name}</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Rezervasyon</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReservations}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.totalReservationsThisMonth} bu ay
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Rezervasyon</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeReservations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeReservations > 0 ? `${stats.activeReservations} dolu` : 'Boş'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.revenueGrowth >= 0 ? `+${stats.revenueGrowth}% bu ay` : `${stats.revenueGrowth}% bu ay`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doluluk Oranı</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">%{stats.occupancyRate}</div>
              <p className="text-xs text-muted-foreground">
                Bu ay: %{stats.occupancyRateThisMonth}
              </p>
            </CardContent>
          </Card>
        </div>

<div className='grid grid-cols-1 mb-8'>
<Card>
            <CardHeader>
              <CardTitle>Hızlı İşlemler</CardTitle>
              <CardDescription>
                Sık kullanılan işlemlere hızlı erişim
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  gap-4">
                <Button asChild>
                  <Link href="/reservations/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Rezervasyon
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/reservations">
                    <Eye className="mr-2 h-4 w-4" />
                    Rezervasyonları Görüntüle
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/bungalows">
                    <Home className="mr-2 h-4 w-4" />
                    Bungalovları Yönet
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/reports">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Raporları Görüntüle
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
</div>
        {/* Quick Actions and Upcoming Reservations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bugünün rezervasyonları */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Bugünün Rezervasyonları
              </CardTitle>
              <CardDescription>
                Bugün giriş yapacak misafirler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysReservations.length > 0 ? (
                  todaysReservations.map((reservation: any) => (
                    <ReservationCard key={reservation.id} reservation={reservation} />
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Clock className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-sm">Bugün giriş yapacak rezervasyon yok</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Yaklaşan rezervasyonlar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Yaklaşan Rezervasyonlar
              </CardTitle>
              <CardDescription>
                Önümüzdeki 7 gün içindeki girişler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingReservations.length > 0 ? (
                  upcomingReservations.slice(0, 4).map((reservation: any) => (
                    <ReservationCard key={reservation.id} reservation={reservation} />
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Clock className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-sm">Yaklaşan rezervasyon yok</p>
                  </div>
                )}
                {upcomingReservations.length > 4 && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/reservations">
                      Tümünü Görüntüle ({upcomingReservations.length})
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

       
      </div>
    </DashboardLayout>
  )
}
