/**
 * Initialize Form Visibility for Existing Batches
 * 
 * This script creates default form visibility settings for all existing batches
 * that don't have visibility settings yet. All sections will be enabled by default.
 * 
 * Run with: npx ts-node scripts/initialize-form-visibility.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeFormVisibility() {
  try {
    console.log('🚀 Initializing Form Visibility for Existing Batches...\n')

    // Get all active batches
    const batches = await prisma.batch.findMany({
      where: {
        isActive: true,
      },
      include: {
        formVisibility: true,
      },
    })

    console.log(`Found ${batches.length} active batch(es)\n`)

    let created = 0
    let skipped = 0

    for (const batch of batches) {
      if (batch.formVisibility) {
        console.log(`⏭️  Skipping ${batch.name} - already has visibility settings`)
        skipped++
        continue
      }

      // Create default visibility settings (all sections enabled)
      await prisma.formVisibility.create({
        data: {
          batchId: batch.id,
          personalDetails: true,
          education: true,
          travel: true,
          workDetails: true,
          financials: true,
          documents: true,
          courseDetails: true,
          university: true,
          postAdmission: true,
        },
      })

      console.log(`✅ Created visibility settings for ${batch.name}`)
      created++
    }

    console.log('\n' + '='.repeat(50))
    console.log(`✅ Initialization complete!`)
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${batches.length}`)
    console.log('='.repeat(50))
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initializeFormVisibility()
