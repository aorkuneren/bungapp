'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BungalowEditFormSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, Save, X, Home, Users, DollarSign, Plus, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Bungalow {
  id: string
  name: string
  slug: string
  description: string
  capacity: number
  basePrice: number
  status: string
  features: any
  createdAt: string
  updatedAt: string
}

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

export default function EditBungalowPage() {
  const [bungalow, setBungalow] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [standardFeatures, setStandardFeatures] = useState<Array<{key: string, value: string}>>([])
  const [customFeatures, setCustomFeatures] = useState<Array<{key: string, value: string}>>([])
  const [newFeatureKey, setNewFeatureKey] = useState('')
  const [newFeatureValue, setNewFeatureValue] = useState('')
  const params = useParams()
  const router = useRouter()

  const bungalowId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(BungalowEditFormSchema),
    defaultValues: {
      name: '',
      description: '',
      capacity: 1,
      basePrice: 0,
      priceIncludesVat: true,
      features: {},
      status: 'ACTIVE'
    }
  })

  const watchedStatus = watch('status')

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
        
        // Form verilerini doldur
        reset({
          name: data.name,
          description: data.description || '',
          capacity: data.capacity,
          basePrice: data.basePrice,
          status: data.status,
          features: data.features || {}
        })
        
        // Set standard and custom features
        if (data.features && typeof data.features === 'object') {
          const standardFeatureKeys = Object.keys(STANDARD_FEATURES)
          
          // Standart özellikler - sadece mevcut olanları
          const standardFeats = Object.entries(data.features as Record<string, any>)
            .filter(([key]) => standardFeatureKeys.includes(key))
            .map(([key, value]) => ({ key, value: String(value) }))
          setStandardFeatures(standardFeats)
          
          // Özel özellikler - standart olmayan tüm özellikler
          const customFeats = Object.entries(data.features as Record<string, any>)
            .filter(([key]) => !standardFeatureKeys.includes(key))
            .map(([key, value]) => ({ key, value: String(value) }))
          setCustomFeatures(customFeats)
        }
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

  // Standart özellik yönetimi
  const addStandardFeature = (featureKey: string) => {
    if (!standardFeatures.some(f => f.key === featureKey)) {
      setStandardFeatures([...standardFeatures, { key: featureKey, value: 'var' }])
    }
  }

  const removeStandardFeature = (index: number) => {
    setStandardFeatures(standardFeatures.filter((_, i) => i !== index))
  }

  const updateStandardFeature = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...standardFeatures]
    updated[index][field] = value
    setStandardFeatures(updated)
  }

  // Özel özellik yönetimi
  const addCustomFeature = () => {
    if (newFeatureKey.trim() && newFeatureValue.trim()) {
      setCustomFeatures([...customFeatures, { key: newFeatureKey.trim(), value: newFeatureValue.trim() }])
      setNewFeatureKey('')
      setNewFeatureValue('')
    }
  }

  const removeCustomFeature = (index: number) => {
    setCustomFeatures(customFeatures.filter((_, i) => i !== index))
  }

  const updateCustomFeature = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customFeatures]
    updated[index][field] = value
    setCustomFeatures(updated)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/bungalows/${bungalowId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Bungalov başarıyla silindi!')
        router.push('/bungalows')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Bungalov silinemedi')
      }
    } catch (error) {
      console.error('Failed to delete bungalov:', error)
      toast.error('Bungalov silme hatası')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const onSubmit = async (data: any) => {
    // Manuel validation
    if (!data.name || data.name.trim().length < 2) {
      toast.error('Bungalov adı en az 2 karakter olmalıdır')
      return
    }
    
    if (!data.capacity || isNaN(Number(data.capacity)) || Number(data.capacity) < 1) {
      toast.error('Kapasite en az 1 olmalıdır')
      return
    }
    
    if (!data.basePrice || isNaN(Number(data.basePrice)) || Number(data.basePrice) <= 0) {
      toast.error('Fiyat pozitif olmalıdır')
      return
    }
    
    setIsSaving(true)
    try {
      const allFeatures: Record<string, any> = {}
      
      // Add current standard features
      standardFeatures.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          allFeatures[key.trim()] = value.trim()
        }
      })
      
      // Add current custom features
      customFeatures.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          allFeatures[key.trim()] = value.trim()
        }
      })
      
      const submitData = {
        ...data,
        capacity: Number(data.capacity),
        basePrice: Number(data.basePrice),
        priceIncludesVat: data.priceIncludesVat === 'true',
        features: allFeatures
      }

      const response = await fetch(`/api/bungalows/${bungalowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        toast.success('Bungalov başarıyla güncellendi!')
        router.push(`/bungalows/${bungalowId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Bungalov güncellenemedi')
      }
    } catch (error) {
      console.error('Failed to update bungalov:', error)
      toast.error('Bungalov güncelleme hatası')
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
            <p className="mt-4 text-gray-600">Bungalov yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!bungalow) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
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
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href={`/bungalows/${bungalow.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Bungalov Düzenle</h1>
            <p className="text-gray-600">{bungalow.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="mr-2 h-5 w-5" />
                  Temel Bilgiler
                </CardTitle>
                <CardDescription>
                  Bungalov temel bilgilerini güncelleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bungalov Adı *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Bungalov adı"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Bungalov açıklaması..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Durum *</Label>
                  <Select value={watchedStatus} onValueChange={(value) => setValue('status', value as 'ACTIVE' | 'PASSIVE')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="PASSIVE">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-red-600">{errors.status.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Capacity & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Kapasite ve Fiyat
                </CardTitle>
                <CardDescription>
                  Kapasite ve fiyat bilgilerini güncelleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Kapasite *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    {...register('capacity', { valueAsNumber: true })}
                    placeholder="Maksimum kişi sayısı"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePrice">Gecelik Fiyat (₺) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('basePrice', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>KDV Durumu</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="priceIncludesVat-true"
                        {...register('priceIncludesVat')}
                        value="true"
                        className="rounded"
                      />
                      <Label htmlFor="priceIncludesVat-true" className="text-sm font-normal">
                        KDV Dahil
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="priceIncludesVat-false"
                        {...register('priceIncludesVat')}
                        value="false"
                        className="rounded"
                      />
                      <Label htmlFor="priceIncludesVat-false" className="text-sm font-normal">
                        KDV Hariç
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Fiyatın KDV dahil mi yoksa hariç mi olduğunu belirtin
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span>Mevcut fiyat: ₺{bungalow.basePrice.toLocaleString()} {bungalow.priceIncludesVat ? '(KDV Dahil)' : '(KDV Hariç)'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Özellikler</CardTitle>
              <CardDescription>
                Bungalov özelliklerini ekleyin (opsiyonel)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Standard Features */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Standart Özellikler</h4>
                    <Select onValueChange={addStandardFeature}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Özellik ekle" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STANDARD_FEATURES)
                          .filter(([key]) => !standardFeatures.some(f => f.key === key))
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Existing Standard Features */}
                  {standardFeatures.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {standardFeatures.map((feature, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label>Özellik</Label>
                            <Input
                              value={STANDARD_FEATURES[feature.key as keyof typeof STANDARD_FEATURES] || feature.key}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="flex-1">
                            <Label>Değer</Label>
                            <Select
                              value={feature.value}
                              onValueChange={(value) => updateStandardFeature(index, 'value', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="var">Var</SelectItem>
                                <SelectItem value="yok">Yok</SelectItem>
                                <SelectItem value="true">Evet</SelectItem>
                                <SelectItem value="false">Hayır</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeStandardFeature(index)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {standardFeatures.length === 0 && (
                    <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-sm">Henüz standart özellik eklenmemiş</p>
                      <p className="text-xs">Yukarıdaki dropdown'dan özellik ekleyebilirsiniz</p>
                    </div>
                  )}
                </div>

                {/* Custom Features */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Özel Özellikler</h4>
                  
                  {/* Existing Custom Features */}
                  {customFeatures.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {customFeatures.map((feature, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label>Özellik Adı</Label>
                            <Input
                              value={feature.key}
                              onChange={(e) => updateCustomFeature(index, 'key', e.target.value)}
                              placeholder="Özellik adı"
                            />
                          </div>
                          <div className="flex-1">
                            <Label>Değer</Label>
                            <Input
                              value={feature.value}
                              onChange={(e) => updateCustomFeature(index, 'value', e.target.value)}
                              placeholder="Değer"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeCustomFeature(index)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Custom Feature */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h5 className="text-sm font-medium mb-3">Yeni Özellik Ekle</h5>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Özellik Adı</Label>
                        <Input
                          value={newFeatureKey}
                          onChange={(e) => setNewFeatureKey(e.target.value)}
                          placeholder="Örn: Havuz, Barbekü, Oyun Alanı"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Değer</Label>
                        <Input
                          value={newFeatureValue}
                          onChange={(e) => setNewFeatureValue(e.target.value)}
                          placeholder="Örn: Var, Yok, 2 adet"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomFeature}
                        disabled={!newFeatureKey.trim() || !newFeatureValue.trim()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            {/* Delete Button */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Bungalov Sil
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                    Bungalov Silme Onayı
                  </DialogTitle>
                  <DialogDescription>
                    <strong>{bungalow?.name}</strong> bungalovunu silmek istediğinizden emin misiniz? 
                    Bu işlem geri alınamaz ve tüm veriler kalıcı olarak silinecektir.
                    <br /><br />
                    <span className="text-amber-600 font-medium">
                      Not: Aktif rezervasyonları olan bungalovlar silinemez.
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteDialog(false)}
                    disabled={isDeleting}
                  >
                    İptal
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Save/Cancel Buttons */}
            <div className="flex space-x-4">
              <Button asChild variant="outline">
                <Link href={`/bungalows/${bungalow.id}`}>
                  <X className="mr-2 h-4 w-4" />
                  İptal
                </Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
