import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBungalows() {
  try {
    console.log('🏠 Mevcut Bungalovlar:')
    
    const bungalows = await prisma.bungalow.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    if (bungalows.length === 0) {
      console.log('❌ Hiç bungalov bulunamadı')
      return
    }

    bungalows.forEach((bungalow, index) => {
      console.log(`\n${index + 1}. ${bungalow.name}`)
      console.log(`   ID: ${bungalow.id}`)
      console.log(`   Slug: ${bungalow.slug}`)
      console.log(`   Kapasite: ${bungalow.capacity} kişi`)
      console.log(`   Fiyat: ₺${bungalow.basePrice.toNumber()}`)
      console.log(`   Durum: ${bungalow.status}`)
      console.log(`   Açıklama: ${bungalow.description}`)
      
      if (bungalow.features) {
        console.log(`   Özellikler:`)
        const features = typeof bungalow.features === 'string' 
          ? JSON.parse(bungalow.features) 
          : bungalow.features
        
        Object.entries(features).forEach(([key, value]) => {
          console.log(`     - ${key}: ${value}`)
        })
      }
    })

    console.log(`\n📊 Toplam: ${bungalows.length} bungalov`)
    
    // İstatistikler
    const stats = await prisma.bungalow.groupBy({
      by: ['status'],
      _count: true
    })
    
    console.log('\n📈 Durum İstatistikleri:')
    stats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count} bungalov`)
    })
    
    const avgPrice = await prisma.bungalow.aggregate({
      _avg: {
        basePrice: true
      },
      _min: {
        basePrice: true
      },
      _max: {
        basePrice: true
      }
    })
    
    console.log('\n💰 Fiyat İstatistikleri:')
    console.log(`   Ortalama: ₺${avgPrice._avg.basePrice?.toNumber().toFixed(0)}`)
    console.log(`   En düşük: ₺${avgPrice._min.basePrice?.toNumber()}`)
    console.log(`   En yüksek: ₺${avgPrice._max.basePrice?.toNumber()}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBungalows()
