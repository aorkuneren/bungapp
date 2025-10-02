'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, Edit, Home, Users, Calendar, DollarSign, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import Image from 'next/image'

// Standart özellikler ve Türkçe karşılıkları
const STANDARD_FEATURES = {
  wifi: 'WiFi',
  klima: 'Klima',
  tv: 'TV',
  minibar: 'Minibar',
  jakuzi: 'Jakuzi',
  balkon: 'Balkon',
  mutfak: 'Mutfak',
  jacuzzi: 'Jacuzzi',
  forestView: 'Orman Manzarası',
  fullKitchen: 'Tam Mutfak',
  airConditioning: 'Klima Sistemi',
  seaView: 'Deniz Manzarası',
  gardenView: 'Bahçe Manzarası',
  kitchenette: 'Mini Mutfak',
  balcony: 'Balkon',
  pool: 'Havuz',
  parking: 'Otopark',
  petFriendly: 'Evcil Hayvan Dostu'
}

interface Bungalow {
  id: string
  name: string
  slug: string
  description: string
  capacity: number
  basePrice: number
  priceIncludesVat: boolean
  status: string
  features: Record<string, any>
  createdAt: string
  updatedAt: string
  images: Array<{
    id: string
    url: string
    alt: string
    sortOrder: number
  }>
  _count: {
    reservations: number
  }
}

export default function BungalowDetailPage() {
  const [bungalow, setBungalow] = useState<Bungalow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const params = useParams()
  const router = useRouter()

  const bungalowId = params.id as string

  useEffect(() => {
    if (bungalowId) {
      fetchBungalow()
    }
  }, [bungalowId])

  const fetchBungalow = async () => {
    try {
      const response = await fetch(`/api/bungalows/${bungalowId}`)
      if (response.ok) {
        const data = await response.json()
        setBungalow(data)
      } else {
        toast.error('Bungalov bulunamadı')
        router.push('/bungalows')
      }
    } catch (error) {
      console.error('Failed to fetch bungalow:', error)
      toast.error('Bungalov yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'ACTIVE': { label: 'Aktif', variant: 'default' as const },
      'PASSIVE': { label: 'Pasif', variant: 'secondary' as const }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Bungalov yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!bungalow) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Bungalov Bulunamadı</h1>
            <p className="text-gray-600 mb-6">Aradığınız bungalov mevcut değil.</p>
            <Button asChild>
              <Link href="/bungalows">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Bungalovlara Dön
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/bungalows">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Geri
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{bungalow.name}</h1>
              <p className="text-gray-600">Bungalov detayları</p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/bungalows/${bungalow.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  Görseller
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bungalow.images && bungalow.images.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bungalow.images.map((image) => (
                      <div key={image.id} className="relative aspect-video rounded-lg overflow-hidden">
                        <Image
                          src={image.url}
                          alt={image.alt || bungalow.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Henüz görsel yüklenmemiş</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Açıklama</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {bungalow.description || 'Açıklama bulunmuyor.'}
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            {bungalow.features && Object.keys(bungalow.features).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Özellikler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(bungalow.features as Record<string, any>)
                      .filter(([, value]) => {
                        // Sadece truthy değerleri ve 'var' değerini göster, 'yok', 'false', false, null, undefined'ı filtrele
                        return value && 
                               value !== 'yok' && 
                               value !== 'false' && 
                               value !== false &&
                               value !== null &&
                               value !== undefined
                      })
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">
                            {STANDARD_FEATURES[key as keyof typeof STANDARD_FEATURES] || key}
                          </span>
                          {value !== 'var' && value !== 'true' && value !== true && (
                            <span className="text-xs text-gray-500">
                              ({String(value)})
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                  {Object.entries(bungalow.features as Record<string, any>)
                    .filter(([, value]) => {
                      return value && 
                             value !== 'yok' && 
                             value !== 'false' && 
                             value !== false &&
                             value !== null &&
                             value !== undefined
                    }).length === 0 && (
                    <p className="text-sm text-gray-500 italic">Özellik bilgisi bulunmuyor</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Genel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Durum</span>
                  {getStatusBadge(bungalow.status)}
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    Kapasite: {bungalow.capacity} kişi
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      Gecelik fiyat: ₺{bungalow.basePrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="ml-6">
                    <span className="text-xs text-gray-500">
                      {bungalow.priceIncludesVat ? 'KDV Dahil' : 'KDV Hariç'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    Toplam rezervasyon: {bungalow._count?.reservations || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Oluşturulma Tarihi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Oluşturuldu:</span>
                    <span>{format(new Date(bungalow.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Güncellendi:</span>
                    <span>{format(new Date(bungalow.updatedAt), 'dd MMMM yyyy HH:mm', { locale: tr })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>İşlemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
                  <Link href={`/bungalows/${bungalow.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Düzenle
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/reservations/new">
                    <Calendar className="mr-2 h-4 w-4" />
                    Rezervasyon Oluştur
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
