import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Fetch real data from database
  const today = new Date()
  const next7Days = addDays(today, 7)
  const next30Days = addDays(today, 30)

  // Get all reservations
  const allReservations = await prisma.reservation.findMany({
    include: {
      bungalow: {
        select: { name: true }
      }
    }
  })

  // Get active reservations (current guests)
  const activeReservations = allReservations.filter((r: any) => 
    r.status === 'CHECKED_IN'
  )

  // Get upcoming reservations (next 7 days)
  const upcomingReservations = allReservations.filter((r: any) => {
    const checkIn = new Date(r.checkIn)
    return r.status === 'CONFIRMED' && 
           isAfter(checkIn, today) && 
           isBefore(checkIn, next7Days)
  }).sort((a: any, b: any) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())

  // Get recent reservations (last 5)
  const recentReservations = allReservations
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Calculate stats
  const totalRevenue = allReservations.reduce((sum: number, r: any) => sum + r.totalAmount.toNumber(), 0)
  const totalBungalows = await prisma.bungalow.count()
  const occupiedBungalows = new Set(activeReservations.map((r: any) => r.bungalowId)).size
  const occupancyRate = totalBungalows > 0 ? Math.round((occupiedBungalows / totalBungalows) * 100) : 0

  const stats = {
    totalReservations: allReservations.length,
    activeReservations: activeReservations.length,
    totalRevenue,
    occupancyRate
  }

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
                +2 bu ay
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
                Şu anda dolu
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
                +12% bu ay
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
                Ortalama
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
                  upcomingReservations.slice(0, 4).map((reservation: any) => {
                    const checkInDate = new Date(reservation.checkIn)
                    const daysUntil = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    
                    return (
                      <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{reservation.customerName}</p>
                          <p className="text-xs text-gray-500">{reservation.bungalow.name}</p>
                          <p className="text-xs text-gray-400">
                            {format(checkInDate, 'dd MMM yyyy', { locale: tr })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={daysUntil <= 1 ? "destructive" : daysUntil <= 3 ? "default" : "secondary"}>
                            {daysUntil === 0 ? 'Bugün' : 
                             daysUntil === 1 ? 'Yarın' : 
                             `${daysUntil} gün`}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Son Rezervasyonlar
              </CardTitle>
              <CardDescription>
                En son oluşturulan rezervasyonlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentReservations.map((reservation: any) => (
                  <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{reservation.customerName}</p>
                      <p className="text-xs text-gray-500">{reservation.bungalow.name}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(reservation.checkIn), 'dd MMM', { locale: tr })} - {format(new Date(reservation.checkOut), 'dd MMM', { locale: tr })}
                      </p>
                    </div>
                    <Badge variant={
                      reservation.status === 'CONFIRMED' ? 'default' :
                      reservation.status === 'PENDING' ? 'secondary' :
                      reservation.status === 'CHECKED_IN' ? 'destructive' :
                      'outline'
                    }>
                      {reservation.status === 'CONFIRMED' ? 'Onaylandı' : 
                       reservation.status === 'PENDING' ? 'Beklemede' :
                       reservation.status === 'CHECKED_IN' ? 'Giriş Yapıldı' :
                       reservation.status === 'CHECKED_OUT' ? 'Çıkış Yapıldı' :
                       reservation.status === 'CANCELLED' ? 'İptal' : reservation.status}
                    </Badge>
                  </div>
                ))}
                {recentReservations.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Calendar className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-sm">Henüz rezervasyon yok</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

       
      </div>
    </DashboardLayout>
  )
}
