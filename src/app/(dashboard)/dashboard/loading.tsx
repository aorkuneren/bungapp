import { PageLoadingSpinner } from '@/components/loading-spinner'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-16 w-full bg-white shadow flex items-center px-4 animate-pulse">
        <div className="w-32 h-8 bg-gray-200 rounded"></div>
        <div className="flex-1"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <PageLoadingSpinner />
        </div>
      </main>
    </div>
  )
}
