import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Redis from 'ioredis'

// Initialize Redis client
let redis: Redis | null = null

function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
  }
  return redis
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cacheType = searchParams.get('type') || 'all'

    const redisClient = getRedisClient()
    
    if (!redisClient) {
      return NextResponse.json(
        { error: 'Redis bağlantısı bulunamadı' },
        { status: 500 }
      )
    }

    let deletedKeys = 0
    let patterns: string[] = []

    switch (cacheType) {
      case 'reservations':
        patterns = ['reservation:*', 'availability:*', 'quote:*']
        break
      case 'bungalows':
        patterns = ['bungalow:*', 'bungalows:*']
        break
      case 'reports':
        patterns = ['report:*', 'analytics:*']
        break
      case 'sessions':
        patterns = ['session:*', 'user:*']
        break
      case 'pricing':
        patterns = ['price:*', 'pricing:*', 'rules:*']
        break
      case 'all':
      default:
        patterns = ['*']
        break
    }

    try {
      await redisClient.connect()

      for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern)
        
        if (keys.length > 0) {
          const result = await redisClient.del(...keys)
          deletedKeys += result
        }
      }

      // Also clear Next.js cache if available
      if (cacheType === 'all' || cacheType === 'nextjs') {
        try {
          // Clear revalidation cache
          const { revalidatePath, revalidateTag } = await import('next/cache')
          
          // Revalidate common paths
          const pathsToRevalidate = [
            '/',
            '/dashboard',
            '/bungalows',
            '/reservations',
            '/reports',
            '/settings'
          ]

          for (const path of pathsToRevalidate) {
            try {
              revalidatePath(path)
            } catch (e) {
              // Ignore revalidation errors
            }
          }

          // Revalidate common tags
          const tagsToRevalidate = [
            'bungalows',
            'reservations',
            'users',
            'reports',
            'settings'
          ]

          for (const tag of tagsToRevalidate) {
            try {
              revalidateTag(tag)
            } catch (e) {
              // Ignore revalidation errors
            }
          }
        } catch (e) {
          // Next.js cache clearing is optional
          console.warn('Next.js cache clearing failed:', e)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cache başarıyla temizlendi`,
        deletedKeys,
        cacheType,
        timestamp: new Date().toISOString()
      })

    } catch (redisError: any) {
      console.error('Redis cache clear error:', redisError)
      return NextResponse.json(
        { 
          error: 'Cache temizlenirken hata oluştu',
          details: redisError.message 
        },
        { status: 500 }
      )
    } finally {
      try {
        await redisClient.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
    }

  } catch (error: any) {
    console.error('Cache clear error:', error)
    return NextResponse.json(
      { 
        error: 'Cache temizlenirken hata oluştu',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    const redisClient = getRedisClient()
    
    if (!redisClient) {
      return NextResponse.json({
        connected: false,
        error: 'Redis bağlantısı bulunamadı',
        message: 'Redis URL tanımlanmamış veya Redis servisi mevcut değil'
      }, { status: 200 }) // 200 olarak döndür, 500 değil
    }

    try {
      await redisClient.connect()

      // Get cache statistics
      const info = await redisClient.info('memory')
      const keyCount = await redisClient.dbsize()
      
      // Parse memory info
      const memoryLines = info.split('\r\n')
      const memoryStats: Record<string, string> = {}
      
      memoryLines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':')
          memoryStats[key] = value
        }
      })

      // Get sample keys by pattern
      const patterns = [
        'reservation:*',
        'bungalow:*', 
        'report:*',
        'session:*',
        'price:*'
      ]

      const keysByPattern: Record<string, number> = {}
      
      for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern)
        const patternName = pattern.replace(':*', '')
        keysByPattern[patternName] = keys.length
      }

      return NextResponse.json({
        connected: true,
        totalKeys: keyCount,
        memoryUsed: memoryStats.used_memory_human || 'N/A',
        memoryPeak: memoryStats.used_memory_peak_human || 'N/A',
        keysByPattern,
        timestamp: new Date().toISOString()
      })

    } catch (redisError: any) {
      return NextResponse.json({
        connected: false,
        error: redisError.message
      })
    } finally {
      try {
        await redisClient.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
    }

  } catch (error: any) {
    console.error('Cache info error:', error)
    return NextResponse.json(
      { 
        error: 'Cache bilgileri alınırken hata oluştu',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
