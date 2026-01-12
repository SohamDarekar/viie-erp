/**
 * Comprehensive test simulating admin page data loading
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getBatches(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit
  const where = {}
  if (filters.program) where.program = filters.program
  if (filters.isActive !== undefined) where.isActive = filters.isActive

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ intakeYear: 'desc' }],
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

async function getStudents(page = 1, limit = 50) {
  const skip = (page - 1) * limit

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
          },
        },
        batch: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.student.count(),
  ])

  return {
    students,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

async function main() {
  console.log('\n=== Simulating Admin Page Load ===\n')

  try {
    // Step 1: Load batches
    console.log('1. Loading batches (GET /api/admin/batches)...')
    const batchData = await getBatches()
    console.log(`   ✓ Returned ${batchData.batches.length} batches`)
    console.log(`   ✓ Total count: ${batchData.total}`)
    console.log(`   ✓ Response structure:`, {
      batches: `Array(${batchData.batches.length})`,
      total: batchData.total,
      page: batchData.page,
      totalPages: batchData.totalPages,
    })

    // Step 2: Load students
    console.log('\n2. Loading students (GET /api/admin/students)...')
    const studentData = await getStudents()
    console.log(`   ✓ Returned ${studentData.students.length} students`)
    console.log(`   ✓ Total count: ${studentData.pagination.total}`)
    console.log(`   ✓ Response structure:`, {
      students: `Array(${studentData.students.length})`,
      pagination: studentData.pagination,
    })

    // Step 3: Simulate frontend processing
    console.log('\n3. Simulating frontend data processing...')
    const batchList = batchData.batches || []
    const studentList = studentData.students || []

    console.log(`   ✓ batchList.length = ${batchList.length}`)
    console.log(`   ✓ studentList.length = ${studentList.length}`)

    const stats = {
      totalStudents: studentData.pagination?.total || 0,
      totalBatches: batchData.total || 0,
      activeBatches: batchList.filter((b) => b.isActive).length,
    }

    console.log('   ✓ Stats calculated:', stats)

    // Step 4: Check if dropdowns would work
    console.log('\n4. Checking dropdown options...')
    console.log('   Batch Assignment dropdown options:')
    batchList.forEach((batch) => {
      console.log(`     - ${batch.name} (${batch.program}) - ${batch._count?.students || 0} students ${!batch.isActive ? '(Archived)' : ''}`)
    })

    console.log('\n   Student Selection dropdown options:')
    studentList.forEach((student) => {
      console.log(`     - ${student.firstName} ${student.lastName} (${student.user.email})`)
    })

    // Step 5: Simulate editing a student
    if (studentList.length > 0) {
      console.log('\n5. Simulating "Edit Student" action...')
      const student = studentList[0]
      console.log(`   Selected student:`, {
        name: `${student.firstName} ${student.lastName}`,
        batchId: student.batchId,
        batchName: student.batch.name,
      })

      const editForm = {
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.user.username,
        email: student.user.email,
        phone: student.phone || '',
        program: student.program,
        batchId: student.batch.id,
      }

      console.log('   Edit form initialized:', editForm)

      // Check if the batchId matches any available batch
      const batchMatch = batchList.find((b) => b.id === editForm.batchId)
      console.log(`   ✓ Batch match found:`, batchMatch ? `${batchMatch.name}` : '❌ NO MATCH!')

      if (!batchMatch) {
        console.log('   ⚠️  WARNING: Student\'s batch is not in the batch list!')
      }
    }

    console.log('\n✅ All simulation steps completed successfully!')
    console.log('\nIf the dropdowns are still empty in the browser:')
    console.log('1. Check the browser console for errors')
    console.log('2. Check Network tab to see if API calls are succeeding')
    console.log('3. Verify you\'re logged in as admin')
    console.log('4. Try refreshing the page')

  } catch (error) {
    console.error('\n❌ Error during simulation:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
