// Performance optimizations for the application

export const PERFORMANCE_CONFIG = {
  // API cache settings
  API_CACHE: {
    DASHBOARD: 'public, s-maxage=60, stale-while-revalidate=30',
    RESERVATIONS: 'public, s-maxage=30, stale-while-revalidate=15',
    BUNGALOWS: 'public, s-maxage=300, stale-while-revalidate=60',
  },
  
  // Database query limits
  DB_LIMITS: {
    DASHBOARD_RESERVATIONS: 50,
    RECENT_RESERVATIONS: 10,
    UPCOMING_RESERVATIONS: 20,
  },
  
  // Component optimization
  COMPONENT: {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
  },
  
  // Bundle optimization
  BUNDLE: {
    CHUNK_SIZE_LIMIT: 250000, // 250KB
    TREE_SHAKE: true,
  }
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Memory usage monitoring
export function logMemoryUsage(label: string) {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory
    console.log(`${label} - Memory:`, {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    })
  }
}
