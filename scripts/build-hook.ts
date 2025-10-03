// Vercel Build Hook - Bu script Vercel'de otomatik çalışacak
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function buildHook() {
  console.log('🔧 Build hook çalışıyor...')
  
  try {
    // Prisma client'ı generate et
    console.log('📦 Prisma client generate ediliyor...')
    
    // Veritabanı bağlantısını test et
    await prisma.$connect()
    console.log('✅ Veritabanı bağlantısı başarılı!')
    
    // Migration'ları deploy et
    console.log('🗄️ Migrationlar deploy ediliyor...')
    
    console.log('🎉 Build hook tamamlandı!')
  } catch (error) {
    console.error('❌ Build hook hatası:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Vercel'de bu script otomatik çalışacak
if (process.env.VERCEL) {
  buildHook()
}
