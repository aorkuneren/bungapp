'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

const CustomerEditSchema = z.object({
  name: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().min(7, 'Telefon numarası en az 7 karakter olmalıdır'),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'BANNED']),
})

type CustomerEditFormData = z.infer<typeof CustomerEditSchema>

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string | null
  notes: string | null
  status: 'ACTIVE' | 'BANNED'
  totalSpent: number
  createdAt: string
  updatedAt: string
  _count: {
    reservations: number
  }
}

interface CustomerEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CustomerEditPage({ params }: CustomerEditPageProps) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const resolvedParams = use(params)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CustomerEditFormData>({
    resolver: zodResolver(CustomerEditSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      status: 'ACTIVE',
    }
  })

  useEffect(() => {
    fetchCustomer()
  }, [resolvedParams.id])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Müşteri bulunamadı')
        } else if (response.status === 401) {
          throw new Error('Oturum açmanız gerekiyor')
        } else {
          throw new Error(`Sunucu hatası: ${response.status}`)
        }
      }
      
      const data = await response.json()
      setCustomer(data)
      
      // Form değerlerini doldur
      setValue('name', data.name || '')
      setValue('email', data.email || '')
      setValue('phone', data.phone || '')
      setValue('address', data.address || '')
      setValue('notes', data.notes || '')
      setValue('status', data.status || 'ACTIVE')
    } catch (error) {
      console.error('Error fetching customer:', error)
      toast.error(error instanceof Error ? error.message : 'Müşteri bilgileri yüklenirken hata oluştu')
      router.push('/customers')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: CustomerEditFormData) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 400) {
          throw new Error(errorData.error || 'Geçersiz veri')
        } else if (response.status === 401) {
          throw new Error('Oturum açmanız gerekiyor')
        } else if (response.status === 404) {
          throw new Error('Müşteri bulunamadı')
        } else {
          throw new Error(errorData.error || 'Müşteri güncellenemedi')
        }
      }

      const updatedCustomer = await response.json()
      setCustomer(updatedCustomer)
      toast.success('Müşteri başarıyla güncellendi')
      router.push(`/customers/${resolvedParams.id}`)
    } catch (error) {
      console.error('Error updating customer:', error)
      toast.error(error instanceof Error ? error.message : 'Müşteri güncellenirken hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Müşteri Bulunamadı</h1>
          <Button onClick={() => router.push('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Müşteri Listesine Dön
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/customers/${resolvedParams.id}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Müşteri Düzenle</h1>
        <p className="text-gray-600 mt-2">
          {customer.name} müşterisinin bilgilerini düzenleyin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
          <CardDescription>
            Müşteri bilgilerini güncelleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Müşteri adı soyadı"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="ornek@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="0555 123 45 67"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Durum</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as 'ACTIVE' | 'BANNED')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="BANNED">Yasaklı</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Müşteri adresi"
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Müşteri ile ilgili notlar..."
                rows={4}
              />
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/customers/${resolvedParams.id}`)}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
