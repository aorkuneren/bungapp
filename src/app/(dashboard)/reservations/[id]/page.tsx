'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, Calendar, User, Phone, Mail, Home, CreditCard, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

interface Reservation {
  id: string
  code: string
  bungalow: {
    id: string
    name: string
    slug: string
    priceIncludesVat: boolean
  }
  customerName: string
  customerEmail: string
  customerPhone: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  baseAmount: number
  discountAmount: number
  extrasAmount: number
  taxAmount: number
  totalAmount: number
  status: string
  paymentStatus?: string
  notes?: string
  createdAt: string
  createdByUser: {
    name: string
    email: string
  }
  isManualPrice?: boolean
  depositAmount?: number
  remainingAmount?: number
}

export default function ReservationDetailPage() {
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [newCheckIn, setNewCheckIn] = useState('')
  const [newCheckOut, setNewCheckOut] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const params = useParams()
  const router = useRouter()

  const reservationId = params.id as string

  useEffect(() => {
    if (reservationId) {
      fetchReservation()
    }
  }, [reservationId])

  const fetchReservation = async () => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`)
      if (response.ok) {
        const data = await response.json()
        setReservation(data)
      } else {
        toast.error('Rezervasyon bulunamadı')
        router.push('/reservations')
      }
    } catch (error) {
      console.error('Failed to fetch reservation:', error)
      toast.error('Rezervasyon yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/reservations/${reservationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success('Rezervasyon durumu güncellendi')
        fetchReservation()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Durum güncellenemedi')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Durum güncelleme hatası')
    } finally {
      setIsUpdating(false)
    }
  }

  const markPaymentReceived = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/reservations/${reservationId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus: 'COMPLETED' }),
      })

      if (response.ok) {
        toast.success('Kalan ödeme alındı olarak işaretlendi')
        fetchReservation()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ödeme durumu güncellenemedi')
      }
    } catch (error) {
      console.error('Failed to update payment status:', error)
      toast.error('Ödeme durumu güncelleme hatası')
    } finally {
      setIsUpdating(false)
    }
  }

  const openRescheduleDialog = async () => {
    if (reservation) {
      setNewCheckIn(reservation.checkIn)
      setNewCheckOut(reservation.checkOut)
      setShowRescheduleDialog(true)
      
      // Müsaitlik kontrolü yap
      await fetchAvailability()
    }
  }

  const fetchAvailability = async () => {
    if (!reservation || !reservation.bungalow?.id) {
      console.error('Reservation or bungalow ID not found:', { reservation })
      return
    }
    
    setIsLoadingAvailability(true)
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 6) // 6 ay sonrasına kadar kontrol et
      
      const url = `/api/bungalows/${reservation.bungalow.id}/availability?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`
      console.log('Fetching availability from:', url)
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Availability data:', data)
        setUnavailableDates(data.unavailableDates || [])
      } else {
        const errorData = await response.json()
        console.error('Availability API error:', errorData)
        toast.error('Müsaitlik kontrolü yapılamadı')
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      toast.error('Müsaitlik kontrolü hatası')
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  const handleReschedule = async () => {
    if (!newCheckIn || !newCheckOut) {
      toast.error('Lütfen yeni giriş ve çıkış tarihlerini seçin')
      return
    }

    if (new Date(newCheckIn) >= new Date(newCheckOut)) {
      toast.error('Çıkış tarihi giriş tarihinden sonra olmalıdır')
      return
    }

    setIsRescheduling(true)
    try {
      console.log('Rescheduling reservation:', { reservationId, newCheckIn, newCheckOut })
      
      const url = `/api/reservations/${reservationId}/reschedule`
      console.log('API URL:', url)
      
      const requestBody = {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
      }
      console.log('Request body:', requestBody)
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      console.log('API Response status:', response.status)
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log('Reschedule success:', data)
        
        // Tutar farkı varsa kullanıcıya bildir
        if (data.priceDifference) {
          const { amount, isIncrease, isDecrease, oldTotalAmount, newTotalAmount } = data.priceDifference
          const formattedAmount = Number(amount).toLocaleString('tr-TR')
          const formattedOldAmount = Number(oldTotalAmount).toLocaleString('tr-TR')
          const formattedNewAmount = Number(newTotalAmount).toLocaleString('tr-TR')
          
          // Önceden alınmış tutarı hesapla
          const depositAmount = Number(data.reservation.depositAmount || 0)
          const formattedDepositAmount = depositAmount.toLocaleString('tr-TR')
          
          if (isIncrease) {
            toast.success(`Rezervasyon tarihi güncellendi. Tutar artışı: +₺${formattedAmount} (₺${formattedOldAmount} → ₺${formattedNewAmount}) | Önceden alınan: ₺${formattedDepositAmount}`)
          } else if (isDecrease) {
            toast.success(`Rezervasyon tarihi güncellendi. Tutar azalışı: -₺${Math.abs(Number(amount)).toLocaleString('tr-TR')} (₺${formattedOldAmount} → ₺${formattedNewAmount}) | Önceden alınan: ₺${formattedDepositAmount}`)
          } else {
            toast.success(`Rezervasyon tarihi güncellendi. Tutar değişmedi. | Önceden alınan: ₺${formattedDepositAmount}`)
          }
        } else {
          toast.success('Rezervasyon tarihi başarıyla güncellendi')
        }
        
        setShowRescheduleDialog(false)
        fetchReservation()
      } else {
        const errorText = await response.text()
        console.error('Reschedule API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          url: url
        })
        
        let errorMessage = 'Rezervasyon tarihi güncellenemedi'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
          console.error('Parsed error data:', errorData)
        } catch (e) {
          console.error('Failed to parse error response:', e)
          console.error('Raw error text:', errorText)
        }
        
        console.error('Final error message:', errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Failed to reschedule reservation:', error)
      toast.error('Rezervasyon erteleme hatası')
    } finally {
      setIsRescheduling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Beklemede', variant: 'secondary' as const },
      CONFIRMED: { label: 'Onaylandı', variant: 'default' as const },
      CHECKED_IN: { label: 'Giriş Yapıldı', variant: 'default' as const },
      CHECKED_OUT: { label: 'Çıkış Yapıldı', variant: 'outline' as const },
      CANCELLED: { label: 'İptal Edildi', variant: 'destructive' as const },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusConfig = {
      NONE: { label: 'Ödeme Yok', variant: 'destructive' as const },
      PARTIAL: { label: 'Kısmi Ödeme', variant: 'secondary' as const },
      COMPLETED: { label: 'Ödeme Tamamlandı', variant: 'default' as const },
    }
    
    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.PARTIAL
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStatusActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':
        return [
          { label: 'Onayla', status: 'CONFIRMED', variant: 'default' as const },
          { label: 'İptal Et', status: 'CANCELLED', variant: 'destructive' as const },
        ]
      case 'CONFIRMED':
        return [
          { label: 'Giriş Yap', status: 'CHECKED_IN', variant: 'default' as const },
          { label: 'İptal Et', status: 'CANCELLED', variant: 'destructive' as const },
        ]
      case 'CHECKED_IN':
        return [
          { label: 'Çıkış Yap', status: 'CHECKED_OUT', variant: 'outline' as const },
        ]
      default:
        return []
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Rezervasyon yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!reservation) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Rezervasyon Bulunamadı</h1>
            <p className="text-gray-600 mb-6">Aradığınız rezervasyon mevcut değil.</p>
            <Button asChild>
              <Link href="/reservations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Rezervasyonlara Dön
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/reservations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Rezervasyon Detayı</h1>
            <p className="text-gray-600">Rezervasyon kodu: {reservation.code}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(reservation.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reservation Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Rezervasyon Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bungalov</label>
                    <p className="text-lg font-semibold">{reservation.bungalow.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Rezervasyon Kodu</label>
                    <p className="text-lg font-mono">{reservation.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Giriş Tarihi</label>
                    <p className="text-lg">
                      {format(new Date(reservation.checkIn), 'dd MMMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Çıkış Tarihi</label>
                    <p className="text-lg">
                      {format(new Date(reservation.checkOut), 'dd MMMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Gece Sayısı</label>
                    <p className="text-lg">{reservation.nights} gece</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Misafir Sayısı</label>
                    <p className="text-lg">{reservation.guests} kişi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Müşteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{reservation.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-600">{reservation.customerEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-600">{reservation.customerPhone}</p>
                    </div>
                  </div>
                  {reservation.notes && (
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Notlar</p>
                        <p className="text-gray-600">{reservation.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Actions */}
            {getStatusActions(reservation.status).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Durum İşlemleri</CardTitle>
                  <CardDescription>
                    Rezervasyon durumunu güncelleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {getStatusActions(reservation.status).map((action) => (
                      <Button
                        key={action.status}
                        variant={action.variant}
                        onClick={() => updateStatus(action.status)}
                        disabled={isUpdating}
                      >
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      onClick={openRescheduleDialog}
                      variant="outline"
                      className="flex items-center"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Rezervasyonu Ertle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Fiyat ve Ödeme Detayları
                </CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  {reservation.isManualPrice && (
                    <Badge variant="outline" className="text-xs">Manuel Fiyat</Badge>
                  )}
                  {reservation.paymentStatus && getPaymentStatusBadge(reservation.paymentStatus)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {!reservation.isManualPrice && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>
                          Temel fiyat ({reservation.nights} gece)
                          {reservation.bungalow.priceIncludesVat && (
                            <span className="text-xs text-gray-500 ml-1">(KDV Dahil)</span>
                          )}
                        </span>
                        <span>₺{reservation.baseAmount.toLocaleString()}</span>
                      </div>
                      {reservation.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>İndirim</span>
                          <span>-₺{reservation.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {reservation.extrasAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Ek hizmetler</span>
                          <span>₺{reservation.extrasAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {reservation.taxAmount > 0 && !reservation.bungalow.priceIncludesVat && (
                        <div className="flex justify-between text-sm">
                          <span>KDV</span>
                          <span>₺{reservation.taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Toplam, Alınan ve Kalan Ödeme */}
                  <div className={`space-y-2 ${!reservation.isManualPrice ? 'border-t pt-3' : ''}`}>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Toplam Tutar</span>
                      <span>₺{reservation.totalAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Alınan Kapora</span>
                      <span>₺{(reservation.depositAmount || 0).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between font-semibold text-orange-600 border-t pt-2">
                      <span>Kalan Ödeme</span>
                      <span>₺{(reservation.remainingAmount || 0).toLocaleString()}</span>
                    </div>
                    
                    {/* Kalan Ödeme Alındı Butonu */}
                    {(reservation.remainingAmount ?? 0) > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <Button
                          onClick={markPaymentReceived}
                          disabled={isUpdating}
                          size="sm"
                          className="w-full"
                        >
                          {isUpdating ? 'Güncelleniyor...' : 'Kalan Ödeme Alındı'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Bu butona tıklayarak kalan ödemenin alındığını onaylayın
                        </p>
                      </div>
                    )}
                    
                    {reservation.remainingAmount === 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-800">
                              Ödeme Tamamlandı
                            </span>
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            Tüm ödemeler alınmıştır
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reservation Info */}
            <Card>
              <CardHeader>
                <CardTitle>Rezervasyon Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Oluşturulma:</span>
                    <p className="font-medium">
                      {format(new Date(reservation.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Oluşturan:</span>
                    <p className="font-medium">{reservation.createdByUser.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rezervasyon Ertleme Modal */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Rezervasyonu Ertle
            </DialogTitle>
            <DialogDescription>
              Müsait günleri seçerek rezervasyon tarihlerini güncelleyin. Kırmızı günler müsait değildir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingAvailability ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Müsaitlik kontrol ediliyor...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Seçilen Tarihler:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Giriş Tarihi</label>
                      <p className="text-lg font-semibold text-blue-600">
                        {newCheckIn ? format(new Date(newCheckIn), 'dd MMMM yyyy', { locale: tr }) : 'Seçilmedi'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Çıkış Tarihi</label>
                      <p className="text-lg font-semibold text-blue-600">
                        {newCheckOut ? format(new Date(newCheckOut), 'dd MMMM yyyy', { locale: tr }) : 'Seçilmedi'}
                      </p>
                    </div>
                  </div>
                  {newCheckIn && newCheckOut && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Yeni süre:</strong> {Math.ceil((new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24))} gece
                      </p>
                    </div>
                  )}
                  
                  {/* Mevcut rezervasyon bilgileri */}
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Mevcut Rezervasyon Bilgileri:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Mevcut Süre:</span>
                        <span className="ml-2 font-medium">{reservation.nights} gece</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Mevcut Tutar:</span>
                        <span className="ml-2 font-medium">₺{Number(reservation.totalAmount).toLocaleString('tr-TR')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Önceden Alınan:</span>
                        <span className="ml-2 font-medium">₺{Number(reservation.depositAmount || 0).toLocaleString('tr-TR')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Kalan Ödeme:</span>
                        <span className="ml-2 font-medium">₺{Number(reservation.remainingAmount || 0).toLocaleString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Müsait Günleri Seçin:</h4>
                  <div className="min-h-[400px]">
                    <FullCalendar
                      plugins={[dayGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      selectable={true}
                      selectMirror={true}
                      dayMaxEvents={true}
                      weekends={true}
                      locale="tr"
                      height="auto"
                      select={(selectInfo) => {
                        const start = selectInfo.start
                        const end = selectInfo.end
                        
                        // Müsaitlik kontrolü
                        const isUnavailable = unavailableDates.some(date => {
                          const checkDate = new Date(date)
                          return checkDate >= start && checkDate < end
                        })
                        
                        if (isUnavailable) {
                          toast.error('Seçilen tarih aralığında müsait olmayan günler var')
                          return
                        }
                        
                        setNewCheckIn(start.toISOString().split('T')[0])
                        setNewCheckOut(end.toISOString().split('T')[0])
                      }}
                      dayCellClassNames={(dateInfo) => {
                        const dateStr = dateInfo.date.toISOString().split('T')[0]
                        const isUnavailable = unavailableDates.includes(dateStr)
                        const isPast = dateInfo.date < new Date()
                        
                        if (isPast) return 'bg-gray-100 text-gray-400'
                        if (isUnavailable) return 'bg-red-100 text-red-600'
                        return 'hover:bg-blue-50 cursor-pointer'
                      }}
                      eventContent={() => null}
                      events={[]}
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRescheduleDialog(false)}
              disabled={isRescheduling}
            >
              İptal
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={isRescheduling || !newCheckIn || !newCheckOut || isLoadingAvailability}
            >
              {isRescheduling ? 'Güncelleniyor...' : 'Rezervasyonu Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
