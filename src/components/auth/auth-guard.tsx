'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { PageLoadingSpinner } from '@/components/loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (requireAuth && !session) {
      // Redirect to login if not authenticated
      router.push('/login')
      return
    }

    if (!requireAuth && session) {
      // Redirect to dashboard if already authenticated
      router.push('/dashboard')
      return
    }
  }, [session, status, router, requireAuth])

  // Show loading spinner while checking authentication
  if (status === 'loading') {
    return <PageLoadingSpinner />
  }

  // If requireAuth is true and no session, don't render children
  if (requireAuth && !session) {
    return <PageLoadingSpinner />
  }

  // If requireAuth is false and has session, don't render children
  if (!requireAuth && session) {
    return <PageLoadingSpinner />
  }

  return <>{children}</>
}
