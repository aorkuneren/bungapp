import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import Redis from 'ioredis'
import os from 'os'
import fs from 'fs/promises'
import path from 'path'

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    // System Information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      hostname: os.hostname()
    }

    // Application Information
    let packageInfo = {}
    try {
      const packagePath = path.join(process.cwd(), 'package.json')
      const packageContent = await fs.readFile(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      
      packageInfo = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        dependencies: {
          next: packageJson.dependencies?.next,
          react: packageJson.dependencies?.react,
          prisma: packageJson.dependencies?.prisma,
          redis: packageJson.dependencies?.ioredis || packageJson.dependencies?.redis
        }
      }
    } catch (error) {
      console.warn('Could not read package.json:', error)
    }

    // Database Status
    let databaseStatus = {
      connected: false,
      version: null,
      tablesCount: 0,
      recordsCount: {},
      error: null
    }

    try {
      // Test database connection
      await prisma.$connect()
      
      // Get database version
      const versionResult = await prisma.$queryRaw`SELECT version()` as any[]
      databaseStatus.version = versionResult[0]?.version || 'Unknown'
      
      // Get table counts
      const tables = [
        'User',
        'Bungalow', 
        'Reservation',
        'PriceRule',
        'AuditLog',
        'EmailLog'
      ]

      const recordsCount: Record<string, number> = {}
      
      for (const table of tables) {
        try {
          const count = await (prisma as any)[table.toLowerCase()].count()
          recordsCount[table] = count
        } catch (e) {
          recordsCount[table] = 0
        }
      }

      databaseStatus = {
        connected: true,
        version: databaseStatus.version,
        tablesCount: tables.length,
        recordsCount,
        error: null
      }

    } catch (error: any) {
      databaseStatus.error = error.message
    } finally {
      await prisma.$disconnect()
    }

    // Redis Status
    let redisStatus = {
      connected: false,
      version: null as string | null,
      memoryUsed: null as string | null,
      keyCount: 0,
      error: null as string | null
    }

    const redisClient = getRedisClient()
    if (redisClient) {
      try {
        await redisClient.connect()
        
        const info = await redisClient.info('server')
        const memoryInfo = await redisClient.info('memory')
        const keyCount = await redisClient.dbsize()
        
        // Parse Redis version
        const versionMatch = info.match(/redis_version:([^\r\n]+)/)
        const version = versionMatch ? versionMatch[1] : 'Unknown'
        
        // Parse memory usage
        const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/)
        const memoryUsed = memoryMatch ? memoryMatch[1] : 'Unknown'
        
        redisStatus = {
          connected: true,
          version: version || 'Unknown',
          memoryUsed,
          keyCount,
          error: null
        }

      } catch (error: any) {
        redisStatus.error = error.message
      } finally {
        try {
          await redisClient.disconnect()
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    } else {
      redisStatus.error = 'Redis URL not configured'
    }

    // Email Status (SMTP)
    let emailStatus = {
      configured: false,
      host: null as string | null,
      port: null as number | null,
      secure: false,
      error: null as string | null
    }

    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      emailStatus = {
        configured: true,
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465',
        error: null
      }
    } else {
      emailStatus.error = 'SMTP not configured'
    }

    // Storage Status (S3)
    let storageStatus = {
      configured: false,
      endpoint: null as string | null,
      bucket: null as string | null,
      error: null as string | null
    }

    if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
      storageStatus = {
        configured: true,
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET,
        error: null
      }
    } else {
      storageStatus.error = 'S3 not configured'
    }

    // Disk Usage
    let diskUsage = {
      total: 0,
      free: 0,
      used: 0,
      error: null
    }

    try {
      const stats = await fs.statfs(process.cwd())
      diskUsage = {
        total: stats.bavail * stats.bsize,
        free: stats.bfree * stats.bsize,
        used: (stats.blocks - stats.bfree) * stats.bsize,
        error: null
      }
    } catch (error: any) {
      diskUsage.error = error.message
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      system: systemInfo,
      application: packageInfo,
      services: {
        database: databaseStatus,
        redis: redisStatus,
        email: emailStatus,
        storage: storageStatus
      },
      resources: {
        disk: diskUsage,
        memory: {
          total: systemInfo.totalMemory,
          free: systemInfo.freeMemory,
          used: systemInfo.totalMemory - systemInfo.freeMemory,
          usage: ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100).toFixed(2)
        },
        cpu: {
          count: systemInfo.cpuCount,
          loadAverage: systemInfo.loadAverage,
          usage: systemInfo.loadAverage[0] / systemInfo.cpuCount * 100
        }
      }
    })

  } catch (error: any) {
    console.error('System info error:', error)
    return NextResponse.json(
      { 
        error: 'Sistem bilgileri alınırken hata oluştu',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
