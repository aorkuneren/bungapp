import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Home, 
  Download, 
  Filter,
  RefreshCw,
  Eye,
  Target,
  Award,
  Clock,
  Star,
  Activity
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear } from 'date-fns'
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

  // Get all reservations with more detailed data
  const allReservations = await prisma.reservation.findMany({
    include: {
      bungalow: {
        select: { 
          name: true, 
          price: true,
          status: true
        }
      },
      customer: {
        select: {
          name: true,
          email: true,
          status: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
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

  // Calculate comprehensive stats
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

  // Additional detailed stats
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'ACTIVE').length
  const averageReservationValue = allReservations.length > 0 ? totalRevenue / allReservations.length : 0
  
  // Revenue by status
  const revenueByStatus = {
    completed: allReservations.filter(r => r.status === 'CHECKED_OUT').reduce((sum, r) => sum + r.totalAmount.toNumber(), 0),
    active: allReservations.filter(r => r.status === 'CHECKED_IN').reduce((sum, r) => sum + r.totalAmount.toNumber(), 0),
    pending: allReservations.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.totalAmount.toNumber(), 0),
    cancelled: allReservations.filter(r => r.status === 'CANCELLED').reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  }

  // Weekly revenue for last 4 weeks
  const weeklyRevenue = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = subDays(today, (i + 1) * 7)
    const weekEnd = subDays(today, i * 7)
    const weekReservations = allReservations.filter(r => {
      const createdAt = new Date(r.createdAt)
      return createdAt >= weekStart && createdAt < weekEnd
    })
    const weekRev = weekReservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
    weeklyRevenue.push({
      week: `Hafta ${4-i}`,
      revenue: weekRev,
      reservations: weekReservations.length
    })
  }

  // Yearly comparison
  const currentYearStart = startOfYear(today)
  const currentYearEnd = endOfYear(today)
  const lastYearStart = startOfYear(subMonths(today, 12))
  const lastYearEnd = endOfYear(subMonths(today, 12))
  
  const currentYearRevenue = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= currentYearStart && createdAt <= currentYearEnd
  }).reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  
  const lastYearRevenue = allReservations.filter(r => {
    const createdAt = new Date(r.createdAt)
    return createdAt >= lastYearStart && createdAt <= lastYearEnd
  }).reduce((sum, r) => sum + r.totalAmount.toNumber(), 0)
  
  const yearlyGrowth = lastYearRevenue > 0 ? Math.round(((currentYearRevenue - lastYearRevenue) / lastYearRevenue) * 100) : 0

  const stats = {
    totalRevenue,
    monthlyRevenue,
    totalReservations: allReservations.length,
    activeReservations: activeReservations.length,
    occupancyRate,
    averageStay: Math.round(averageStay * 10) / 10,
    totalBungalows,
    activeBungalows,
    revenueGrowth,
    totalCustomers,
    activeCustomers,
    averageReservationValue: Math.round(averageReservationValue),
    currentYearRevenue,
    lastYearRevenue,
    yearlyGrowth
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Raporlar & Analizler
            </h1>
            <p className="text-gray-600 mt-1">Kapsamlı işletme performans analizi ve detaylı raporlar</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Excel İndir
            </Button>
            <Button size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Detaylı Görünüm
            </Button>
          </div>
        </div>
        {/* Advanced Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtreler & Seçenekler
            </CardTitle>
            <CardDescription>
              Raporları özelleştirmek için filtreleri kullanın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                <Input id="startDate" type="date" defaultValue={format(subDays(today, 30), 'yyyy-MM-dd')} />
              </div>
              <div>
                <Label htmlFor="endDate">Bitiş Tarihi</Label>
                <Input id="endDate" type="date" defaultValue={format(today, 'yyyy-MM-dd')} />
              </div>
              <div>
                <Label htmlFor="reportType">Rapor Türü</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Rapor seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Raporlar</SelectItem>
                    <SelectItem value="revenue">Gelir Analizi</SelectItem>
                    <SelectItem value="occupancy">Doluluk Analizi</SelectItem>
                    <SelectItem value="customers">Müşteri Analizi</SelectItem>
                    <SelectItem value="performance">Performans Analizi</SelectItem>
                    <SelectItem value="financial">Finansal Rapor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeRange">Zaman Aralığı</Label>
                <Select defaultValue="month">
                  <SelectTrigger>
                    <SelectValue placeholder="Zaman aralığı" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Son 7 Gün</SelectItem>
                    <SelectItem value="month">Son 30 Gün</SelectItem>
                    <SelectItem value="quarter">Son 3 Ay</SelectItem>
                    <SelectItem value="year">Son 1 Yıl</SelectItem>
                    <SelectItem value="custom">Özel Aralık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtreleri Temizle
              </Button>
              <Button size="sm">
                <BarChart3 className="mr-2 h-4 w-4" />
                Rapor Oluştur
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₺{stats.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={stats.yearlyGrowth > 0 ? "default" : "destructive"} className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.yearlyGrowth > 0 ? '+' : ''}{stats.yearlyGrowth}% yıllık
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aylık Gelir</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₺{stats.monthlyRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={revenueGrowth > 0 ? "default" : "destructive"} className="text-xs">
                  {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% geçen aya göre
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doluluk Oranı</CardTitle>
              <div className="p-2 bg-orange-100 rounded-full">
                <Home className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">%{stats.occupancyRate}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={stats.occupancyRate > 70 ? "default" : "secondary"} className="text-xs">
                  {stats.occupiedBungalows}/{stats.totalBungalows} bungalov
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Rezervasyon</CardTitle>
              <div className="p-2 bg-purple-100 rounded-full">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalReservations}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {stats.activeReservations} aktif
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ₺{stats.averageReservationValue.toLocaleString()} ortalama
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Müşteri Sayısı</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCustomers} aktif müşteri
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Kalış</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageStay} gece</div>
              <p className="text-xs text-muted-foreground">
                Rezervasyon başına ortalama
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yıllık Büyüme</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.yearlyGrowth > 0 ? '+' : ''}{stats.yearlyGrowth}%</div>
              <p className="text-xs text-muted-foreground">
                Geçen yıla göre büyüme
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts with Tabs */}
        <Tabs defaultValue="revenue" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue">Gelir Analizi</TabsTrigger>
            <TabsTrigger value="occupancy">Doluluk Analizi</TabsTrigger>
            <TabsTrigger value="customers">Müşteri Analizi</TabsTrigger>
            <TabsTrigger value="performance">Performans</TabsTrigger>
          </TabsList>
          
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Aylık Gelir Trendi
                  </CardTitle>
                  <CardDescription>
                    Son 6 ayın detaylı gelir analizi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.month}</span>
                            <span className="font-bold">₺{item.revenue.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
                              style={{ width: `${maxRevenue > 0 ? Math.min((item.revenue / maxRevenue) * 100, 100) : 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.reservations} rezervasyon
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Haftalık Gelir Trendi
                  </CardTitle>
                  <CardDescription>
                    Son 4 haftanın gelir performansı
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weeklyRevenue.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.week}</span>
                            <span className="font-bold">₺{item.revenue.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max((item.revenue / Math.max(...weeklyRevenue.map(w => w.revenue))) * 100, 5)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.reservations} rezervasyon
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Durum Bazında Gelir Dağılımı
                </CardTitle>
                <CardDescription>
                  Rezervasyon durumlarına göre gelir analizi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₺{revenueByStatus.completed.toLocaleString()}</div>
                    <div className="text-sm text-green-600">Tamamlanan</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">₺{revenueByStatus.active.toLocaleString()}</div>
                    <div className="text-sm text-blue-600">Aktif</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">₺{revenueByStatus.pending.toLocaleString()}</div>
                    <div className="text-sm text-yellow-600">Bekleyen</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">₺{revenueByStatus.cancelled.toLocaleString()}</div>
                    <div className="text-sm text-red-600">İptal</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-orange-600" />
                  Bungalov Doluluk Analizi
                </CardTitle>
                <CardDescription>
                  Bungalov bazında detaylı doluluk oranları ve performans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {occupancyData.map((item, index) => (
                    <div key={index} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.bungalow}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.occupancy > 70 ? "default" : item.occupancy > 40 ? "secondary" : "destructive"}>
                            %{item.occupancy}
                          </Badge>
                          <span className="text-sm text-gray-500">₺{item.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            item.occupancy > 70 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                            item.occupancy > 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-r from-red-500 to-red-600'
                          }`}
                          style={{ width: `${item.occupancy}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Customers by Reservations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    En Çok Rezervasyon Yapan Müşteriler
                  </CardTitle>
                  <CardDescription>
                    Rezervasyon sayısına göre sıralama
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCustomersByReservations.map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {customer._count.reservations} rezervasyon
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers by Spending */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    En Çok Harcama Yapan Müşteriler
                  </CardTitle>
                  <CardDescription>
                    Toplam harcama miktarına göre sıralama
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCustomersBySpending.map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Star className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">₺{Number(customer.totalSpent).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{customer._count.reservations} rezervasyon</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Performans Metrikleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Ortalama Rezervasyon Değeri</span>
                    <span className="font-bold">₺{stats.averageReservationValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ortalama Kalış Süresi</span>
                    <span className="font-bold">{stats.averageStay} gece</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Günlük Ortalama Gelir</span>
                    <span className="font-bold">₺{Math.round(stats.monthlyRevenue / 30).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rezervasyon Başarı Oranı</span>
                    <span className="font-bold">%{Math.round((stats.totalReservations / (stats.totalReservations + allReservations.filter(r => r.status === 'CANCELLED').length)) * 100)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Müşteri Dağılımı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Aktif Müşteriler</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(customerStats.active / customerStats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-bold">{customerStats.active}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Pasif Müşteriler</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ width: `${(customerStats.inactive / customerStats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-bold">{customerStats.inactive}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Banlı Müşteriler</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(customerStats.banned / customerStats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-bold">{customerStats.banned}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Büyüme Analizi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.yearlyGrowth > 0 ? '+' : ''}{stats.yearlyGrowth}%</div>
                    <div className="text-sm text-green-600">Yıllık Büyüme</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{revenueGrowth > 0 ? '+' : ''}{revenueGrowth}%</div>
                    <div className="text-sm text-blue-600">Aylık Büyüme</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">%{stats.occupancyRate}</div>
                    <div className="text-sm text-purple-600">Doluluk Oranı</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Hızlı İşlemler
            </CardTitle>
            <CardDescription>
              Raporları indirin ve paylaşın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                <Download className="h-6 w-6" />
                <span>Excel Raporu</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>PDF Raporu</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                <Eye className="h-6 w-6" />
                <span>Önizleme</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6" />
                <span>Yenile</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
