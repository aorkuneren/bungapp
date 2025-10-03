import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Home } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Fetch real data from database
  const today = new Date()
  const currentMonthStart = startOfMonth(today)
  const currentMonthEnd = endOfMonth(today)
  const lastMonthStart = startOfMonth(subMonths(today, 1))
  const lastMonthEnd = endOfMonth(subMonths(today, 1))

  // Get all reservations
  const allReservations = await prisma.reservation.findMany({
    include: {
      bungalow: {
        select: { name: true }
      }
    }
  })

  // Get current month reservations
  const currentMonthReservations = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= currentMonthStart && createdAt <= currentMonthEnd
  })

  // Get last month reservations
  const lastMonthReservations = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= lastMonthStart && createdAt <= lastMonthEnd
  })

  // Get active reservations
  const activeReservations = allReservations.filter(r => 
    r.status === 'CHECKED_IN'
  )

  // Get bungalows
  const bungalows = await prisma.bungalow.findMany({
    include: {
      _count: {
        select: { reservations: true }
      }
    }
  })

  // Get customers data
  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { reservations: true }
      }
    },
    orderBy: {
      totalSpent: 'desc'
    }
  })

  // Top customers by reservations
  const topCustomersByReservations = customers
    .sort((a, b) => b._count.reservations - a._count.reservations)
    .slice(0, 5)

  // Top customers by spending
  const topCustomersBySpending = customers
    .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))
    .slice(0, 5)

  // Customer status distribution
  const customerStats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'ACTIVE').length,
    banned: customers.filter(c => c.status === 'BANNED').length,
    inactive: customers.filter(c => c.status === 'INACTIVE').length,
  }

  // Calculate stats
  const totalRevenue = allReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  const monthlyRevenue = currentMonthReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  const lastMonthRevenue = lastMonthReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0

  const totalBungalows = bungalows.length
  const activeBungalows = bungalows.filter(b => b.status === 'ACTIVE').length
  const occupiedBungalows = new Set(activeReservations.map(r => r.bungalowId)).size
  const occupancyRate = totalBungalows > 0 ? Math.round((occupiedBungalows / totalBungalows) * 100) : 0

  const averageStay = allReservations.length > 0 ? 
    allReservations.reduce((sum, r) => sum + r.nights, 0) / allReservations.length : 0

  const stats = {
    totalRevenue,
    monthlyRevenue,
    totalReservations: allReservations.length,
    activeReservations: activeReservations.length,
    occupancyRate,
    averageStay: Math.round(averageStay * 10) / 10,
    totalBungalows,
    activeBungalows,
    revenueGrowth
  }

  // Generate revenue data for last 6 months
  const revenueData = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(today, i))
    const monthEnd = endOfMonth(subMonths(today, i))
    const monthReservations = allReservations.filter(r => {
      const createdAt = new Date(r.createdAt)
      return createdAt >= monthStart && createdAt <= monthEnd
    })
    const monthRevenue = monthReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
    
    revenueData.push({
      month: format(monthStart, 'MMM', { locale: tr }),
      revenue: monthRevenue,
      reservations: monthReservations.length
    })
  }

  // Find the maximum revenue for proper scaling
  const maxRevenue = Math.max(...revenueData.map(item => item.revenue))

  // Generate occupancy data by bungalow
  const occupancyData = bungalows.map(bungalow => {
    const bungalowReservations = allReservations.filter(r => r.bungalowId === bungalow.id)
    const bungalowRevenue = bungalowReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
    const bungalowOccupancy = bungalowReservations.length > 0 ? 
      Math.round((bungalowReservations.filter(r => r.status === 'CHECKED_IN').length / bungalowReservations.length) * 100) : 0
    
    return {
      bungalow: bungalow.name,
      occupancy: bungalowOccupancy,
      revenue: bungalowRevenue
    }
  })

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
            <p className="text-gray-600">Gelir, doluluk ve performans analizleri</p>
          </div>
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Rapor İndir
          </Button>
        </div>
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                <Input id="startDate" type="date" />
              </div>
              <div>
                <Label htmlFor="endDate">Bitiş Tarihi</Label>
                <Input id="endDate" type="date" />
              </div>
              <div>
                <Label htmlFor="reportType">Rapor Türü</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Rapor seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Gelir Raporu</SelectItem>
                    <SelectItem value="occupancy">Doluluk Raporu</SelectItem>
                    <SelectItem value="performance">Performans Raporu</SelectItem>
                    <SelectItem value="customers">Müşteri Raporu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Rapor Oluştur
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% bu ay
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aylık Gelir</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% geçen aya göre
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doluluk Oranı</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">%{stats.occupancyRate}</div>
              <p className="text-xs text-muted-foreground">
                Ortalama
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Rezervasyon</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReservations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeReservations} aktif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Aylık Gelir Trendi</CardTitle>
              <CardDescription>
                Son 6 ayın gelir analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.month}</span>
                        <span>₺{item.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${maxRevenue > 0 ? Math.min((item.revenue / maxRevenue) * 100, 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Occupancy Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Bungalov Doluluk Oranları</CardTitle>
              <CardDescription>
                Bungalov bazında doluluk analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {occupancyData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.bungalow}</span>
                      <span>%{item.occupancy}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${item.occupancy}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Gelir: ₺{item.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gelir Raporu</CardTitle>
              <CardDescription>
                Detaylı gelir analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Toplam Gelir</span>
                  <span className="font-bold">₺{stats.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ortalama Rezervasyon</span>
                  <span>₺{Math.round(stats.totalRevenue / stats.totalReservations).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ortalama Kalış</span>
                  <span>{stats.averageStay} gece</span>
                </div>
                <div className="flex justify-between">
                  <span>Günlük Ortalama</span>
                  <span>₺{Math.round(stats.monthlyRevenue / 30).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Doluluk Raporu</CardTitle>
              <CardDescription>
                Doluluk oranı analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Genel Doluluk</span>
                  <span className="font-bold">%{stats.occupancyRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Toplam Bungalov</span>
                  <span>{stats.totalBungalows}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Bungalov</span>
                  <span>{stats.activeBungalows}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dolu Günler</span>
                  <span>{Math.round((stats.occupancyRate / 100) * 30)}/30</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Müşteri İstatistikleri</CardTitle>
              <CardDescription>
                Müşteri dağılımı ve en çok rezervasyon yapan müşteriler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Customer Status Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Müşteri Durumu</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{customerStats.active}</div>
                      <div className="text-sm text-green-600">Aktif</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{customerStats.banned}</div>
                      <div className="text-sm text-red-600">Banlı</div>
                    </div>
                  </div>
                </div>

                {/* Top Customers by Reservations */}
                <div>
                  <h4 className="text-sm font-medium mb-3">En Çok Rezervasyon Yapan Müşteriler</h4>
                  <div className="space-y-2">
                    {topCustomersByReservations.map((customer, index) => (
                      <div key={customer.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{index + 1}. {customer.name}</span>
                          <div className="text-xs text-gray-500">{customer.email}</div>
                        </div>
                        <div className="text-sm font-bold">
                          {customer._count.reservations} rezervasyon
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Customers by Spending */}
                <div>
                  <h4 className="text-sm font-medium mb-3">En Çok Harcama Yapan Müşteriler</h4>
                  <div className="space-y-2">
                    {topCustomersBySpending.map((customer, index) => (
                      <div key={customer.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{index + 1}. {customer.name}</span>
                          <div className="text-xs text-gray-500">{customer.email}</div>
                        </div>
                        <div className="text-sm font-bold">
                          ₺{Number(customer.totalSpent).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performans Raporu</CardTitle>
              <CardDescription>
                Sistem performans metrikleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Toplam Rezervasyon</span>
                  <span className="font-bold">{stats.totalReservations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Rezervasyon</span>
                  <span>{stats.activeReservations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ortalama Kalış</span>
                  <span>{stats.averageStay} gece</span>
                </div>
                <div className="flex justify-between">
                  <span>Rezervasyon/Gece</span>
                  <span>{Math.round(stats.totalReservations / 30)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Toplam Müşteri</span>
                  <span className="font-bold">{customerStats.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
