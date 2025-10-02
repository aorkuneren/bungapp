import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPriceRules() {
  try {
    console.log('🔍 Mevcut Price Rules:')
    
    const rules = await prisma.priceRule.findMany({
      orderBy: [
        { type: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    if (rules.length === 0) {
      console.log('❌ Hiç price rule bulunamadı')
      return
    }

    rules.forEach((rule, index) => {
      console.log(`\n${index + 1}. ${rule.name}`)
      console.log(`   ID: ${rule.id}`)
      console.log(`   Type: ${rule.type}`)
      console.log(`   Amount: ${rule.amountValue} (${rule.amountType})`)
      console.log(`   Applies To: ${rule.appliesTo}`)
      if (rule.bungalowId) {
        console.log(`   Bungalow ID: ${rule.bungalowId}`)
      }
      if (rule.dateStart || rule.dateEnd) {
        console.log(`   Date Range: ${rule.dateStart || 'No start'} - ${rule.dateEnd || 'No end'}`)
      }
      console.log(`   Created: ${rule.createdAt}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPriceRules()
