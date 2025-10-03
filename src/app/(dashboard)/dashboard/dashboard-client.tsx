'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus,
  Eye,
  Clock,
  TrendingUp as TrendingUpIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { PageLoadingSpinner } from '@/components/loading-spinner'
import { formatCurrencyWithSymbol } from '@/lib/utils/format'

// Status mapping'i component dışına çıkarıp memoize edelim
const STATUS_CONFIG = {
  CONFIRMED: { variant: 'default' as const, text: 'Onaylandı' },
  PENDING: { variant: 'secondary' as const, text: 'Beklemede' },
  CHECKED_IN: { variant: 'default' as const, text: 'Giriş Yapıldı' },
  CHECKED_OUT: { variant: 'outline' as const, text: 'Çıkış Yapıldı' },
  CANCELLED: { variant: 'destructive' as const, text: 'İptal' },
} as const

function ReservationCard({ reservation }: { reservation: any }) {
  const statusConfig = useMemo(() => 
    STATUS_CONFIG[reservation.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING,
    [reservation.status]
  )

  return (
    <Link href={`/reservations/${reservation.id}`}>
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">{reservation.customerName}</p>
            <Badge variant={statusConfig.variant} className="text-xs">
              {statusConfig.text}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">{reservation.bungalow.name}</p>
          <p className="text-xs text-gray-400">
            {format(new Date(reservation.checkIn), 'dd MMM yyyy')} - 
            {format(new Date(reservation.checkOut), 'dd MMM yyyy')}
          </p>
          <p className="text-xs font-medium text-green-600">{formatCurrencyWithSymbol(reservation.totalAmount)}</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-xs">Detay</Badge>
        </div>
      </div>
    </Link>
  )
}

interface DashboardClientProps {
  initialData: any
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<any>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!res.ok) {
        throw new Error(`API çağrısı başarısız: ${res.status}`)
      }
      
      const data = await res.json()
      setDashboardData(data)
    } catch (error) {
      console.error('Dashboard verisi yüklenirken hata:', error)
      setError(error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoize edilmiş rezervasyon listeleri
  const { stats, upcomingReservations, todaysReservations, recentReservations } = useMemo(() => {
    if (!dashboardData) return { stats: null, upcomingReservations: [], todaysReservations: [], recentReservations: [] }
    return dashboardData
  }, [dashboardData])

  // Memoize edilmiş rezervasyon kartları
  const todaysReservationCards = useMemo(() => 
    todaysReservations.map((reservation: any) => (
      <ReservationCard key={reservation.id} reservation={reservation} />
    )),
    [todaysReservations]
  )

  const upcomingReservationCards = useMemo(() => 
    upcomingReservations.slice(0, 4).map((reservation: any) => (
      <ReservationCard key={reservation.id} reservation={reservation} />
    )),
    [upcomingReservations]
  )

  if (loading) {
    return <PageLoadingSpinner />
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error || 'Dashboard verisi yüklenemedi'}
          </p>
          <button 
            onClick={fetchDashboard} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Rezervasyon yönetim sisteminize hoş geldiniz
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Rezervasyon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReservations}</div>
            <p className="text-xs text-muted-foreground">
              Bu ay: +{stats.totalReservationsThisMonth}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Rezervasyonlar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeReservations}</div>
            <p className="text-xs text-muted-foreground">
              Şu anda konaklayan misafirler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyWithSymbol(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}% geçen aya göre
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doluluk Oranı</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">
              Bu ay: {stats.occupancyRateThisMonth}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni Rezervasyon
            </CardTitle>
            <CardDescription>
              Yeni bir rezervasyon oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reservations/new">
              <Button className="w-full">Rezervasyon Oluştur</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Tüm Rezervasyonlar
            </CardTitle>
            <CardDescription>
              Mevcut rezervasyonları görüntüleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reservations">
              <Button variant="outline" className="w-full">Rezervasyonları Görüntüle</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Raporlar
            </CardTitle>
            <CardDescription>
              Detaylı raporları inceleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports">
              <Button variant="outline" className="w-full">Raporları Görüntüle</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Reservations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Reservations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Bugünün Rezervasyonları
            </CardTitle>
            <CardDescription>
              Bugün giriş yapacak misafirler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysReservations.length > 0 ? (
                todaysReservationCards
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-sm">Bugün giriş yapacak rezervasyon yok</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Reservations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Yaklaşan Rezervasyonlar
            </CardTitle>
            <CardDescription>
              Önümüzdeki 7 gün içindeki girişler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReservations.length > 0 ? (
                upcomingReservationCards
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-sm">Yaklaşan rezervasyon yok</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
