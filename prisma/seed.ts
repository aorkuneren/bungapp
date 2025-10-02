import { PrismaClient } from '@prisma/client'
import { hash } from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await hash('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bungapp.com' },
    update: {},
    create: {
      email: 'admin@bungapp.com',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash: adminPassword,
      isActive: true,
    },
  })

  // Create receptionist user
  const receptionistPassword = await hash('receptionist123')
  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@bungapp.com' },
    update: {},
    create: {
      email: 'receptionist@bungapp.com',
      name: 'Resepsiyonist',
      role: 'RECEPTIONIST',
      passwordHash: receptionistPassword,
      isActive: true,
    },
  })

  // Create bungalows
  const bungalow1 = await prisma.bungalow.upsert({
    where: { slug: 'bungalov-a' },
    update: {},
    create: {
      name: 'Bungalov A',
      slug: 'bungalov-a',
      description: 'Deniz manzaralı, 2 kişilik bungalov. WiFi, klima ve minibar dahil.',
      capacity: 2,
      basePrice: 500,
      status: 'ACTIVE',
      features: {
        wifi: true,
        airConditioning: true,
        minibar: true,
        seaView: true,
        balcony: true,
      },
    },
  })

  const bungalow2 = await prisma.bungalow.upsert({
    where: { slug: 'bungalov-b' },
    update: {},
    create: {
      name: 'Bungalov B',
      slug: 'bungalov-b',
      description: 'Bahçe manzaralı, 4 kişilik bungalov. WiFi, klima ve minibar dahil.',
      capacity: 4,
      basePrice: 750,
      status: 'ACTIVE',
      features: {
        wifi: true,
        airConditioning: true,
        minibar: true,
        gardenView: true,
        kitchenette: true,
      },
    },
  })

  const bungalow3 = await prisma.bungalow.upsert({
    where: { slug: 'bungalov-c' },
    update: {},
    create: {
      name: 'Bungalov C',
      slug: 'bungalov-c',
      description: 'Orman manzaralı, 6 kişilik bungalov. WiFi, klima ve tam mutfak dahil.',
      capacity: 6,
      basePrice: 1000,
      status: 'ACTIVE',
      features: {
        wifi: true,
        airConditioning: true,
        minibar: true,
        forestView: true,
        fullKitchen: true,
        jacuzzi: true,
      },
    },
  })

  // Create price rules
  await prisma.priceRule.createMany({
    data: [
      {
        name: 'Hafta Sonu Fiyatlandırması',
        type: 'WEEKEND',
        weekdayMask: [false, false, false, false, false, true, true], // Saturday, Sunday
        amountType: 'PERCENT',
        amountValue: 20, // %20 artış
        appliesTo: 'GLOBAL',
      },
      {
        name: 'Yaz Sezonu Fiyatlandırması',
        type: 'SEASON',
        dateStart: new Date('2024-06-01'),
        dateEnd: new Date('2024-09-30'),
        amountType: 'PERCENT',
        amountValue: 30, // %30 artış
        appliesTo: 'GLOBAL',
      },
      {
        name: 'Minimum 3 Gece Kalış',
        type: 'MIN_NIGHTS',
        amountType: 'FIXED',
        amountValue: 3,
        appliesTo: 'GLOBAL',
      },
      {
        name: 'Kişi Başı Ek Ücret',
        type: 'PER_PERSON',
        amountType: 'FIXED',
        amountValue: 100, // Kişi başı 100 TL
        appliesTo: 'GLOBAL',
      },
    ],
    skipDuplicates: true,
  })

  // Create sample reservations
  const reservation1 = await prisma.reservation.create({
    data: {
      code: 'RES-2024-001',
      bungalowId: bungalow1.id,
      customerName: 'Ahmet Yılmaz',
      customerEmail: 'ahmet@email.com',
      customerPhone: '0555 123 45 67',
      checkIn: new Date('2024-01-15'),
      checkOut: new Date('2024-01-18'),
      nights: 3,
      guests: 2,
      baseAmount: 1500,
      discountAmount: 0,
      extrasAmount: 0,
      taxAmount: 270,
      totalAmount: 1770,
      status: 'CONFIRMED',
      notes: 'Deniz manzaralı oda tercih edildi.',
      createdByUserId: admin.id,
    },
  })

  const reservation2 = await prisma.reservation.create({
    data: {
      code: 'RES-2024-002',
      bungalowId: bungalow2.id,
      customerName: 'Fatma Demir',
      customerEmail: 'fatma@email.com',
      customerPhone: '0555 987 65 43',
      checkIn: new Date('2024-01-20'),
      checkOut: new Date('2024-01-25'),
      nights: 5,
      guests: 4,
      baseAmount: 3750,
      discountAmount: 0,
      extrasAmount: 200, // 2 kişi başı ek ücret
      taxAmount: 711,
      totalAmount: 4661,
      status: 'PENDING',
      notes: 'Aile rezervasyonu, çocuklar için ekstra yatak gerekli.',
      createdByUserId: receptionist.id,
    },
  })

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: admin.id,
        action: 'CREATE',
        entity: 'BUNGALOW',
        entityId: bungalow1.id,
        meta: { name: bungalow1.name },
        ip: '127.0.0.1',
        userAgent: 'BungApp/1.0',
      },
      {
        actorUserId: admin.id,
        action: 'CREATE',
        entity: 'RESERVATION',
        entityId: reservation1.id,
        meta: { code: reservation1.code, customerName: reservation1.customerName },
        ip: '127.0.0.1',
        userAgent: 'BungApp/1.0',
      },
    ],
  })

  console.log('✅ Database seeded successfully!')
  console.log('👤 Admin user: admin@bungapp.com / admin123')
  console.log('👤 Receptionist user: receptionist@bungapp.com / receptionist123')
  console.log('🏠 Created 3 bungalows')
  console.log('📅 Created 2 sample reservations')
  console.log('💰 Created 4 price rules')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
