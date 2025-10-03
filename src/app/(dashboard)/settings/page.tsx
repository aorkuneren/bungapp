'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Settings, Users, DollarSign, Mail, Shield, Database, Plus, Edit, Trash2, AlertTriangle, Download, RefreshCw, CheckCircle, XCircle, AlertCircle, HardDrive, Cpu, MemoryStick } from 'lucide-react'
import { toast } from 'sonner'

interface PriceRule {
  id: string
  name: string
  type: 'SEASON' | 'WEEKEND' | 'HOLIDAY' | 'MIN_NIGHTS' | 'PER_PERSON' | 'CUSTOM'
  amountType: 'FIXED' | 'PERCENT' | 'PER_PERSON' | 'NIGHTLY'
  amountValue: number
  appliesTo: 'GLOBAL' | 'BUNGALOW'
  bungalowId?: string
  dateStart?: Date
  dateEnd?: Date
  weekdayMask?: any
  createdAt: Date
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [priceRules, setPriceRules] = useState<PriceRule[]>([])
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [showNewRuleDialog, setShowNewRuleDialog] = useState(false)
  const [showEditRuleDialog, setShowEditRuleDialog] = useState(false)
  const [showDeleteRuleDialog, setShowDeleteRuleDialog] = useState(false)
  const [selectedRule, setSelectedRule] = useState<PriceRule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<any>(null)
  
  // Kullanıcı yönetimi state'leri
  const [users, setUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const fetchPriceRules = async () => {
    try {
      const response = await fetch('/api/price-rules')
      if (response.ok) {
        const data = await response.json()
        setPriceRules(data)
      } else {
        toast.error('Fiyat kuralları yüklenemedi')
      }
    } catch (error) {
      console.error('Failed to fetch price rules:', error)
      toast.error('Fiyat kuralları yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/system-settings')
      if (response.ok) {
        const data = await response.json()
        setSystemSettings({
          pricesIncludeVat: data.pricesIncludeVat ?? true,
          vatRate: data.vatRate ?? 20,
          companyName: data.companyName ?? 'BungApp',
          companyAddress: data.companyAddress ?? '',
          companyPhone: data.companyPhone ?? '',
          companyEmail: data.companyEmail ?? '',
          ...data
        })
      } else {
        // Set default values if no settings exist
        setSystemSettings({
          pricesIncludeVat: true,
          vatRate: 20,
          companyName: 'BungApp',
          companyAddress: '',
          companyPhone: '',
          companyEmail: ''
        })
      }
    } catch (error) {
      console.error('Error fetching system settings:', error)
      toast.error('Sistem ayarları yüklenemedi')
      // Set default values on error
      setSystemSettings({
        pricesIncludeVat: true,
        vatRate: 20,
        companyName: 'BungApp',
        companyAddress: '',
        companyPhone: '',
        companyEmail: ''
      })
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const fetchSystemInfo = async () => {
    setIsLoadingSystemInfo(true)
    try {
      const response = await fetch('/api/system/info')
      if (response.ok) {
        const data = await response.json()
        setSystemInfo(data)
      } else {
        toast.error('Sistem bilgileri yüklenemedi')
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error)
      toast.error('Sistem bilgileri yüklenirken hata oluştu')
    } finally {
      setIsLoadingSystemInfo(false)
    }
  }

  // Kullanıcı yönetimi fonksiyonları
  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch('/api/users', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        if (response.status === 401) {
          toast.error('Oturum açmanız gerekiyor')
        } else {
          toast.error('Kullanıcılar yüklenemedi')
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleCreateUser = async (userData: any) => {
    setIsSavingUser(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        const newUser = await response.json()
        setUsers(prev => [newUser, ...prev])
        setShowUserDialog(false)
        toast.success('Kullanıcı başarıyla oluşturuldu')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Kullanıcı oluşturulamadı')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Kullanıcı oluşturulurken hata oluştu')
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleUpdateUser = async (userData: any) => {
    if (!selectedUser) return
    
    setIsSavingUser(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id ? updatedUser : user
        ))
        setShowEditUserDialog(false)
        setSelectedUser(null)
        toast.success('Kullanıcı başarıyla güncellendi')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Kullanıcı güncellenemedi')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Kullanıcı güncellenirken hata oluştu')
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    setIsDeletingUser(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== selectedUser.id))
        setShowDeleteUserDialog(false)
        setSelectedUser(null)
        toast.success('Kullanıcı başarıyla silindi')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Kullanıcı silinemedi')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Kullanıcı silinirken hata oluştu')
    } finally {
      setIsDeletingUser(false)
    }
  }

  const handleBackupDatabase = async () => {
    setIsBackingUp(true)
    try {
      const response = await fetch('/api/system/backup', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Veritabanı yedeği oluşturuldu: ${data.filename}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Veritabanı yedeği oluşturulamadı')
      }
    } catch (error) {
      console.error('Backup failed:', error)
      toast.error('Veritabanı yedeği oluşturulurken hata oluştu')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleClearCache = async (cacheType = 'all') => {
    setIsClearingCache(true)
    try {
      const response = await fetch(`/api/system/cache?type=${cacheType}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Cache temizlendi (${data.deletedKeys} anahtar silindi)`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Cache temizlenemedi')
      }
    } catch (error) {
      console.error('Cache clear failed:', error)
      toast.error('Cache temizlenirken hata oluştu')
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleSecurityScan = async () => {
    setIsScanning(true)
    try {
      const response = await fetch('/api/system/security-scan', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setScanResults(data)
        
        if (data.status === 'critical') {
          toast.error(`Güvenlik taraması tamamlandı: ${data.summary.critical} kritik sorun bulundu`)
        } else if (data.status === 'warning') {
          toast.warning(`Güvenlik taraması tamamlandı: ${data.summary.warnings} uyarı bulundu`)
        } else {
          toast.success('Güvenlik taraması tamamlandı: Sorun bulunamadı')
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Güvenlik taraması yapılamadı')
      }
    } catch (error) {
      console.error('Security scan failed:', error)
      toast.error('Güvenlik taraması yapılırken hata oluştu')
    } finally {
      setIsScanning(false)
    }
  }

  const updateSystemSetting = (key: string, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveSystemSettings = async () => {
    setIsSavingSettings(true)
    try {
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: systemSettings }),
      })

      if (response.ok) {
        toast.success('Sistem ayarları başarıyla kaydedildi!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Sistem ayarları kaydedilemedi')
      }
    } catch (error) {
      console.error('Failed to save system settings:', error)
      toast.error('Sistem ayarları kaydedilirken hata oluştu')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleCreateRule = async (data: any) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/price-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Fiyat kuralı başarıyla oluşturuldu!')
        setShowNewRuleDialog(false)
        fetchPriceRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Fiyat kuralı oluşturulamadı')
      }
    } catch (error) {
      console.error('Failed to create price rule:', error)
      toast.error('Fiyat kuralı oluşturulurken hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRule = (rule: PriceRule) => {
    setSelectedRule(rule)
    setShowEditRuleDialog(true)
  }

  const handleUpdateRule = async (data: any) => {
    if (!selectedRule) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/price-rules/${selectedRule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Fiyat kuralı başarıyla güncellendi!')
        setShowEditRuleDialog(false)
        setSelectedRule(null)
        fetchPriceRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Fiyat kuralı güncellenemedi')
      }
    } catch (error) {
      console.error('Failed to update price rule:', error)
      toast.error('Fiyat kuralı güncellenirken hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRule = (rule: PriceRule) => {
    setSelectedRule(rule)
    setShowDeleteRuleDialog(true)
  }

  const confirmDeleteRule = async () => {
    if (!selectedRule) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/price-rules/${selectedRule.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Fiyat kuralı başarıyla silindi!')
        setShowDeleteRuleDialog(false)
        setSelectedRule(null)
        fetchPriceRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Fiyat kuralı silinemedi')
      }
    } catch (error) {
      console.error('Failed to delete price rule:', error)
      toast.error('Fiyat kuralı silinirken hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string | boolean) => {
    switch (status) {
      case 'connected':
      case 'passed':
      case true:
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'critical':
      case 'error':
      case false:
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getRuleDescription = (rule: PriceRule) => {
    switch (rule.type) {
      case 'MIN_NIGHTS':
        return `Minimum ${rule.amountValue} gece kalış zorunlu`
      case 'WEEKEND':
        return `Hafta sonu - ${rule.amountType === 'PERCENT' ? '%' : '₺'}${rule.amountValue} ${rule.amountType === 'PERCENT' ? 'artış' : 'ek ücret'}`
      case 'SEASON':
        return `Sezon fiyatlandırması - ${rule.amountType === 'PERCENT' ? '%' : '₺'}${rule.amountValue} ${rule.amountType === 'PERCENT' ? 'artış' : 'ek ücret'}`
      case 'PER_PERSON':
        return `Kişi başı ₺${rule.amountValue} ek ücret`
      case 'HOLIDAY':
        return `Tatil günleri - ${rule.amountType === 'PERCENT' ? '%' : '₺'}${rule.amountValue} ${rule.amountType === 'PERCENT' ? 'artış' : 'ek ücret'}`
      case 'CUSTOM':
        return `Özel kural - ${rule.amountType === 'PERCENT' ? '%' : '₺'}${rule.amountValue}`
      default:
        return rule.name
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchPriceRules()
    fetchSystemSettings()
    fetchSystemInfo()
    fetchUsers()
  }, [session, status, router])

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Yükleniyor...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sistem Ayarları</h1>
          <p className="text-gray-600">Sistem yapılandırması ve yönetimi</p>
        </div>
        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="system">Sistem Ayarları</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="pricing">Fiyat Kuralları</TabsTrigger>
            <TabsTrigger value="email">E-posta</TabsTrigger>
            <TabsTrigger value="security">Güvenlik</TabsTrigger>
            <TabsTrigger value="maintenance">Bakım</TabsTrigger>
          </TabsList>

          {/* System Settings Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Genel Ayarlar
                  </CardTitle>
                  <CardDescription>
                    Sistem genelinde geçerli olan temel ayarlar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Company Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">Şirket Bilgileri</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Şirket Adı</Label>
                        <Input
                          id="companyName"
                          value={systemSettings.companyName || ''}
                          onChange={(e) => updateSystemSetting('companyName', e.target.value)}
                          placeholder="BungApp"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyEmail">E-posta</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          value={systemSettings.companyEmail || ''}
                          onChange={(e) => updateSystemSetting('companyEmail', e.target.value)}
                          placeholder="info@bungapp.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyPhone">Telefon</Label>
                        <Input
                          id="companyPhone"
                          value={systemSettings.companyPhone || ''}
                          onChange={(e) => updateSystemSetting('companyPhone', e.target.value)}
                          placeholder="+90 555 123 45 67"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyAddress">Adres</Label>
                      <Textarea
                        id="companyAddress"
                        value={systemSettings.companyAddress || ''}
                        onChange={(e) => updateSystemSetting('companyAddress', e.target.value)}
                        placeholder="Şirket adresi"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* VAT Settings */}
                  <div className="space-y-4 border-t pt-6">
                    <h4 className="text-sm font-medium text-gray-900">KDV Ayarları</h4>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label>Varsayılan Fiyat Durumu</Label>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="pricesIncludeVat-true"
                              name="pricesIncludeVat"
                              checked={systemSettings.pricesIncludeVat === true}
                              onChange={() => updateSystemSetting('pricesIncludeVat', true)}
                              className="rounded"
                            />
                            <Label htmlFor="pricesIncludeVat-true" className="text-sm font-normal">
                              Fiyatlar KDV Dahil
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="pricesIncludeVat-false"
                              name="pricesIncludeVat"
                              checked={systemSettings.pricesIncludeVat === false}
                              onChange={() => updateSystemSetting('pricesIncludeVat', false)}
                              className="rounded"
                            />
                            <Label htmlFor="pricesIncludeVat-false" className="text-sm font-normal">
                              Fiyatlar KDV Hariç
                            </Label>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Yeni bungalovlar için varsayılan KDV durumu. Mevcut bungalovları etkilemez.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vatRate">KDV Oranı (%)</Label>
                        <Input
                          id="vatRate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={systemSettings.vatRate || 20}
                          onChange={(e) => updateSystemSetting('vatRate', parseFloat(e.target.value) || 0)}
                          placeholder="20"
                        />
                        <p className="text-xs text-gray-500">
                          Hesaplamalarda kullanılacak KDV oranı
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-6 border-t">
                    <Button 
                      onClick={handleSaveSystemSettings}
                      disabled={isSavingSettings || isLoadingSettings}
                    >
                      {isSavingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Kullanıcı Yönetimi
                </CardTitle>
                <CardDescription>
                  Sistem kullanıcılarını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Kullanıcılar</h3>
                    <Button onClick={() => setShowUserDialog(true)}>
                      <Users className="mr-2 h-4 w-4" />
                      Yeni Kullanıcı
                    </Button>
                  </div>
                  
                  {isLoadingUsers ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Kullanıcılar yükleniyor...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p>Henüz kullanıcı bulunmuyor</p>
                        </div>
                      ) : (
                        users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <p className="text-xs text-gray-400">
                                Oluşturulma: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'ADMIN' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role === 'ADMIN' ? 'ADMIN' : 'RESEPSIYONIST'}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowEditUserDialog(true)
                                }}
                              >
                                Düzenle
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowDeleteUserDialog(true)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                Sil
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Fiyat Kuralları
                </CardTitle>
                <CardDescription>
                  Fiyatlandırma kurallarını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Fiyat Kuralları</h3>
                    <Dialog open={showNewRuleDialog} onOpenChange={setShowNewRuleDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Yeni Kural
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Yeni Fiyat Kuralı</DialogTitle>
                          <DialogDescription>
                            Yeni bir fiyatlandırma kuralı oluşturun
                          </DialogDescription>
                        </DialogHeader>
                        <PriceRuleForm 
                          onSubmit={handleCreateRule}
                          onCancel={() => setShowNewRuleDialog(false)}
                          isSubmitting={isSubmitting}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="space-y-2">
                    {priceRules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-gray-500">
                            {getRuleDescription(rule)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            AKTIF
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Düzenle
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteRule(rule)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Sil
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {priceRules.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Henüz fiyat kuralı bulunmuyor. Yeni bir kural oluşturun.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Rule Dialog */}
            <Dialog open={showEditRuleDialog} onOpenChange={setShowEditRuleDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Fiyat Kuralını Düzenle</DialogTitle>
                  <DialogDescription>
                    Fiyat kuralını güncelleyin
                  </DialogDescription>
                </DialogHeader>
                {selectedRule && (
                  <PriceRuleForm 
                    rule={selectedRule}
                    onSubmit={handleUpdateRule}
                    onCancel={() => setShowEditRuleDialog(false)}
                    isSubmitting={isSubmitting}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Rule Dialog */}
            <Dialog open={showDeleteRuleDialog} onOpenChange={setShowDeleteRuleDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                    Fiyat Kuralını Sil
                  </DialogTitle>
                  <DialogDescription>
                    <strong>{selectedRule?.name}</strong> kuralını silmek istediğinizden emin misiniz? 
                    Bu işlem geri alınamaz.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteRuleDialog(false)}
                    disabled={isSubmitting}
                  >
                    İptal
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={confirmDeleteRule}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Siliniyor...' : 'Evet, Sil'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  E-posta Ayarları
                </CardTitle>
                <CardDescription>
                  E-posta yapılandırması ve şablonları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">SMTP Ayarları</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input id="smtpHost" defaultValue="smtp.gmail.com" />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort">Port</Label>
                        <Input id="smtpPort" defaultValue="587" />
                      </div>
                      <div>
                        <Label htmlFor="smtpUser">Kullanıcı Adı</Label>
                        <Input id="smtpUser" defaultValue="your-email@gmail.com" />
                      </div>
                      <div>
                        <Label htmlFor="smtpPass">Şifre</Label>
                        <Input id="smtpPass" type="password" />
                      </div>
                    </div>
                    <Button>SMTP Bağlantısını Test Et</Button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">E-posta Şablonları</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Rezervasyon Onayı</p>
                          <p className="text-sm text-gray-500">Rezervasyon onay e-postası şablonu</p>
                        </div>
                        <Button variant="outline" size="sm">Düzenle</Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Giriş Hatırlatması</p>
                          <p className="text-sm text-gray-500">Giriş günü hatırlatma e-postası</p>
                        </div>
                        <Button variant="outline" size="sm">Düzenle</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Güvenlik Ayarları
                </CardTitle>
                <CardDescription>
                  Sistem güvenlik yapılandırması
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Oturum Ayarları</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sessionTimeout">Oturum Zaman Aşımı (dakika)</Label>
                        <Input id="sessionTimeout" defaultValue="30" />
                      </div>
                      <div>
                        <Label htmlFor="maxLoginAttempts">Maksimum Giriş Denemesi</Label>
                        <Input id="maxLoginAttempts" defaultValue="5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Şifre Politikası</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="requireUppercase" defaultChecked />
                        <Label htmlFor="requireUppercase">Büyük harf zorunlu</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="requireLowercase" defaultChecked />
                        <Label htmlFor="requireLowercase">Küçük harf zorunlu</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="requireNumbers" defaultChecked />
                        <Label htmlFor="requireNumbers">Rakam zorunlu</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="requireSpecialChars" defaultChecked />
                        <Label htmlFor="requireSpecialChars">Özel karakter zorunlu</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Güvenlik Başlıkları</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="enableCSP" defaultChecked />
                        <Label htmlFor="enableCSP">Content Security Policy (CSP)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="enableHSTS" defaultChecked />
                        <Label htmlFor="enableHSTS">HTTP Strict Transport Security (HSTS)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="enableXFrameOptions" defaultChecked />
                        <Label htmlFor="enableXFrameOptions">X-Frame-Options</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <div className="space-y-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Database className="mr-2 h-5 w-5" />
                        Sistem Durumu
                      </CardTitle>
                      <CardDescription>
                        Sistem bileşenlerinin anlık durumu
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchSystemInfo}
                      disabled={isLoadingSystemInfo}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingSystemInfo ? 'animate-spin' : ''}`} />
                      Yenile
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSystemInfo ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      <span>Sistem bilgileri yükleniyor...</span>
                    </div>
                  ) : systemInfo ? (
                    <div className="space-y-6">
                      {/* Service Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(systemInfo.services.database.connected)}
                            <span className="font-medium">Veritabanı</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {systemInfo.services.database.connected ? 'Bağlantı başarılı' : 'Bağlantı hatası'}
                          </p>
                          {systemInfo.services.database.recordsCount && (
                            <p className="text-xs text-gray-400 mt-1">
                              {Object.values(systemInfo.services.database.recordsCount as Record<string, number>).reduce((a: number, b: number) => a + b, 0)} kayıt
                            </p>
                          )}
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(systemInfo.services.redis.connected)}
                            <span className="font-medium">Redis</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {systemInfo.services.redis.connected ? 'Bağlantı başarılı' : 'Bağlantı hatası'}
                          </p>
                          {systemInfo.services.redis.keyCount !== undefined && (
                            <p className="text-xs text-gray-400 mt-1">
                              {systemInfo.services.redis.keyCount} anahtar
                            </p>
                          )}
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(systemInfo.services.email.configured)}
                            <span className="font-medium">E-posta</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {systemInfo.services.email.configured ? 'Yapılandırılmış' : 'Yapılandırılmamış'}
                          </p>
                          {systemInfo.services.email.host && (
                            <p className="text-xs text-gray-400 mt-1">
                              {systemInfo.services.email.host}:{systemInfo.services.email.port}
                            </p>
                          )}
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(systemInfo.services.storage.configured)}
                            <span className="font-medium">Depolama</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {systemInfo.services.storage.configured ? 'Yapılandırılmış' : 'Yapılandırılmamış'}
                          </p>
                          {systemInfo.services.storage.bucket && (
                            <p className="text-xs text-gray-400 mt-1">
                              {systemInfo.services.storage.bucket}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Resource Usage */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Cpu className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">CPU</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {systemInfo.resources.cpu.usage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500">
                            {systemInfo.resources.cpu.count} çekirdek
                          </p>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <MemoryStick className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Bellek</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {systemInfo.resources.memory.usage}%
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatBytes(systemInfo.resources.memory.used)} / {formatBytes(systemInfo.resources.memory.total)}
                          </p>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <HardDrive className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">Disk</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {systemInfo.resources.disk.error ? 'N/A' : 
                             ((systemInfo.resources.disk.used / systemInfo.resources.disk.total) * 100).toFixed(1) + '%'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {systemInfo.resources.disk.error ? 'Bilgi alınamadı' :
                             `${formatBytes(systemInfo.resources.disk.free)} boş`}
                          </p>
                        </div>
                      </div>

                      {/* System Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Sistem Bilgileri</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Uygulama</span>
                              <span className="font-mono">{systemInfo.application.name} v{systemInfo.application.version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Node.js</span>
                              <span className="font-mono">{systemInfo.system.nodeVersion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Platform</span>
                              <span className="font-mono">{systemInfo.system.platform} {systemInfo.system.arch}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hostname</span>
                              <span className="font-mono">{systemInfo.system.hostname}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Next.js</span>
                              <span className="font-mono">{systemInfo.application.dependencies.next}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>React</span>
                              <span className="font-mono">{systemInfo.application.dependencies.react}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Prisma</span>
                              <span className="font-mono">{systemInfo.application.dependencies.prisma}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Uptime</span>
                              <span className="font-mono">{Math.floor(systemInfo.system.uptime / 3600)}h {Math.floor((systemInfo.system.uptime % 3600) / 60)}m</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Sistem bilgileri yüklenemedi. Yenile butonunu deneyin.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Bakım İşlemleri
                  </CardTitle>
                  <CardDescription>
                    Sistem bakım ve yönetim işlemleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Veritabanı</h4>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleBackupDatabase}
                        disabled={isBackingUp}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        {isBackingUp ? 'Yedekleniyor...' : 'Veritabanı Yedekle'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        Veritabanının tam yedeğini oluşturur
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Cache</h4>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleClearCache('all')}
                          disabled={isClearingCache}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {isClearingCache ? 'Temizleniyor...' : 'Tüm Cache Temizle'}
                        </Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleClearCache('reservations')}
                            disabled={isClearingCache}
                          >
                            Rezervasyon
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleClearCache('bungalows')}
                            disabled={isClearingCache}
                          >
                            Bungalov
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Redis cache verilerini temizler
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Güvenlik</h4>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleSecurityScan}
                        disabled={isScanning}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {isScanning ? 'Taranıyor...' : 'Güvenlik Taraması'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        Sistem güvenlik açıklarını tarar
                      </p>
                    </div>
                  </div>

                  {/* Security Scan Results */}
                  {scanResults && (
                    <div className="mt-6 p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium flex items-center">
                          {getStatusIcon(scanResults.status)}
                          <span className="ml-2">Güvenlik Taraması Sonuçları</span>
                        </h4>
                        <span className="text-sm text-gray-500">
                          {new Date(scanResults.timestamp).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{scanResults.summary.totalChecks}</div>
                          <div className="text-sm text-gray-500">Toplam</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{scanResults.summary.passed}</div>
                          <div className="text-sm text-gray-500">Başarılı</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{scanResults.summary.warnings}</div>
                          <div className="text-sm text-gray-500">Uyarı</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{scanResults.summary.critical}</div>
                          <div className="text-sm text-gray-500">Kritik</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {scanResults.checks.map((check: any, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 border rounded">
                            {getStatusIcon(check.status)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{check.name}</span>
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                  {check.category}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                              {check.details.length > 0 && (
                                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                                  {check.details.map((detail: string, i: number) => (
                                    <li key={i}>• {detail}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Kullanıcı Ekleme Dialog'u */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı</DialogTitle>
            <DialogDescription>
              Sisteme yeni kullanıcı ekleyin
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            onSubmit={handleCreateUser}
            isSubmitting={isSavingUser}
            onCancel={() => setShowUserDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Düzenleme Dialog'u */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            user={selectedUser}
            onSubmit={handleUpdateUser}
            isSubmitting={isSavingUser}
            onCancel={() => {
              setShowEditUserDialog(false)
              setSelectedUser(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Silme Dialog'u */}
      <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Sil</DialogTitle>
            <DialogDescription>
              Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) kullanıcısı silinecek.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteUserDialog(false)
                setSelectedUser(null)
              }}
            >
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

// PriceRuleForm Component
interface PriceRuleFormProps {
  rule?: PriceRule
  onSubmit: (data: any) => void
  onCancel: () => void
  isSubmitting: boolean
}

function PriceRuleForm({ rule, onSubmit, onCancel, isSubmitting }: PriceRuleFormProps) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    type: rule?.type || 'MIN_NIGHTS',
    amountType: rule?.amountType || 'FIXED',
    amountValue: rule?.amountValue || 0,
    appliesTo: rule?.appliesTo || 'GLOBAL',
    bungalowId: rule?.bungalowId || '',
    dateStart: rule?.dateStart ? new Date(rule.dateStart).toISOString().split('T')[0] : '',
    dateEnd: rule?.dateEnd ? new Date(rule.dateEnd).toISOString().split('T')[0] : '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name || !formData.type || !formData.amountType || formData.amountValue === undefined) {
      toast.error('Lütfen tüm gerekli alanları doldurun')
      return
    }

    onSubmit({
      ...formData,
      amountValue: Number(formData.amountValue),
      dateStart: formData.dateStart || null,
      dateEnd: formData.dateEnd || null,
      bungalowId: formData.appliesTo === 'BUNGALOW' ? formData.bungalowId : null,
    })
  }

  const typeOptions = [
    { value: 'MIN_NIGHTS', label: 'Minimum Gece' },
    { value: 'WEEKEND', label: 'Hafta Sonu' },
    { value: 'SEASON', label: 'Sezon' },
    { value: 'HOLIDAY', label: 'Tatil' },
    { value: 'PER_PERSON', label: 'Kişi Başı' },
    { value: 'CUSTOM', label: 'Özel' },
  ]

  const amountTypeOptions = [
    { value: 'FIXED', label: 'Sabit Tutar' },
    { value: 'PERCENT', label: 'Yüzde' },
    { value: 'PER_PERSON', label: 'Kişi Başı' },
    { value: 'NIGHTLY', label: 'Gecelik' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Kural Adı *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Örn: Minimum 3 Gece Kalış"
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Kural Tipi *</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData({ ...formData, type: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amountType">Tutar Tipi *</Label>
          <Select 
            value={formData.amountType} 
            onValueChange={(value) => setFormData({ ...formData, amountType: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {amountTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amountValue">
            Değer * {formData.amountType === 'PERCENT' ? '(%)' : '(₺)'}
          </Label>
          <Input
            id="amountValue"
            type="number"
            min="0"
            step={formData.amountType === 'PERCENT' ? '0.1' : '1'}
            value={formData.amountValue}
            onChange={(e) => setFormData({ ...formData, amountValue: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="appliesTo">Uygulama Alanı *</Label>
        <Select 
          value={formData.appliesTo} 
          onValueChange={(value) => setFormData({ ...formData, appliesTo: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GLOBAL">Tüm Bungalovlar</SelectItem>
            <SelectItem value="BUNGALOW">Belirli Bungalov</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type === 'SEASON' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateStart">Başlangıç Tarihi</Label>
            <Input
              id="dateStart"
              type="date"
              value={formData.dateStart}
              onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="dateEnd">Bitiş Tarihi</Label>
            <Input
              id="dateEnd"
              type="date"
              value={formData.dateEnd}
              onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor...' : rule ? 'Güncelle' : 'Oluştur'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Kullanıcı Form Komponenti
function UserForm({ 
  user, 
  onSubmit, 
  isSubmitting, 
  onCancel 
}: { 
  user?: any
  onSubmit: (data: any) => void
  isSubmitting: boolean
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'RESEPSIYONIST'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toast.error('Ad soyad ve e-posta alanları zorunludur')
      return
    }

    if (!user && !formData.password) {
      toast.error('Şifre alanı zorunludur')
      return
    }

    if (formData.password && formData.password.trim() !== '' && formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }

    // Boş şifre alanını temizle
    const submitData = {
      ...formData,
      password: formData.password.trim() === '' ? undefined : formData.password
    }
    
    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Ad Soyad *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Kullanıcı adı soyadı"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-posta *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="ornek@email.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Şifre {!user && '*'}
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          placeholder={user ? 'Yeni şifre (boş bırakırsanız değişmez)' : 'Şifre'}
          required={!user}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rol *</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Rol seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="RESEPSIYONIST">Resepsiyonist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor...' : (user ? 'Güncelle' : 'Oluştur')}
        </Button>
      </DialogFooter>
    </form>
  )
}