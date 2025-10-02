'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  TrendingUp,
  Ban,
  Edit,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Reservation {
  id: string
  code: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  totalAmount: number
  status: string
  paymentStatus: string
  bungalow: {
    name: string
    slug: string
  }
  createdAt: string
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  notes?: string
  status: 'ACTIVE' | 'BANNED' | 'INACTIVE'
  totalSpent: number
  createdAt: string
  updatedAt: string
  reservations: Reservation[]
  _count: {
    reservations: number
  }
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const resolvedParams = use(params)
  const customerId = resolvedParams.id

  const fetchCustomer = async () => {
    if (!customerId) return
    
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data)
      } else if (response.status === 404) {
        toast.error('Müşteri bulunamadı')
        router.push('/customers')
      } else {
        toast.error('Müşteri bilgileri yüklenemedi')
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error)
      toast.error('Müşteri bilgileri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  const handleStatusUpdate = async (newStatus: 'ACTIVE' | 'BANNED' | 'INACTIVE') => {
    if (!customer) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedCustomer = await response.json()
        setCustomer(updatedCustomer)
        toast.success('Müşteri durumu güncellendi')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Durum güncellenemedi')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Durum güncellenirken hata oluştu')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
      case 'BANNED':
        return <Badge variant="destructive">Banlı</Badge>
      case 'INACTIVE':
        return <Badge variant="secondary">Pasif</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getReservationStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Beklemede</Badge>
      case 'CONFIRMED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Onaylandı</Badge>
      case 'CHECKED_IN':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Giriş Yapıldı</Badge>
      case 'CHECKED_OUT':
        return <Badge variant="default" className="bg-gray-100 text-gray-800"><CheckCircle className="w-3 h-3 mr-1" />Çıkış Yapıldı</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />İptal</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Tamamlandı</Badge>
      case 'PARTIAL':
        return <Badge variant="outline" className="text-yellow-600">Kısmi</Badge>
      case 'NONE':
        return <Badge variant="destructive">Ödenmedi</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Müşteri bilgileri yükleniyor...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Müşteri bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aradığınız müşteri mevcut değil veya silinmiş olabilir.
            </p>
            <Button
              onClick={() => router.push('/customers')}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Müşterilere Dön
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/customers')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Geri
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-gray-600 mt-1">Müşteri Detayları</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {customer.status !== 'BANNED' && (
                <Button
                  variant="destructive"
                  onClick={() => handleStatusUpdate('BANNED')}
                  disabled={isUpdating}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {isUpdating ? 'Güncelleniyor...' : 'Banla'}
                </Button>
              )}
              
              {customer.status === 'BANNED' && (
                <Button
                  variant="default"
                  onClick={() => handleStatusUpdate('ACTIVE')}
                  disabled={isUpdating}
                >
                  <User className="mr-2 h-4 w-4" />
                  {isUpdating ? 'Güncelleniyor...' : 'Aktif Yap'}
                </Button>
              )}
              
              <Button
                onClick={() => router.push(`/customers/${customerId}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </Button>
            </div>
          </div>

          {/* Customer Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Müşteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Durum</span>
                    {getStatusBadge(customer.status)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.address && (
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                      <span>{customer.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    Kayıt: {format(new Date(customer.createdAt), 'dd MMM yyyy', { locale: tr })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  İstatistikler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ₺{customer.totalSpent.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500">Toplam Harcama</p>
                </div>
                
                <div>
                  <div className="text-2xl font-bold">
                    {customer._count.reservations}
                  </div>
                  <p className="text-sm text-gray-500">Toplam Rezervasyon</p>
                </div>
                
                {customer._count.reservations > 0 && (
                  <div>
                    <div className="text-lg font-semibold">
                      ₺{Math.round(customer.totalSpent / customer._count.reservations).toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-500">Ortalama Rezervasyon Tutarı</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Notlar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {customer.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Reservations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Rezervasyon Geçmişi
              </CardTitle>
              <CardDescription>
                Son rezervasyonlar (en yeni 10 tanesi)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.reservations && customer.reservations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rezervasyon</TableHead>
                      <TableHead>Bungalov</TableHead>
                      <TableHead>Tarihler</TableHead>
                      <TableHead>Misafir</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Ödeme</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div className="font-medium">{reservation.code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{reservation.bungalow.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(reservation.checkIn), 'dd MMM', { locale: tr })}</div>
                            <div className="text-gray-500">
                              {format(new Date(reservation.checkOut), 'dd MMM yyyy', { locale: tr })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {reservation.nights} gece
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{reservation.guests} kişi</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">₺{reservation.totalAmount.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          {getReservationStatusBadge(reservation.status)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(reservation.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {format(new Date(reservation.createdAt), 'dd MMM yyyy', { locale: tr })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Rezervasyon bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Bu müşterinin henüz rezervasyonu bulunmuyor.
                  </p>
                  <Button
                    onClick={() => router.push('/reservations/new')}
                    className="mt-4"
                  >
                    Yeni Rezervasyon Oluştur
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
