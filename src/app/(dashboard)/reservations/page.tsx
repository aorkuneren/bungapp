import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { Plus, Search, Filter, Calendar, User, Home } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Fetch real data from database
  const reservations = await prisma.reservation.findMany({
    include: {
      bungalow: {
        select: { name: true }
      },
      createdByUser: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING': { label: 'Beklemede', variant: 'secondary' as const },
      'CONFIRMED': { label: 'Onaylandı', variant: 'default' as const },
      'CHECKED_IN': { label: 'Giriş Yapıldı', variant: 'default' as const },
      'CHECKED_OUT': { label: 'Çıkış Yapıldı', variant: 'outline' as const },
      'CANCELLED': { label: 'İptal Edildi', variant: 'destructive' as const }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rezervasyon Yönetimi</h1>
            <p className="text-gray-600">Rezervasyonları görüntüle, düzenle ve yönet</p>
          </div>
          <Button asChild>
            <Link href="/reservations/new">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Rezervasyon
            </Link>
          </Button>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Rezervasyon</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beklemede</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reservations.filter(r => r.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onaylandı</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reservations.filter(r => r.status === 'CONFIRMED').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₺{reservations.reduce((sum, r) => sum + r.totalAmount.toNumber(), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Müşteri adı, e-posta veya rezervasyon kodu ile ara..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="PENDING">Beklemede</SelectItem>
                  <SelectItem value="CONFIRMED">Onaylandı</SelectItem>
                  <SelectItem value="CHECKED_IN">Giriş Yapıldı</SelectItem>
                  <SelectItem value="CHECKED_OUT">Çıkış Yapıldı</SelectItem>
                  <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtrele
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rezervasyonlar</CardTitle>
            <CardDescription>
              Tüm rezervasyonları görüntüleyin ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="font-medium">{reservation.customerName}</h3>
                        <span className="text-sm text-gray-500">{reservation.code}</span>
                        {getStatusBadge(reservation.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>{reservation.customerEmail}</span>
                        </div>
                        <div className="flex items-center">
                          <Home className="mr-2 h-4 w-4" />
                          <span>{reservation.bungalow.name}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>
                            {format(new Date(reservation.checkIn), 'dd MMM yyyy', { locale: tr })} - {format(new Date(reservation.checkOut), 'dd MMM yyyy', { locale: tr })}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">₺{reservation.totalAmount.toNumber().toLocaleString()}</div>
                          <div className="text-xs text-gray-500">
                            {reservation.nights} gece, {reservation.guests} kişi
                          </div>
                          {reservation.depositAmount && reservation.depositAmount.toNumber() > 0 && (
                            <div className="text-xs text-green-600">
                              Kapora: ₺{reservation.depositAmount.toNumber().toLocaleString()}
                            </div>
                          )}
                          {reservation.remainingAmount && reservation.remainingAmount.toNumber() > 0 && (
                            <div className="text-xs text-orange-600">
                              Kalan: ₺{reservation.remainingAmount.toNumber().toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/reservations/${reservation.id}`}>
                          Görüntüle
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/reservations/${reservation.id}/edit`}>
                          Düzenle
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {reservations.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz rezervasyon yok</h3>
                <p className="text-gray-500 mb-4">İlk rezervasyonunuzu oluşturmak için aşağıdaki butona tıklayın.</p>
                <Button asChild>
                  <Link href="/reservations/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Rezervasyon Oluştur
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
