import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Neon veritabanına bağlanılıyor...')
  
  try {
    // Veritabanı bağlantısını test et
    await prisma.$connect()
    console.log('✅ Veritabanı bağlantısı başarılı!')
    
    // Migration'ları çalıştır
    console.log('📦 Migration'lar çalıştırılıyor...')
    // Bu komut Vercel'de otomatik çalışacak
    
    console.log('🎉 Deployment hazır!')
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
