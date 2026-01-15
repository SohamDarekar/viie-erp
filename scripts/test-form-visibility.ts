/**
 * Test script to verify form visibility functionality
 * Run with: npx ts-node scripts/test-form-visibility.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFormVisibility() {
  try {
    console.log('🧪 Testing Form Visibility Feature...\n')

    // 1. Find an existing batch
    console.log('1. Finding an existing batch...')
    const batch = await prisma.batch.findFirst()
    
    if (!batch) {
      console.log('❌ No batches found. Please create a batch first.')
      return
    }
    
    console.log(`✅ Found batch: ${batch.name}\n`)

    // 2. Create form visibility settings for the batch
    console.log('2. Creating form visibility settings...')
    const visibility = await prisma.formVisibility.upsert({
      where: { batchId: batch.id },
      update: {
        personalDetails: true,
        education: true,
        travel: false,  // Hidden
        workDetails: false,  // Hidden
        financials: true,
        documents: true,
        courseDetails: true,
        university: false,  // Hidden
        postAdmission: false,  // Hidden
      },
      create: {
        batchId: batch.id,
        personalDetails: true,
        education: true,
        travel: false,
        workDetails: false,
        financials: true,
        documents: true,
        courseDetails: true,
        university: false,
        postAdmission: false,
      },
    })
    
    console.log('✅ Form visibility settings created/updated\n')

    // 3. Retrieve the batch with visibility settings
    console.log('3. Retrieving batch with form visibility...')
    const batchWithVisibility = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { formVisibility: true },
    })
    
    console.log('✅ Batch retrieved with visibility settings:')
    console.log(JSON.stringify(batchWithVisibility, null, 2))
    console.log('\n')

    // 4. List all visible sections
    console.log('4. Visible sections for students in this batch:')
    const visibleSections = Object.entries(batchWithVisibility?.formVisibility || {})
      .filter(([key, value]) => typeof value === 'boolean' && value)
      .map(([key]) => key)
      .filter(key => !['id', 'batchId', 'createdAt', 'updatedAt'].includes(key))
    
    console.log(visibleSections.join(', '))
    console.log('\n')

    console.log('✅ Test completed successfully!')
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFormVisibility()
