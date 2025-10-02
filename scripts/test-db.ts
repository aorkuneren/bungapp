import { prisma } from '../src/lib/db'

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test user count
    const userCount = await prisma.user.count()
    console.log(`👥 Users: ${userCount}`)
    
    // Test bungalow count
    const bungalowCount = await prisma.bungalow.count()
    console.log(`🏠 Bungalows: ${bungalowCount}`)
    
    // Test reservation count
    const reservationCount = await prisma.reservation.count()
    console.log(`📅 Reservations: ${reservationCount}`)
    
    // Test price rule count
    const priceRuleCount = await prisma.priceRule.count()
    console.log(`💰 Price Rules: ${priceRuleCount}`)
    
    // Test audit log count
    const auditLogCount = await prisma.auditLog.count()
    console.log(`📝 Audit Logs: ${auditLogCount}`)
    
    console.log('✅ Database connection successful!')
    
    // List users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })
    
    console.log('\n👤 Users:')
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`)
    })
    
    // List bungalows
    const bungalows = await prisma.bungalow.findMany({
      select: {
        name: true,
        capacity: true,
        basePrice: true,
        status: true,
      },
    })
    
    console.log('\n🏠 Bungalows:')
    bungalows.forEach(bungalow => {
      console.log(`  - ${bungalow.name} (${bungalow.capacity} kişi) - ₺${bungalow.basePrice} - ${bungalow.status}`)
    })
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
