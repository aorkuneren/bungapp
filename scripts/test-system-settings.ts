import { prisma } from '../src/lib/db'

async function testSystemSettings() {
  try {
    console.log('Testing SystemSetting model...')
    
    // Test 1: Try to find all system settings
    const settings = await prisma.systemSetting.findMany()
    console.log('✅ findMany works, found:', settings.length, 'settings')
    
    // Test 2: Try to create a test setting
    const testSetting = await prisma.systemSetting.upsert({
      where: { key: 'test_key' },
      update: { value: 'test_value_updated' },
      create: {
        key: 'test_key',
        value: 'test_value',
        type: 'string'
      }
    })
    console.log('✅ upsert works, created/updated:', testSetting)
    
    // Test 3: Clean up
    await prisma.systemSetting.delete({
      where: { key: 'test_key' }
    })
    console.log('✅ delete works, cleaned up test setting')
    
    console.log('🎉 All tests passed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSystemSettings()
