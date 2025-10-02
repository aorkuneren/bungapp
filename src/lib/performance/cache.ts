// Performance cache utilities
import { NextRequest, NextResponse } from 'next/server'

export interface CacheConfig {
  maxAge?: number
  staleWhileRevalidate?: number
  mustRevalidate?: boolean
}

export function setCacheHeaders(
  response: NextResponse,
  config: CacheConfig = {}
): NextResponse {
  const {
    maxAge = 60, // 1 minute default
    staleWhileRevalidate = 300, // 5 minutes default
    mustRevalidate = false
  } = config

  if (process.env.NODE_ENV === 'production') {
    const cacheControl = [
      `max-age=${maxAge}`,
      `s-maxage=${maxAge}`,
      `stale-while-revalidate=${staleWhileRevalidate}`,
      mustRevalidate ? 'must-revalidate' : 'public'
    ].join(', ')

    response.headers.set('Cache-Control', cacheControl)
  } else {
    // Development mode - no cache
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  return response
}

export function createCachedResponse(
  data: any,
  config: CacheConfig = {}
): NextResponse {
  const response = NextResponse.json(data)
  return setCacheHeaders(response, config)
}

// Memory cache for development
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key)
  if (!cached) return null

  const now = Date.now()
  if (now > cached.timestamp + cached.ttl) {
    memoryCache.delete(key)
    return null
  }

  return cached.data as T
}

export function setInMemoryCache<T>(key: string, data: T, ttlMs: number = 60000): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  })
}

export function clearMemoryCache(): void {
  memoryCache.clear()
}
