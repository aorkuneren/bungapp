'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Search, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  TrendingUp,
  Ban,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

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
  _count: {
    reservations: number
  }
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/customers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        toast.error('Müşteriler yüklenemedi')
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      toast.error('Müşteriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [statusFilter, searchTerm])

  const handleCreateCustomer = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Lütfen zorunlu alanları doldurun')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Müşteri başarıyla oluşturuldu')
        setShowCreateDialog(false)
        setFormData({ name: '', email: '', phone: '', address: '', notes: '' })
        fetchCustomers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Müşteri oluşturulamadı')
      }
    } catch (error) {
      console.error('Failed to create customer:', error)
      toast.error('Müşteri oluşturulurken hata oluştu')
    } finally {
      setIsCreating(false)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: 'ACTIVE' | 'BANNED' | 'INACTIVE') => {
    if (selectedCustomers.length === 0) {
      toast.error('Lütfen müşteri seçin')
      return
    }

    setIsUpdating(true)
    try {
      const promises = selectedCustomers.map(customerId =>
        fetch(`/api/customers/${customerId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        })
      )

      const results = await Promise.all(promises)
      const failedUpdates = results.filter(r => !r.ok)

      if (failedUpdates.length === 0) {
        toast.success(`${selectedCustomers.length} müşteri durumu güncellendi`)
        setSelectedCustomers([])
        setShowBulkActions(false)
        fetchCustomers()
      } else {
        toast.error(`${failedUpdates.length} müşteri güncellenemedi`)
      }
    } catch (error) {
      console.error('Bulk update failed:', error)
      toast.error('Toplu güncelleme sırasında hata oluştu')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(customers.map(c => c.id))
    } else {
      setSelectedCustomers([])
    }
  }

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId])
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId))
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Müşteriler yükleniyor...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Müşteri Yönetimi</h1>
              <p className="text-gray-600 mt-2">Müşterilerinizi yönetin ve rezervasyon geçmişlerini görüntüleyin</p>
            </div>
            
            <div className="flex space-x-3">
              {selectedCustomers.length > 0 && (
                <Dialog open={showBulkActions} onOpenChange={setShowBulkActions}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      Toplu İşlem ({selectedCustomers.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Toplu İşlem</DialogTitle>
                      <DialogDescription>
                        Seçilen {selectedCustomers.length} müşteri için yapmak istediğiniz işlemi seçin.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleBulkStatusUpdate('ACTIVE')}
                        disabled={isUpdating}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Aktif Yap
                      </Button>
                      <Button
                        onClick={() => handleBulkStatusUpdate('BANNED')}
                        disabled={isUpdating}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Banla
                      </Button>
                      <Button
                        onClick={() => handleBulkStatusUpdate('INACTIVE')}
                        disabled={isUpdating}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Pasif Yap
                      </Button>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowBulkActions(false)}
                        disabled={isUpdating}
                      >
                        İptal
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Müşteri
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
                    <DialogDescription>
                      Yeni müşteri bilgilerini girin.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Ad Soyad *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Müşteri adı soyadı"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">E-posta *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="ornek@email.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefon *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="0555 123 45 67"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Adres</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Müşteri adresi"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Notlar</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Müşteri hakkında notlar..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      disabled={isCreating}
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleCreateCustomer}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Müşteri ara (ad, e-posta, telefon)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="BANNED">Banlı</SelectItem>
                <SelectItem value="INACTIVE">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Müşteri</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Müşteri</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {customers.filter(c => c.status === 'ACTIVE').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Banlı Müşteri</CardTitle>
                <Ban className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {customers.filter(c => c.status === 'BANNED').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Harcama</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₺{customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Müşteriler</CardTitle>
              <CardDescription>
                Tüm müşterilerinizi görüntüleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCustomers.length === customers.length && customers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Rezervasyon</TableHead>
                    <TableHead>Toplam Harcama</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.address && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {customer.address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-2 text-gray-400" />
                            {customer.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-gray-400" />
                            {customer.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(customer.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{customer._count.reservations} rezervasyon</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₺{customer.totalSpent.toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(customer.createdAt), 'dd MMM yyyy', { locale: tr })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/customers/${customer.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/customers/${customer.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {customers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Müşteri bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Arama kriterlerinize uygun müşteri bulunamadı.'
                      : 'Henüz hiç müşteri eklenmemiş.'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
