'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReservationCreateSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Calendar, User, Home, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import trLocale from '@fullcalendar/core/locales/tr'
import { format, isBefore, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Bungalow {
  id: string
  name: string
  capacity: number
  basePrice: number
  features: Record<string, any>
  description?: string
  status: string
}

interface PricingResult {
  breakdown: Array<{
    description: string
    amount: number
    type: string
  }>
  baseAmount: number
  extrasAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  status: string
  _count: {
    reservations: number
  }
}

type Step = 'bungalow' | 'calendar' | 'customer' | 'confirmation'

export default function NewReservationPage() {
  const [currentStep, setCurrentStep] = useState<Step>('bungalow')
  const [bungalows, setBungalows] = useState<Bungalow[]>([])
  const [selectedBungalow, setSelectedBungalow] = useState<Bungalow | null>(null)
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  })
  const [pricing, setPricing] = useState<PricingResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [, setIsCalculating] = useState(false)
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const [useManualPrice, setUseManualPrice] = useState(false)
  const [manualPrice, setManualPrice] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ReservationCreateSchema),
  })

  // Fetch bungalows
  useEffect(() => {
    const fetchBungalows = async () => {
      try {
        const response = await fetch('/api/bungalows')
        if (response.ok) {
          const data = await response.json()
          const activeBungalows = data.filter((b: Bungalow) => b.status === 'ACTIVE')
          setBungalows(activeBungalows)
          
          // URL parametresinden bungalov ID'sini al ve otomatik seç
          const bungalowId = searchParams.get('bungalow')
          if (bungalowId) {
            const selectedBung = activeBungalows.find((b: Bungalow) => b.id === bungalowId)
            if (selectedBung) {
              setSelectedBungalow(selectedBung)
              setCurrentStep('calendar')
            } else {
              // Geçersiz bungalov ID'si, bungalov seçim adımına git
              toast.error('Seçilen bungalov bulunamadı, lütfen yeniden seçin')
              setCurrentStep('bungalow')
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch bungalows:', error)
        toast.error('Bungalovlar yüklenemedi')
      }
    }
    fetchBungalows()
  }, [searchParams])

  // Fetch customers
  const fetchCustomers = async (search: string = '') => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('status', 'ACTIVE') // Sadece aktif müşteriler
      params.append('limit', '20') // İlk 20 müşteri
      
      const response = await fetch(`/api/customers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  // Customer search effect
  useEffect(() => {
    if (customerSearch.length >= 2) {
      const debounceTimer = setTimeout(() => {
        fetchCustomers(customerSearch)
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else if (customerSearch.length === 0) {
      fetchCustomers() // Fetch all when search is empty
    }
  }, [customerSearch])

  // Fetch blocked dates when bungalow is selected
  useEffect(() => {
    if (selectedBungalow) {
      fetchBlockedDates(selectedBungalow.id)
    }
  }, [selectedBungalow])

  // Calculate pricing when dates are selected
  useEffect(() => {
    if (selectedBungalow && selectedDates.start && selectedDates.end) {
      calculatePricing()
    }
  }, [selectedBungalow, selectedDates])

  const fetchBlockedDates = async (bungalowId: string) => {
    try {
      const response = await fetch(`/api/reservations/availability?bungalowId=${bungalowId}`)
      if (response.ok) {
        const data = await response.json()
        setBlockedDates(data.blockedDates.map((date: string) => new Date(date)))
      }
    } catch (error) {
      console.error('Failed to fetch blocked dates:', error)
    }
  }

  const calculatePricing = async () => {
    if (!selectedBungalow || !selectedDates.start || !selectedDates.end) {
      setPricing(null)
      return
    }

    setIsCalculating(true)
    setPricing(null)
    
    try {
      const response = await fetch('/api/reservations/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bungalowId: selectedBungalow.id,
          checkIn: selectedDates.start.toISOString(),
          checkOut: selectedDates.end.toISOString(),
          guests: 2, // Default guest count
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPricing(data)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        console.error('Pricing API error:', errorData)
        toast.error(errorData.error || errorData.message || 'Fiyat hesaplanamadı')
      }
    } catch (error) {
      console.error('Pricing calculation failed:', error)
      toast.error('Fiyat hesaplama hatası')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleBungalowSelect = (bungalow: Bungalow) => {
    setSelectedBungalow(bungalow)
    setValue('bungalowId', bungalow.id)
    setCurrentStep('calendar')
  }

  const handleDateSelect = (selectInfo: { start: Date; end: Date }) => {
    const { start, end } = selectInfo
    setSelectedDates({ start, end })
  }

  const handleDateConfirm = () => {
    if (!selectedDates.start || !selectedDates.end) {
      toast.error('Lütfen giriş ve çıkış tarihlerini seçin')
      return
    }
    setValue('checkIn', selectedDates.start)
    setValue('checkOut', selectedDates.end)
    setCurrentStep('customer')
  }

  const handleCustomerStepNext = () => {
    // Eğer mevcut müşteri seçildiyse, form alanlarını doldur
    if (selectedCustomer) {
      setValue('customerName', selectedCustomer.name)
      setValue('customerEmail', selectedCustomer.email)
      setValue('customerPhone', selectedCustomer.phone)
    }

    // Form verilerini kontrol et
    const customerName = watch('customerName')
    const customerEmail = watch('customerEmail')
    const customerPhone = watch('customerPhone')
    const guests = watch('guests')

    // Zorunlu alanları kontrol et
    if (!customerName || customerName.trim().length < 2) {
      toast.error('Müşteri adı en az 2 karakter olmalıdır')
      return
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      toast.error('Geçerli bir e-posta adresi giriniz')
      return
    }

    if (!customerPhone || customerPhone.trim().length < 7) {
      toast.error('Telefon numarası en az 7 karakter olmalıdır')
      return
    }

    if (!guests || guests < 1) {
      toast.error('En az 1 misafir olmalıdır')
      return
    }

    if (guests > (selectedBungalow?.capacity || 0)) {
      toast.error(`Misafir sayısı ${selectedBungalow?.capacity} kişiyi geçemez`)
      return
    }

    // Tüm validasyonlar geçtiyse onay adımına geç
    setCurrentStep('confirmation')
  }

  const onSubmit = async (data: Record<string, any>) => {
    setIsLoading(true)
    try {
      // Manuel fiyat ve kapora bilgilerini ekle
      const reservationData = {
        ...data,
        bungalowId: selectedBungalow?.id,
        customerId: selectedCustomer?.id || null, // Seçilen müşteri ID'si
        checkIn: selectedDates.start,
        checkOut: selectedDates.end,
        // Manuel fiyat kullanılıyorsa onu kullan, yoksa otomatik hesaplanmış fiyatı kullan
        manualPrice: useManualPrice && manualPrice ? parseFloat(manualPrice) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        // Toplam tutarı belirle
        totalAmount: useManualPrice && manualPrice ? parseFloat(manualPrice) : pricing?.totalAmount || 0,
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Rezervasyon başarıyla oluşturuldu!')
        router.push(`/reservations/${result.id}`)
      } else {
        const error = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        console.error('Reservation creation API error:', error)
        toast.error(error.error || error.message || 'Rezervasyon oluşturulamadı')
      }
    } catch (error) {
      console.error('Reservation creation failed:', error)
      toast.error('Rezervasyon oluşturma hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    } finally {
      setIsLoading(false)
    }
  }

  // const isDateBlocked = (date: Date) => {
  //   // Geçmiş tarihleri blokla
  //   if (isBefore(date, startOfDay(new Date()))) {
  //     return true
  //   }
    
  //   // Rezervasyon olan tarihleri blokla
  //   return blockedDates.some(blockedDate => 
  //     format(date, 'yyyy-MM-dd') === format(blockedDate, 'yyyy-MM-dd')
  //   )
  // }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'bungalow', label: 'Bungalov Seçimi', icon: Home },
      { key: 'calendar', label: 'Tarih Seçimi', icon: Calendar },
      { key: 'customer', label: 'Müşteri Bilgileri', icon: User },
      { key: 'confirmation', label: 'Onay', icon: Check },
    ]

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.key
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index

          return (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2
                ${isActive ? 'border-blue-600 bg-blue-600 text-white' : 
                  isCompleted ? 'border-green-600 bg-green-600 text-white' : 
                  'border-gray-300 bg-white text-gray-500'}
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' : 
                isCompleted ? 'text-green-600' : 
                'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderBungalowSelection = () => (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bungalov Seçimi</h1>
        <p className="text-gray-600">Rezervasyon yapmak istediğiniz bungalovu seçin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bungalows.map((bungalow) => (
          <Card 
            key={bungalow.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleBungalowSelect(bungalow)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{bungalow.name}</CardTitle>
                <Badge variant="secondary">{bungalow.capacity} kişi</Badge>
              </div>
              <CardDescription>{bungalow.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gecelik fiyat:</span>
                  <span className="font-semibold">₺{bungalow.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Durum:</span>
                  <Badge variant={bungalow.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {bungalow.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderCalendarSelection = () => (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tarih Seçimi</h1>
        <p className="text-gray-600">{selectedBungalow?.name} için müsait tarihleri seçin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Takvim</CardTitle>
              <CardDescription>
                Müsait günleri seçin. Kırmızı günler dolu, yeşil günler müsait.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={trLocale}
                selectable={true}
                selectMirror={true}
                selectOverlap={false}
                select={(selectInfo) => handleDateSelect(selectInfo)}
                dayMaxEvents={true}
                height="auto"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth'
                }}
                buttonText={{
                  today: 'Bugün',
                  month: 'Ay',
                  week: 'Hafta',
                  day: 'Gün'
                }}
                dayCellClassNames={(arg) => {
                  const dateStr = format(arg.date, 'yyyy-MM-dd')
                  const isBlocked = blockedDates.some(blockedDate => 
                    format(blockedDate, 'yyyy-MM-dd') === dateStr
                  )
                  
                  if (isBlocked) {
                    return 'fc-blocked-date'
                  }
                  
                  // Geçmiş tarihleri de blokla
                  if (isBefore(arg.date, startOfDay(new Date()))) {
                    return 'fc-past-date'
                  }
                  
                  return 'fc-available-date'
                }}
                selectConstraint={{
                  start: startOfDay(new Date()).toISOString(),
                }}
                validRange={{
                  start: new Date().toISOString()
                }}
                selectAllow={(selectInfo) => {
                  // Blocked dates kontrolü
                  const start = selectInfo.start
                  const end = selectInfo.end
                  
                  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    const dateStr = format(d, 'yyyy-MM-dd')
                    const isBlocked = blockedDates.some(blockedDate => 
                      format(blockedDate, 'yyyy-MM-dd') === dateStr
                    )
                    if (isBlocked) {
                      return false
                    }
                  }
                  return true
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seçilen Tarihler</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDates.start && selectedDates.end ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Giriş:</span>
                    <span className="font-medium">
                      {format(selectedDates.start, 'dd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Çıkış:</span>
                    <span className="font-medium">
                      {format(selectedDates.end, 'dd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Gece sayısı:</span>
                    <span className="font-medium">
                      {Math.ceil((selectedDates.end.getTime() - selectedDates.start.getTime()) / (1000 * 60 * 60 * 24))} gece
                    </span>
                  </div>
                  
                  {pricing && (
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Toplam:</span>
                        <span>₺{pricing.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleDateConfirm}
                    className="w-full"
                    disabled={!selectedDates.start || !selectedDates.end}
                  >
                    Tarihleri Onayla
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>Lütfen takvimden tarih seçin</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bungalov Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bungalov:</span>
                  <span className="font-medium">{selectedBungalow?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Kapasite:</span>
                  <span className="font-medium">{selectedBungalow?.capacity} kişi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gecelik fiyat:</span>
                  <span className="font-medium">₺{selectedBungalow?.basePrice.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderCustomerForm = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Müşteri Bilgileri</h1>
        <p className="text-gray-600">Mevcut müşteri seçin veya yeni müşteri bilgileri girin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
          <CardDescription>
            Mevcut müşteri arayabilir veya yeni müşteri bilgileri girebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Müşteri Arama */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerSearch">Mevcut Müşteri Ara</Label>
              <Input
                id="customerSearch"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Ad, e-posta veya telefon ile ara..."
              />
            </div>

            {customers.length > 0 && customerSearch && (
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-lg bg-gray-50">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setValue('customerName', customer.name)
                      setValue('customerEmail', customer.email)
                      setValue('customerPhone', customer.phone)
                      setCustomerSearch('')
                    }}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                    <div className="text-xs text-gray-400">
                      {customer._count.reservations} rezervasyon
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seçilen Müşteri Bilgisi */}
          {selectedCustomer && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">Seçilen Müşteri: {selectedCustomer.name}</div>
                  <div className="text-sm text-blue-700">{selectedCustomer.email} • {selectedCustomer.phone}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(null)
                    setValue('customerName', '')
                    setValue('customerEmail', '')
                    setValue('customerPhone', '')
                  }}
                >
                  Temizle
                </Button>
              </div>
            </div>
          )}

          {/* Müşteri Bilgileri Formu */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  max={selectedBungalow?.capacity}
                  {...register('guests', { valueAsNumber: true })}
                />
                {errors.guests && (
                  <p className="text-sm text-red-600">{errors.guests.message}</p>
                )}
              </div>
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

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('calendar')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Geri
              </Button>
              <Button
                type="button"
                onClick={handleCustomerStepNext}
                disabled={!watch('customerName') || !watch('customerEmail') || !watch('customerPhone')}
              >
                Devam Et
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )

  const renderConfirmation = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rezervasyon Onayı</h1>
        <p className="text-gray-600">Rezervasyon detaylarını kontrol edin ve onaylayın</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Rezervasyon Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Bungalov:</span>
                <span className="font-medium">{selectedBungalow?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Giriş:</span>
                <span className="font-medium">
                  {selectedDates.start && format(selectedDates.start, 'dd MMMM yyyy', { locale: tr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Çıkış:</span>
                <span className="font-medium">
                  {selectedDates.end && format(selectedDates.end, 'dd MMMM yyyy', { locale: tr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gece sayısı:</span>
                <span className="font-medium">
                  {selectedDates.start && selectedDates.end && 
                    Math.ceil((selectedDates.end.getTime() - selectedDates.start.getTime()) / (1000 * 60 * 60 * 24))} gece
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Misafir sayısı:</span>
                <span className="font-medium">{watch('guests') || 2} kişi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ad Soyad:</span>
                <span className="font-medium">{watch('customerName') || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">E-posta:</span>
                <span className="font-medium">{watch('customerEmail') || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Telefon:</span>
                <span className="font-medium">{watch('customerPhone') || '-'}</span>
              </div>
              {watch('notes') && (
                <div>
                  <span className="text-sm text-gray-600">Notlar:</span>
                  <p className="text-sm mt-1">{watch('notes')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fiyat ve Ödeme Bilgileri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {pricing && (
          <Card>
            <CardHeader>
              <CardTitle>Fiyat Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Baz tutar:</span>
                  <span>₺{pricing.baseAmount.toLocaleString()}</span>
                </div>
                
                {/* Fiyat kuralları detayları */}
                {pricing.breakdown && pricing.breakdown.length > 0 && (
                  <div className="space-y-1">
                    {pricing.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs text-gray-600">
                        <span>{item.description}:</span>
                        <span className={item.amount > 0 ? 'text-orange-600' : 'text-green-600'}>
                          {item.amount > 0 ? '+' : ''}₺{Math.abs(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {pricing.extrasAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Ekstra hizmetler:</span>
                    <span>₺{pricing.extrasAmount.toLocaleString()}</span>
                  </div>
                )}
                {pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>İndirim:</span>
                    <span>-₺{pricing.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Toplam</span>
                    <span>₺{(useManualPrice && manualPrice ? parseFloat(manualPrice) : pricing.totalAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ödeme Özeti */}
        <Card>
          <CardHeader>
            <CardTitle>Ödeme Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {useManualPrice && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">Manuel Fiyat Kullanılıyor</span>
                  </div>
                  <div className="text-xs text-yellow-700">
                    Otomatik hesaplanan: ₺{pricing?.totalAmount.toLocaleString() || '0'}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Toplam tutar:</span>
                  <span className="font-medium">
                    ₺{(useManualPrice && manualPrice ? parseFloat(manualPrice) : pricing?.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Alınan kapora:</span>
                  <span className="font-medium">
                    ₺{(depositAmount ? parseFloat(depositAmount) : 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-blue-900">
                  <span>Kalan ödeme:</span>
                  <span>
                    ₺{Math.max(0, (useManualPrice && manualPrice ? parseFloat(manualPrice) : pricing?.totalAmount || 0) - (depositAmount ? parseFloat(depositAmount) : 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {(depositAmount && parseFloat(depositAmount) > 0) && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Kapora Alındı</span>
                  </div>
                  <div className="text-xs text-green-700">
                    ₺{parseFloat(depositAmount).toLocaleString()} kapora tutarı alınmıştır
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex space-x-4 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep('customer')}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Button>
        <Button
          type="button"
          onClick={() => {
            // Form verilerini kontrol et
            const formData = {
              bungalowId: selectedBungalow?.id,
              checkIn: selectedDates.start,
              checkOut: selectedDates.end,
              guests: watch('guests') || 2,
              customerName: watch('customerName'),
              customerEmail: watch('customerEmail'),
              customerPhone: watch('customerPhone'),
              notes: watch('notes'),
            }
            
            // Eksik alanları kontrol et - daha detaylı validasyon
            if (!formData.customerName || formData.customerName.trim().length < 2) {
              toast.error('Müşteri adı en az 2 karakter olmalıdır')
              setCurrentStep('customer')
              return
            }
            
            if (!formData.customerEmail || !formData.customerEmail.includes('@')) {
              toast.error('Geçerli bir e-posta adresi giriniz')
              setCurrentStep('customer')
              return
            }
            
            if (!formData.customerPhone || formData.customerPhone.trim().length < 7) {
              toast.error('Telefon numarası en az 7 karakter olmalıdır')
              setCurrentStep('customer')
              return
            }

            if (!formData.guests || formData.guests < 1) {
              toast.error('En az 1 misafir olmalıdır')
              setCurrentStep('customer')
              return
            }

            if (formData.guests > (selectedBungalow?.capacity || 0)) {
              toast.error(`Misafir sayısı ${selectedBungalow?.capacity} kişiyi geçemez`)
              setCurrentStep('customer')
              return
            }
            
            // Rezervasyonu oluştur
            onSubmit(formData)
          }}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Oluşturuluyor...' : 'Rezervasyonu Onayla'}
        </Button>
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/reservations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Yeni Rezervasyon</h1>
            <p className="text-gray-600">Adım adım rezervasyon oluşturun</p>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {currentStep === 'bungalow' && renderBungalowSelection()}
        {currentStep === 'calendar' && renderCalendarSelection()}
        {currentStep === 'customer' && renderCustomerForm()}
        {currentStep === 'confirmation' && renderConfirmation()}
      </div>
    </DashboardLayout>
  )
}
