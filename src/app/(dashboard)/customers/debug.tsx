'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  status: string
  totalSpent: number
  _count: {
    reservations: number
  }
}

export default function CustomersDebugPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        setError(`API Error: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Müşteri Yönetimi (Debug)</h1>
        
        {loading && <p>Yükleniyor...</p>}
        {error && <p className="text-red-600">Hata: {error}</p>}
        
        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Müşteriler ({customers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <p>Henüz müşteri yok</p>
              ) : (
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div key={customer.id} className="p-3 border rounded">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.email}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                      <div className="text-sm">
                        {customer._count.reservations} rezervasyon - 
                        ₺{customer.totalSpent.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <div className="mt-6">
          <Button onClick={fetchCustomers}>Yenile</Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
