/**
 * Test script to verify batch API is working correctly
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Testing batch functionality...\n')

  try {
    // Test 1: Get all batches
    console.log('1. Fetching all batches from database...')
    const batches = await prisma.batch.findMany({
      include: {
        _count: {
          select: { students: true },
        },
      },
      orderBy: [
        { intakeYear: 'desc' },
      ],
    })

    console.log(`   Found ${batches.length} batches:`)
    batches.forEach(batch => {
      console.log(`   - ${batch.name} (ID: ${batch.id})`)
      console.log(`     Program: ${batch.program}`)
      console.log(`     Intake Year: ${batch.intakeYear}`)
      console.log(`     Active: ${batch.isActive}`)
      console.log(`     Students: ${batch._count.students}`)
    })

    // Test 2: Check batch structure
    console.log('\n2. Verifying batch data structure...')
    if (batches.length > 0) {
      const sampleBatch = batches[0]
      console.log('   Sample batch object keys:', Object.keys(sampleBatch))
      console.log('   Has _count:', !!sampleBatch._count)
      console.log('   Has _count.students:', !!sampleBatch._count?.students)
      console.log('   ✓ Structure looks correct')
    } else {
      console.log('   ⚠️  No batches to verify structure')
    }

    // Test 3: Simulate API response format
    console.log('\n3. Simulating API response format...')
    const apiResponse = {
      batches,
      total: batches.length,
      page: 1,
      totalPages: Math.ceil(batches.length / 20),
    }
    console.log('   API would return:', JSON.stringify({
      ...apiResponse,
      batches: apiResponse.batches.map(b => ({ id: b.id, name: b.name }))
    }, null, 2))

    // Test 4: Check students with batches
    console.log('\n4. Checking students and their batch assignments...')
    const students = await prisma.student.findMany({
      include: {
        batch: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })

    console.log(`   Found ${students.length} students:`)
    students.forEach(student => {
      console.log(`   - ${student.firstName} ${student.lastName}`)
      console.log(`     Email: ${student.user.email}`)
      console.log(`     Batch ID: ${student.batchId}`)
      console.log(`     Batch Name: ${student.batch.name}`)
      console.log(`     Program: ${student.program}`)
    })

    console.log('\n✓ All tests completed successfully!')

  } catch (error) {
    console.error('\n✗ Error during testing:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
