'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { Plus, Edit, Eye, Home, Search, Filter, Grid3X3, List, Check, X, Settings } from 'lucide-react'
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
  status: 'ACTIVE' | 'PASSIVE'
  features: Record<string, any>
  createdAt: Date
  updatedAt: Date
  images?: any[]
  _count?: { reservations: number }
}

export default function BungalowsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bungalows, setBungalows] = useState<Bungalow[]>([])
  const [filteredBungalows, setFilteredBungalows] = useState<Bungalow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [capacityFilter, setCapacityFilter] = useState<string>('all')
  const [priceSort, setPriceSort] = useState<string>('none')
  
  // Görünüm ve seçim state'leri
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedBungalows, setSelectedBungalows] = useState<string[]>([])
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [bulkUpdateData, setBulkUpdateData] = useState({
    priceIncludesVat: 'no-change',
    status: 'no-change'
  })
  const [individualPrices, setIndividualPrices] = useState<Record<string, string>>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Helper function to safely get price value
  const getPrice = (basePrice: number): number => {
    return basePrice
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    fetchBungalows()
  }, [])

  useEffect(() => {
    filterAndSortBungalows()
  }, [bungalows, searchTerm, statusFilter, capacityFilter, priceSort])

  const fetchBungalows = async () => {
    try {
      const response = await fetch('/api/bungalows')
      if (response.ok) {
        const data = await response.json()
        setBungalows(data)
      }
    } catch (error) {
      console.error('Error fetching bungalows:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortBungalows = () => {
    let filtered = [...bungalows]

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(bungalow =>
        bungalow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bungalow.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bungalow => bungalow.status === statusFilter)
    }

    // Kapasite filtresi
    if (capacityFilter !== 'all') {
      const capacity = parseInt(capacityFilter)
      filtered = filtered.filter(bungalow => bungalow.capacity === capacity)
    }

    // Fiyat sıralaması
    if (priceSort === 'asc') {
      filtered.sort((a, b) => getPrice(a.basePrice) - getPrice(b.basePrice))
    } else if (priceSort === 'desc') {
      filtered.sort((a, b) => getPrice(b.basePrice) - getPrice(a.basePrice))
    }

    setFilteredBungalows(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setCapacityFilter('all')
    setPriceSort('none')
  }

  // Seçim fonksiyonları
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBungalows(filteredBungalows.map(b => b.id))
    } else {
      setSelectedBungalows([])
    }
  }

  const handleSelectBungalow = (bungalowId: string, checked: boolean) => {
    if (checked) {
      setSelectedBungalows(prev => [...prev, bungalowId])
    } else {
      setSelectedBungalows(prev => prev.filter(id => id !== bungalowId))
    }
  }

  // Toplu güncelleme fonksiyonu
  const handleBulkUpdate = async () => {
    if (selectedBungalows.length === 0) {
      toast.error('Lütfen güncellenecek bungalovları seçin')
      return
    }

    // Ortak güncellemeler
    const commonUpdates: Record<string, any> = {}
    
    if (bulkUpdateData.priceIncludesVat && bulkUpdateData.priceIncludesVat !== 'no-change') {
      commonUpdates.priceIncludesVat = bulkUpdateData.priceIncludesVat === 'true'
    }
    
    if (bulkUpdateData.status && bulkUpdateData.status !== 'no-change') {
      commonUpdates.status = bulkUpdateData.status
    }

    // Tekli fiyat güncellemeleri var mı kontrol et
    const hasIndividualPrices = Object.keys(individualPrices).some(id => 
      selectedBungalows.includes(id) && individualPrices[id]
    )

    if (Object.keys(commonUpdates).length === 0 && !hasIndividualPrices) {
      toast.error('Lütfen güncellenecek alanları doldurun')
      return
    }

    setIsUpdating(true)
    
    try {
      const promises = selectedBungalows.map(bungalowId => {
        const updateData = { ...commonUpdates }
        
        // Eğer bu bungalov için tekli fiyat girilmişse ekle
        if (individualPrices[bungalowId]) {
          updateData.basePrice = parseFloat(individualPrices[bungalowId])
        }

        return fetch(`/api/bungalows/${bungalowId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
      })

      const results = await Promise.all(promises)
      const failedUpdates = results.filter(r => !r.ok)

      if (failedUpdates.length === 0) {
        toast.success(`${selectedBungalows.length} bungalov başarıyla güncellendi`)
        fetchBungalows()
        setSelectedBungalows([])
        setShowBulkUpdate(false)
        setBulkUpdateData({
          priceIncludesVat: 'no-change',
          status: 'no-change'
        })
        setIndividualPrices({})
      } else {
        toast.error(`${failedUpdates.length} bungalov güncellenemedi`)
      }
    } catch (error) {
      console.error('Bulk update failed:', error)
      toast.error('Toplu güncelleme sırasında hata oluştu')
    } finally {
      setIsUpdating(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Yükleniyor...</div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bungalov Yönetimi</h1>
            <p className="text-gray-600">Bungalovları görüntüle, düzenle ve yönet</p>
            {selectedBungalows.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                {selectedBungalows.length} bungalov seçildi
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Görünüm Değiştirme */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Toplu Güncelleme */}
            {selectedBungalows.length > 0 && (
              <Dialog open={showBulkUpdate} onOpenChange={setShowBulkUpdate}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Toplu Güncelle ({selectedBungalows.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Toplu Güncelleme</DialogTitle>
                    <DialogDescription>
                      Seçilen {selectedBungalows.length} bungalov için güncellenecek alanları doldurun.
                      Boş bırakılan alanlar güncellenmeyecektir.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Tekli Fiyat Girişi</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-3">
                        {selectedBungalows.map(bungalowId => {
                          const bungalow = filteredBungalows.find(b => b.id === bungalowId)
                          if (!bungalow) return null
                          
                          return (
                            <div key={bungalowId} className="flex items-center justify-between space-x-3">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{bungalow.name}</div>
                                <div className="text-xs text-gray-500">
                                  Mevcut: ₺{getPrice(bungalow.basePrice).toLocaleString()}
                                </div>
                              </div>
                              <div className="w-32">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Yeni fiyat"
                                  value={individualPrices[bungalowId] || ''}
                                  onChange={(e) => setIndividualPrices(prev => ({
                                    ...prev,
                                    [bungalowId]: e.target.value
                                  }))}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Sadece değiştirmek istediğiniz bungalovlar için fiyat girin
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="bulkVat">KDV Durumu</Label>
                      <Select
                        value={bulkUpdateData.priceIncludesVat}
                        onValueChange={(value) => setBulkUpdateData(prev => ({
                          ...prev,
                          priceIncludesVat: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="KDV durumunu seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-change">Değiştirme</SelectItem>
                          <SelectItem value="true">KDV Dahil</SelectItem>
                          <SelectItem value="false">KDV Hariç</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bulkStatus">Durum</Label>
                      <Select
                        value={bulkUpdateData.status}
                        onValueChange={(value) => setBulkUpdateData(prev => ({
                          ...prev,
                          status: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-change">Değiştirme</SelectItem>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="PASSIVE">Pasif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkUpdate(false)}
                      disabled={isUpdating}
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleBulkUpdate}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Güncelleniyor...' : 'Güncelle'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button asChild>
              <Link href="/bungalows/new">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Bungalov
              </Link>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Search className="mr-2 h-5 w-5" />
              Arama ve Filtreler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Arama */}
              <div className="lg:col-span-2">
                <Input
                  placeholder="Bungalov adı veya açıklama ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Durum Filtresi */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="PASSIVE">Pasif</SelectItem>
                </SelectContent>
              </Select>

              {/* Kapasite Filtresi */}
              <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kapasite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kapasiteler</SelectItem>
                  <SelectItem value="2">2 Kişi</SelectItem>
                  <SelectItem value="3">3 Kişi</SelectItem>
                  <SelectItem value="4">4 Kişi</SelectItem>
                  <SelectItem value="6">6 Kişi</SelectItem>
                </SelectContent>
              </Select>

              {/* Fiyat Sıralaması */}
              <Select value={priceSort} onValueChange={setPriceSort}>
                <SelectTrigger>
                  <SelectValue placeholder="Fiyat Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sıralama Yok</SelectItem>
                  <SelectItem value="asc">Düşükten Yükseğe</SelectItem>
                  <SelectItem value="desc">Yüksekten Düşüğe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre Temizleme */}
            {(searchTerm || statusFilter !== 'all' || capacityFilter !== 'all' || priceSort !== 'none') && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {filteredBungalows.length} bungalov bulundu
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filtreleri Temizle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Bungalov</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bungalows.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Bungalov</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bungalows.filter(b => b.status === 'ACTIVE').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Fiyat</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₺{bungalows.length > 0 ? Math.round(bungalows.reduce((sum, b) => sum + getPrice(b.basePrice), 0) / bungalows.length).toLocaleString() : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bungalows Content */}
        {viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBungalows.map((bungalow) => (
              <Card key={bungalow.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{bungalow.name}</CardTitle>
                    <Checkbox
                      checked={selectedBungalows.includes(bungalow.id)}
                      onCheckedChange={(checked: boolean) => 
                        handleSelectBungalow(bungalow.id, checked)
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={bungalow.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {bungalow.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Kapasite:</span>
                    <span className="font-medium">{bungalow.capacity} kişi</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Gecelik fiyat:</span>
                    <div className="text-right">
                      <span className="font-medium">₺{getPrice(bungalow.basePrice).toLocaleString()}</span>
                      <div className="text-xs text-gray-500">
                        {bungalow.priceIncludesVat ? 'KDV Dahil' : 'KDV Hariç'}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/reservations/new?bungalow=${bungalow.id}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Rezervasyon
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/bungalows/${bungalow.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Düzenle
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredBungalows.length > 0 && 
                        selectedBungalows.length === filteredBungalows.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Bungalov</TableHead>
                  <TableHead>Kapasite</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>KDV</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Rezervasyon</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBungalows.map((bungalow) => (
                  <TableRow key={bungalow.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBungalows.includes(bungalow.id)}
                        onCheckedChange={(checked: boolean) => 
                          handleSelectBungalow(bungalow.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{bungalow.name}</div>
                        {bungalow.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {bungalow.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{bungalow.capacity} kişi</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">₺{getPrice(bungalow.basePrice).toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {bungalow.priceIncludesVat ? 'Dahil' : 'Hariç'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bungalow.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {bungalow.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {bungalow._count?.reservations || 0} rezervasyon
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/reservations/new?bungalow=${bungalow.id}`}>
                            <Plus className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/bungalows/${bungalow.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/bungalows/${bungalow.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {filteredBungalows.length === 0 && bungalows.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Arama sonucu bulunamadı</h3>
              <p className="text-gray-500 mb-4">Arama kriterlerinizi değiştirmeyi deneyin.</p>
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Filtreleri Temizle
              </Button>
            </CardContent>
          </Card>
        )}

        {bungalows.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz bungalov yok</h3>
              <p className="text-gray-500 mb-4">İlk bungalovunuzu oluşturmak için aşağıdaki butona tıklayın.</p>
              <Button asChild>
                <Link href="/bungalows/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Bungalov Oluştur
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
