import { Header } from './header'
import ErrorBoundary from '@/components/error-boundary'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ErrorBoundary>
        <main>{children}</main>
      </ErrorBoundary>
    </div>
  )
}
