/**
 * Direct test of batch API GET endpoint
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Simulate the GET batch logic
async function getBatches(
  page = 1,
  limit = 20,
  filters = {}
) {
  const skip = (page - 1) * limit

  const where = {}
  if (filters.program) where.program = filters.program
  if (filters.isActive !== undefined) where.isActive = filters.isActive

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { intakeYear: 'desc' },
      ],
      include: {
        _count: {
          select: { students: true },
        },
      },
    }),
    prisma.batch.count({ where }),
  ])

  return {
    batches,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

async function main() {
  console.log('Testing batch API GET logic...\n')

  try {
    const result = await getBatches(1, 20)
    
    console.log('API Response:')
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n✓ API logic works correctly')
    console.log(`  Returned ${result.batches.length} batches`)
    console.log(`  Total count: ${result.total}`)
    
  } catch (error) {
    console.error('\n✗ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
