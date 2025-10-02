import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSearch() {
  try {
    console.log('🔍 Arama Testi Başlatılıyor...\n')

    // Test 1: Tüm bungalovları getir
    const allBungalows = await prisma.bungalow.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`📊 Toplam Bungalov: ${allBungalows.length}`)
    
    // Test 2: "GARDEN" içeren bungalovlar
    const gardenBungalows = allBungalows.filter(b => 
      b.name.toLowerCase().includes('garden')
    )
    console.log(`🌿 "GARDEN" içeren: ${gardenBungalows.length}`)
    gardenBungalows.forEach(b => console.log(`   - ${b.name}`))
    
    // Test 3: "BLUE" içeren bungalovlar
    const blueBungalows = allBungalows.filter(b => 
      b.name.toLowerCase().includes('blue')
    )
    console.log(`\n💙 "BLUE" içeren: ${blueBungalows.length}`)
    blueBungalows.forEach(b => console.log(`   - ${b.name}`))
    
    // Test 4: "SICAK HAVUZLU" içeren bungalovlar
    const jacuzziBungalows = allBungalows.filter(b => 
      b.name.toLowerCase().includes('sicak havuzlu')
    )
    console.log(`\n🛁 "SICAK HAVUZLU" içeren: ${jacuzziBungalows.length}`)
    jacuzziBungalows.forEach(b => console.log(`   - ${b.name}`))
    
    // Test 5: Kapasite bazında grupla
    const capacityGroups = allBungalows.reduce((acc, b) => {
      acc[b.capacity] = (acc[b.capacity] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    console.log(`\n👥 Kapasite Dağılımı:`)
    Object.entries(capacityGroups).forEach(([capacity, count]) => {
      console.log(`   ${capacity} kişi: ${count} bungalov`)
    })
    
    // Test 6: Fiyat aralığı
    const prices = allBungalows.map(b => b.basePrice.toNumber())
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    
    console.log(`\n💰 Fiyat Analizi:`)
    console.log(`   En düşük: ₺${minPrice.toLocaleString()}`)
    console.log(`   En yüksek: ₺${maxPrice.toLocaleString()}`)
    console.log(`   Ortalama: ₺${Math.round(avgPrice).toLocaleString()}`)
    
    // Test 7: Özellik analizi
    console.log(`\n🏷️ Özellik Analizi:`)
    const featureStats = {} as Record<string, number>
    
    allBungalows.forEach(b => {
      if (b.features && typeof b.features === 'object') {
        Object.keys(b.features).forEach(feature => {
          featureStats[feature] = (featureStats[feature] || 0) + 1
        })
      }
    })
    
    Object.entries(featureStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([feature, count]) => {
        console.log(`   ${feature}: ${count} bungalov`)
      })

  } catch (error) {
    console.error('❌ Test hatası:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSearch()
