import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'Veritabanı bağlantı bilgisi bulunamadı' },
        { status: 500 }
      )
    }

    // Parse database URL
    const url = new URL(databaseUrl)
    const dbName = url.pathname.slice(1) // Remove leading slash
    const host = url.hostname
    const port = url.port || '5432'
    const username = url.username
    const password = url.password

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups')
    try {
      await fs.access(backupDir)
    } catch {
      await fs.mkdir(backupDir, { recursive: true })
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `bungapp_backup_${timestamp}.sql`
    const backupPath = path.join(backupDir, backupFileName)

    // Set PGPASSWORD environment variable for pg_dump (if password exists)
    const env = password ? { ...process.env, PGPASSWORD: password } : process.env

    // Create pg_dump command with explicit path to PostgreSQL 15 version
    const pgDumpPath = '/opt/homebrew/Cellar/postgresql@15/15.14/bin/pg_dump'
    const dumpCommand = `${pgDumpPath} -h ${host} -p ${port} -U ${username} -d ${dbName} -f "${backupPath}" --no-password --verbose`

    try {
      const { stdout, stderr } = await execAsync(dumpCommand, { env })
      
      // Check if backup file was created successfully
      const stats = await fs.stat(backupPath)
      
      if (stats.size === 0) {
        throw new Error('Yedekleme dosyası boş oluşturuldu')
      }

      return NextResponse.json({
        success: true,
        message: 'Veritabanı yedeği başarıyla oluşturuldu',
        filename: backupFileName,
        size: stats.size,
        path: backupPath,
        timestamp: new Date().toISOString()
      })

    } catch (execError: any) {
      console.error('Backup execution error:', execError)
      
      // Try to clean up failed backup file
      try {
        await fs.unlink(backupPath)
      } catch {}

      return NextResponse.json(
        { 
          error: 'Veritabanı yedeği oluşturulamadı',
          details: execError.message 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Database backup error:', error)
    return NextResponse.json(
      { 
        error: 'Veritabanı yedeği oluşturulurken hata oluştu',
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

    const backupDir = path.join(process.cwd(), 'backups')
    
    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = []

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filePath = path.join(backupDir, file)
          const stats = await fs.stat(filePath)
          
          backupFiles.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          })
        }
      }

      // Sort by creation date, newest first
      backupFiles.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

      return NextResponse.json({
        backups: backupFiles,
        count: backupFiles.length
      })

    } catch (error) {
      // Backup directory doesn't exist or is empty
      return NextResponse.json({
        backups: [],
        count: 0
      })
    }

  } catch (error: any) {
    console.error('List backups error:', error)
    return NextResponse.json(
      { 
        error: 'Yedekler listelenirken hata oluştu',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
