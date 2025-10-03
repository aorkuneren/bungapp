#!/usr/bin/env tsx

import { execSync } from 'child_process'

async function deployToVercel() {
  console.log('🚀 Vercel deployment başlatılıyor...')
  
  try {
    // Prisma client'ı generate et
    console.log('📦 Prisma client generate ediliyor...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Migration'ları deploy et
    console.log('🗄️ Migrationlar deploy ediliyor...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    
    console.log('✅ Deployment başarılı!')
  } catch (error) {
    console.error('❌ Deployment hatası:', error)
    process.exit(1)
  }
}

deployToVercel()
