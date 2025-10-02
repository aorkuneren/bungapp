import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    const scanResults = {
      timestamp: new Date().toISOString(),
      scanId: crypto.randomUUID(),
      status: 'completed',
      summary: {
        totalChecks: 0,
        passed: 0,
        warnings: 0,
        critical: 0
      },
      checks: [] as any[]
    }

    // 1. Environment Variables Security Check
    const envCheck = {
      category: 'Environment',
      name: 'Çevre Değişkenleri Güvenliği',
      status: 'passed',
      severity: 'info',
      message: 'Çevre değişkenleri kontrol edildi',
      details: [] as string[]
    }

    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'JWT_SECRET'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      envCheck.status = 'critical'
      envCheck.severity = 'critical'
      envCheck.message = 'Kritik çevre değişkenleri eksik'
      envCheck.details = missingEnvVars.map(env => `${env} tanımlanmamış`)
      scanResults.summary.critical++
    } else {
      scanResults.summary.passed++
    }

    // Check for weak secrets
    const secrets = ['NEXTAUTH_SECRET', 'JWT_SECRET']
    for (const secret of secrets) {
      const value = process.env[secret]
      if (value && value.length < 32) {
        envCheck.status = 'warning'
        envCheck.severity = 'warning'
        envCheck.details.push(`${secret} çok kısa (minimum 32 karakter önerilir)`)
        if (scanResults.summary.critical === 0) {
          scanResults.summary.warnings++
          scanResults.summary.passed--
        }
      }
    }

    scanResults.checks.push(envCheck)
    scanResults.summary.totalChecks++

    // 2. Database Security Check
    const prismaCheck = {
      category: 'Database',
      name: 'Veritabanı Güvenliği',
      status: 'passed',
      severity: 'info',
      message: 'Veritabanı güvenlik kontrolleri tamamlandı',
      details: [] as string[]
    }

    try {
      // Check for users with weak passwords (this is a simulation)
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      })

      // Check for inactive admin users
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: {
          id: true,
          email: true,
          isActive: true
        }
      })

      const inactiveAdmins = adminUsers.filter(user => !user.isActive)
      if (inactiveAdmins.length > 0) {
        prismaCheck.status = 'warning'
        prismaCheck.severity = 'warning'
        prismaCheck.details.push(`${inactiveAdmins.length} pasif admin kullanıcısı bulundu`)
        scanResults.summary.warnings++
      } else {
        scanResults.summary.passed++
      }

      // Check for old reservations without proper audit logs
      const oldReservations = await prisma.reservation.count({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
          }
        }
      })

      if (oldReservations > 1000) {
        prismaCheck.details.push(`${oldReservations} eski rezervasyon kaydı bulundu - arşivleme önerilir`)
      }

    } catch (error) {
      prismaCheck.status = 'critical'
      prismaCheck.severity = 'critical'
      prismaCheck.message = 'Veritabanı güvenlik kontrolü başarısız'
      prismaCheck.details.push('Veritabanı bağlantı hatası')
      scanResults.summary.critical++
    }

    scanResults.checks.push(prismaCheck)
    scanResults.summary.totalChecks++

    // 3. File System Security Check
    const fsCheck = {
      category: 'FileSystem',
      name: 'Dosya Sistemi Güvenliği',
      status: 'passed',
      severity: 'info',
      message: 'Dosya sistemi güvenlik kontrolleri tamamlandı',
      details: [] as string[]
    }

    // Check for sensitive files in public directory
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      const publicDir = path.join(process.cwd(), 'public')
      const sensitiveFiles = ['.env', '.env.local', '.env.production', 'config.json']
      
      for (const file of sensitiveFiles) {
        try {
          await fs.access(path.join(publicDir, file))
          fsCheck.status = 'critical'
          fsCheck.severity = 'critical'
          fsCheck.details.push(`Hassas dosya public dizininde: ${file}`)
          scanResults.summary.critical++
        } catch {
          // File doesn't exist in public - good
        }
      }

      if (fsCheck.status === 'passed') {
        scanResults.summary.passed++
      }

    } catch (error) {
      fsCheck.status = 'warning'
      fsCheck.severity = 'warning'
      fsCheck.message = 'Dosya sistemi kontrolü kısmen başarısız'
      fsCheck.details.push('Dosya sistemi erişim hatası')
      scanResults.summary.warnings++
    }

    scanResults.checks.push(fsCheck)
    scanResults.summary.totalChecks++

    // 4. Network Security Check
    const networkCheck = {
      category: 'Network',
      name: 'Ağ Güvenliği',
      status: 'passed',
      severity: 'info',
      message: 'Ağ güvenlik kontrolleri tamamlandı',
      details: [] as string[]
    }

    // Check HTTPS configuration
    const isProduction = process.env.NODE_ENV === 'production'
    const nextAuthUrl = process.env.NEXTAUTH_URL

    if (isProduction && nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
      networkCheck.status = 'critical'
      networkCheck.severity = 'critical'
      networkCheck.details.push('Üretim ortamında HTTPS kullanılmıyor')
      scanResults.summary.critical++
    } else {
      scanResults.summary.passed++
    }

    // Check for secure headers (this would need middleware inspection)
    if (isProduction) {
      networkCheck.details.push('Güvenlik başlıkları middleware tarafından kontrol edilmelidir')
    }

    scanResults.checks.push(networkCheck)
    scanResults.summary.totalChecks++

    // 5. Authentication Security Check
    const authCheck = {
      category: 'Authentication',
      name: 'Kimlik Doğrulama Güvenliği',
      status: 'passed',
      severity: 'info',
      message: 'Kimlik doğrulama güvenlik kontrolleri tamamlandı',
      details: [] as string[]
    }

    // Check session configuration
    if (!process.env.NEXTAUTH_SECRET) {
      authCheck.status = 'critical'
      authCheck.severity = 'critical'
      authCheck.details.push('NextAuth secret tanımlanmamış')
      scanResults.summary.critical++
    } else if (process.env.NEXTAUTH_SECRET.length < 32) {
      authCheck.status = 'warning'
      authCheck.severity = 'warning'
      authCheck.details.push('NextAuth secret çok kısa')
      scanResults.summary.warnings++
    } else {
      scanResults.summary.passed++
    }

    scanResults.checks.push(authCheck)
    scanResults.summary.totalChecks++

    // Determine overall status
    if (scanResults.summary.critical > 0) {
      scanResults.status = 'critical'
    } else if (scanResults.summary.warnings > 0) {
      scanResults.status = 'warning'
    } else {
      scanResults.status = 'passed'
    }

    return NextResponse.json(scanResults)

  } catch (error: any) {
    console.error('Security scan error:', error)
    return NextResponse.json(
      { 
        error: 'Güvenlik taraması yapılırken hata oluştu',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
