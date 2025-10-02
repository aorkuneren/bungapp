import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const adenBungalows = [
  {
    name: 'ADEN GARDEN SUİT (SADECE BAHÇELİ) NO.1',
    slug: 'aden-garden-suit-no-1',
    description: 'Bahçeli özel tasarım suit. Doğayla iç içe huzurlu bir konaklama deneyimi.',
    capacity: 2,
    basePrice: 800,
    features: {
      garden: 'Özel bahçe',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      balcony: 'Bahçe terası'
    }
  },
  {
    name: 'ADEN GARDEN SUİT (SADECE BAHÇELİ) NO.2',
    slug: 'aden-garden-suit-no-2',
    description: 'Bahçeli özel tasarım suit. Doğayla iç içe huzurlu bir konaklama deneyimi.',
    capacity: 2,
    basePrice: 800,
    features: {
      garden: 'Özel bahçe',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      balcony: 'Bahçe terası'
    }
  },
  {
    name: 'ADEN STANDART SUİT (DÖRTGEN HAVUZ) NO.3',
    slug: 'aden-standart-suit-no-3',
    description: 'Dörtgen özel havuzlu standart suit. Modern tasarım ve konfor.',
    capacity: 2,
    basePrice: 1200,
    features: {
      pool: 'Dörtgen özel havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      balcony: 'Havuz terası'
    }
  },
  {
    name: 'ADEN FAMİLY SUİT (YUVARLAK HAVUZ) NO.4',
    slug: 'aden-family-suit-no-4',
    description: 'Yuvarlak özel havuzlu aile suit. Geniş ve konforlu aile konaklama.',
    capacity: 4,
    basePrice: 1500,
    features: {
      pool: 'Yuvarlak özel havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      familyRoom: 'Aile odası',
      balcony: 'Geniş teras'
    }
  },
  {
    name: 'ADEN FAMİLY SUİT (YUVARLAK HAVUZ) NO.5 SICAK HAVUZLU',
    slug: 'aden-family-suit-no-5-sicak-havuzlu',
    description: 'Yuvarlak özel havuz ve sıcak havuz özellikli aile suit. Premium konfor.',
    capacity: 4,
    basePrice: 1800,
    features: {
      pool: 'Yuvarlak özel havuz',
      jacuzzi: 'Sıcak havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      familyRoom: 'Aile odası',
      balcony: 'Geniş teras'
    }
  },
  {
    name: 'ADEN FAMİLY SUİT KÜÇÜK (YUVARLAK HAVUZ) NO.6',
    slug: 'aden-family-suit-kucuk-no-6',
    description: 'Yuvarlak özel havuzlu küçük aile suit. Kompakt ama konforlu.',
    capacity: 3,
    basePrice: 1300,
    features: {
      pool: 'Yuvarlak özel havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      balcony: 'Teras'
    }
  },
  {
    name: 'ADEN BLUE SUİT (YUVARLAK HAVUZ) NO.7 SICAK HAVUZLU',
    slug: 'aden-blue-suit-no-7-sicak-havuzlu',
    description: 'Mavi temalı yuvarlak havuz ve sıcak havuz özellikli suit. Lüks deneyim.',
    capacity: 2,
    basePrice: 1600,
    features: {
      pool: 'Yuvarlak özel havuz',
      jacuzzi: 'Sıcak havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      blueTheme: 'Mavi tema dekor',
      balcony: 'Özel teras'
    }
  },
  {
    name: 'ADEN BLUE SUİT (YUVARLAK HAVUZ) NO.8',
    slug: 'aden-blue-suit-no-8',
    description: 'Mavi temalı yuvarlak havuzlu suit. Şık tasarım ve konfor.',
    capacity: 2,
    basePrice: 1400,
    features: {
      pool: 'Yuvarlak özel havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      blueTheme: 'Mavi tema dekor',
      balcony: 'Özel teras'
    }
  },
  {
    name: 'ADEN WHİTE SUİT (DÖRTGEN HAVUZ) NO.9 SICAK HAVUZLU',
    slug: 'aden-white-suit-no-9-sicak-havuzlu',
    description: 'Beyaz temalı dörtgen havuz ve sıcak havuz özellikli suit. Premium lüks.',
    capacity: 2,
    basePrice: 1700,
    features: {
      pool: 'Dörtgen özel havuz',
      jacuzzi: 'Sıcak havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      whiteTheme: 'Beyaz tema dekor',
      balcony: 'Özel teras'
    }
  },
  {
    name: 'ADEN WHİTE SUİT (DÖRTGEN HAVUZ) NO.10 SICAK HAVUZLU',
    slug: 'aden-white-suit-no-10-sicak-havuzlu',
    description: 'Beyaz temalı dörtgen havuz ve sıcak havuz özellikli suit. Premium lüks.',
    capacity: 2,
    basePrice: 1700,
    features: {
      pool: 'Dörtgen özel havuz',
      jacuzzi: 'Sıcak havuz',
      airConditioning: 'Var',
      wifi: 'Ücretsiz WiFi',
      minibar: 'Var',
      whiteTheme: 'Beyaz tema dekor',
      balcony: 'Özel teras'
    }
  }
]

async function setupAdenBungalows() {
  try {
    console.log('🏠 ADEN Bungalovları kuruluyor...')
    
    // Önce mevcut bungalovları sil
    console.log('🗑️  Mevcut bungalovları temizleniyor...')
    await prisma.bungalowImage.deleteMany()
    await prisma.reservation.deleteMany()
    await prisma.bungalow.deleteMany()
    
    // Yeni ADEN bungalovlarını oluştur
    console.log('✨ ADEN bungalovları oluşturuluyor...')
    
    for (const bungalow of adenBungalows) {
      const created = await prisma.bungalow.create({
        data: {
          name: bungalow.name,
          slug: bungalow.slug,
          description: bungalow.description,
          capacity: bungalow.capacity,
          basePrice: bungalow.basePrice,
          status: 'ACTIVE',
          features: bungalow.features
        }
      })
      
      console.log(`✅ ${created.name} - ₺${created.basePrice}`)
    }
    
    console.log('\n🎉 ADEN Bungalovları başarıyla kuruldu!')
    console.log(`📊 Toplam ${adenBungalows.length} bungalov oluşturuldu`)
    
    // İstatistikleri göster
    const stats = await prisma.bungalow.groupBy({
      by: ['status'],
      _count: true
    })
    
    console.log('\n📈 İstatistikler:')
    stats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count} bungalov`)
    })
    
    const avgPrice = await prisma.bungalow.aggregate({
      _avg: {
        basePrice: true
      }
    })
    
    console.log(`   Ortalama fiyat: ₺${avgPrice._avg.basePrice?.toFixed(0)}`)
    
  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAdenBungalows()
