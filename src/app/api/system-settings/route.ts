import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prisma bağlantısını test et ve zorla aç
    try {
      await prisma.$connect()
    } catch (connectError) {
      console.log('Prisma connection failed, retrying...', connectError)
      // Bağlantı başarısız olursa yeni client oluştur
      const { PrismaClient } = await import('@prisma/client')
      const newPrisma = new PrismaClient()
      await newPrisma.$connect()
      // Yeni client ile devam et
      const settings = await newPrisma.systemSetting.findMany({
        orderBy: { key: 'asc' }
      })
      
      // Convert to key-value object for easier frontend usage
      const settingsObject = settings.reduce((acc, setting) => {
        let value = setting.value
        
        // Parse value based on type
        if (setting.type === 'boolean') {
          value = setting.value === 'true' ? 'true' : 'false'
        } else if (setting.type === 'number') {
          value = setting.value // Keep as string for consistency
        } else if (setting.type === 'json') {
          try {
            value = JSON.parse(setting.value)
          } catch {
            value = setting.value
          }
        }
        
        acc[setting.key] = value
        return acc
      }, {} as Record<string, any>)
      
      await newPrisma.$disconnect()
      return NextResponse.json(settingsObject)
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    })

    // Convert to key-value object for easier frontend usage
    const settingsObject = settings.reduce((acc, setting) => {
      let value = setting.value
      
      // Parse value based on type
      if (setting.type === 'boolean') {
        value = setting.value === 'true' ? 'true' : 'false'
      } else if (setting.type === 'number') {
        value = setting.value // Keep as string for consistency
      } else if (setting.type === 'json') {
        try {
          value = JSON.parse(setting.value)
        } catch {
          value = setting.value
        }
      }
      
      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error('Error fetching system settings:', error)
    
    // Prisma bağlantı hatası kontrolü
    if (error instanceof Error && error.message.includes('Engine is not yet connected')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Update or create settings
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      let stringValue = String(value)
      let type = 'string'

      if (typeof value === 'boolean') {
        type = 'boolean'
        stringValue = String(value)
      } else if (typeof value === 'number') {
        type = 'number'
        stringValue = String(value)
      } else if (typeof value === 'object') {
        type = 'json'
        stringValue = JSON.stringify(value)
      }

      return prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: stringValue,
          type,
        },
        create: {
          key,
          value: stringValue,
          type,
        },
      })
    })

    await Promise.all(updatePromises)

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE',
        entity: 'SYSTEM_SETTING',
        entityId: 'system_settings',
        meta: { updatedSettings: Object.keys(settings) },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
