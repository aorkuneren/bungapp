'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, Save, X, Home, Users, DollarSign, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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

export default function NewBungalowPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [standardFeatures, setStandardFeatures] = useState<Array<{key: string, value: string}>>([])
  const [customFeatures, setCustomFeatures] = useState<Array<{key: string, value: string}>>([])
  const [newFeatureKey, setNewFeatureKey] = useState('')
  const [newFeatureValue, setNewFeatureValue] = useState('')
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({})
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      capacity: 1,
      basePrice: 0,
      priceIncludesVat: true,
      status: 'ACTIVE'
    }
  })

  const watchedStatus = watch('status')

  // Sistem ayarlarını yükle
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await fetch('/api/system-settings')
        if (response.ok) {
          const data = await response.json()
          setSystemSettings(data)
          // Varsayılan KDV durumunu form'a set et
          setValue('priceIncludesVat', data.pricesIncludeVat !== false)
        } else {
          // Varsayılan değer: KDV dahil
          setValue('priceIncludesVat', true)
        }
      } catch (error) {
        console.error('Error fetching system settings:', error)
        // Varsayılan değer: KDV dahil
        setValue('priceIncludesVat', true)
      } finally {
        setIsLoadingSettings(false)
      }
    }

    fetchSystemSettings()
  }, [setValue])

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

      const response = await fetch('/api/bungalows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const newBungalow = await response.json()
        toast.success('Bungalov başarıyla oluşturuldu!')
        router.push(`/bungalows/${newBungalow.id}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Bungalov oluşturulamadı')
      }
    } catch (error) {
      console.error('Failed to create bungalov:', error)
      toast.error('Bungalov oluşturma hatası')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/bungalows">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Yeni Bungalov</h1>
            <p className="text-gray-600">Yeni bungalov oluşturun</p>
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
                  Bungalovun temel bilgilerini girin
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
                    placeholder="Bungalov açıklaması"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Durum</Label>
                  <Select
                    value={watchedStatus}
                    onValueChange={(value) => setValue('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="PASSIVE">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
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
                  Kapasite ve fiyat bilgilerini girin
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
                        defaultChecked
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
                    {isLoadingSettings 
                      ? 'Yükleniyor...' 
                      : `Sistem varsayılanı: ${systemSettings.pricesIncludeVat !== false ? 'KDV Dahil' : 'KDV Hariç'}`
                    }
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <DollarSign className="h-4 w-4" />
                    <span>Fiyat daha sonra değiştirilebilir</span>
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
          <div className="flex justify-end space-x-4">
            <Button asChild variant="outline">
              <Link href="/bungalows">
                <X className="mr-2 h-4 w-4" />
                İptal
              </Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Oluşturuluyor...' : 'Bungalov Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
