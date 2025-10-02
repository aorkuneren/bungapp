'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { User } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true)
    
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Giriş başarısız. E-posta veya şifre hatalı.')
      } else {
        toast.success('Giriş başarılı!')
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async (email: string, password: string) => {
    setIsLoading(true)
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Giriş başarısız. E-posta veya şifre hatalı.')
      } else {
        toast.success('Giriş başarılı!')
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            BungApp
          </CardTitle>
          <CardDescription className="text-center">
            Rezervasyon yönetim sistemine giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>

          {/* Quick Login Buttons */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Hızlı Giriş</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickLogin('admin@bungapp.com', 'admin123')}
                disabled={isLoading}
              >
                <User className="mr-2 h-4 w-4" />
                Admin olarak devam et
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickLogin('receptionist@bungapp.com', 'receptionist123')}
                disabled={isLoading}
              >
                <User className="mr-2 h-4 w-4" />
                Resepsiyonist olarak devam et
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
