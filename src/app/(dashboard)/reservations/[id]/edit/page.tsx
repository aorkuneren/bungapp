'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReservationUpdateSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, Save, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Reservation {
  id: string
  code: string
  bungalow: {
    id: string
    name: string
    slug: string
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
  notes?: string
  createdAt: string
  createdByUser: {
    name: string
    email: string
  }
}

interface Bungalow {
  id: string
  name: string
  slug: string
  capacity: number
  basePrice: number
}

export default function EditReservationPage() {
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [bungalows, setBungalows] = useState<Bungalow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const params = useParams()
  const router = useRouter()

  const reservationId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ReservationUpdateSchema),
  })

  // const watchedStatus = watch('status') // Status field not in form schema

  useEffect(() => {
    if (reservationId) {
      fetchReservation()
      fetchBungalows()
    }
  }, [reservationId])

  const fetchReservation = async () => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`)
      if (response.ok) {
        const data = await response.json()
        setReservation(data)
        
        // Form verilerini doldur
        setValue('customerName', data.customerName)
        setValue('customerEmail', data.customerEmail)
        setValue('customerPhone', data.customerPhone)
        setValue('guests', data.guests)
        setValue('notes', data.notes || '')
        // setValue('status', data.status) // Status not in form schema
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

  const fetchBungalows = async () => {
    try {
      const response = await fetch('/api/bungalows')
      if (response.ok) {
        const data = await response.json()
        setBungalows(data)
      }
    } catch (error) {
      console.error('Failed to fetch bungalows:', error)
    }
  }

  const onSubmit = async (data: any) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Rezervasyon başarıyla güncellendi!')
        router.push(`/reservations/${reservationId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Rezervasyon güncellenemedi')
      }
    } catch (error) {
      console.error('Failed to update reservation:', error)
      toast.error('Rezervasyon güncelleme hatası')
    } finally {
      setIsSaving(false)
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
            <Link href={`/reservations/${reservation.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Rezervasyon Düzenle</h1>
            <p className="text-gray-600">Rezervasyon kodu: {reservation.code}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Müşteri Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Bilgileri</CardTitle>
                <CardDescription>
                  Müşteri iletişim bilgilerini güncelleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Ad Soyad *</Label>
                  <Input
                    id="customerName"
                    {...register('customerName')}
                    placeholder="Müşteri adı soyadı"
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-600">{errors.customerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">E-posta *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    {...register('customerEmail')}
                    placeholder="ornek@email.com"
                  />
                  {errors.customerEmail && (
                    <p className="text-sm text-red-600">{errors.customerEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefon *</Label>
                  <Input
                    id="customerPhone"
                    {...register('customerPhone')}
                    placeholder="0555 123 45 67"
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-red-600">{errors.customerPhone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guests">Misafir Sayısı *</Label>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    {...register('guests', { valueAsNumber: true })}
                  />
                  {errors.guests && (
                    <p className="text-sm text-red-600">{errors.guests.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Rezervasyon ile ilgili notlar..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rezervasyon Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle>Rezervasyon Bilgileri</CardTitle>
                <CardDescription>
                  Rezervasyon detaylarını görüntüleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bungalov</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">{reservation.bungalow.name}</p>
                    {/* <p className="text-sm text-gray-600">Kapasite: {reservation.bungalow.capacity} kişi</p> */}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tarihler</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">
                      {format(new Date(reservation.checkIn), 'dd MMMM yyyy', { locale: tr })} - {format(new Date(reservation.checkOut), 'dd MMMM yyyy', { locale: tr })}
                    </p>
                    <p className="text-sm text-gray-600">{reservation.nights} gece</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Durum *</Label>
                  {/* <Select value={watchedStatus} onValueChange={(value) => setValue('status', value)}> */}
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">Durum değişikliği bu sayfada yapılamaz</p>
                  </div>
                  {/* 
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Beklemede</SelectItem>
                      <SelectItem value="CONFIRMED">Onaylandı</SelectItem>
                      <SelectItem value="CHECKED_IN">Giriş Yapıldı</SelectItem>
                      <SelectItem value="CHECKED_OUT">Çıkış Yapıldı</SelectItem>
                      <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-red-600">{errors.status.message}</p>
                  )}
                  */}
                </div>

                <div className="space-y-2">
                  <Label>Fiyat Bilgileri</Label>
                  <div className="p-3 bg-gray-50 rounded-md space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Temel fiyat ({reservation.nights} gece):</span>
                      <span>₺{reservation.baseAmount.toLocaleString()}</span>
                    </div>
                    {reservation.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>İndirim:</span>
                        <span>-₺{reservation.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {reservation.extrasAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Ek hizmetler:</span>
                        <span>₺{reservation.extrasAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {reservation.taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>KDV:</span>
                        <span>₺{reservation.taxAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Toplam:</span>
                      <span>₺{reservation.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button asChild variant="outline">
              <Link href={`/reservations/${reservation.id}`}>
                <X className="mr-2 h-4 w-4" />
                İptal
              </Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
