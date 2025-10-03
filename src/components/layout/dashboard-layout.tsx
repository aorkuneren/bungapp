import { Header } from './header'
import ErrorBoundary from '@/components/error-boundary'
import { AuthGuard } from '@/components/auth/auth-guard'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <ErrorBoundary>
          <main>{children}</main>
        </ErrorBoundary>
      </div>
    </AuthGuard>
  )
}
