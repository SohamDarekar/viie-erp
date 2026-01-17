const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Checking batches in database...\n')
  
  const batches = await prisma.batch.findMany({
    include: {
      _count: {
        select: { students: true },
      },
    },
  })
  
  console.log(`Found ${batches.length} batches:\n`)
  
  batches.forEach((batch) => {
    console.log(`- ${batch.name}`)
    console.log(`  ID: ${batch.id}`)
    console.log(`  Code: ${batch.code || 'N/A'}`)
    console.log(`  Program: ${batch.program}`)
    console.log(`  Intake Year: ${batch.intakeYear}`)
    console.log(`  Active: ${batch.isActive}`)
    console.log(`  Students: ${batch._count.students}`)
    console.log('')
  })
  
  const students = await prisma.student.findMany({
    include: {
      user: {
        select: { email: true },
      },
      batch: true,
    },
  })
  
  console.log(`\nFound ${students.length} students:\n`)
  
  students.forEach((student) => {
    console.log(`- ${student.firstName} ${student.lastName}`)
    console.log(`  Email: ${student.user.email}`)
    console.log(`  Program: ${student.program}`)
    console.log(`  Intake Year: ${student.intakeYear}`)
    console.log(`  Batch: ${student.batch ? student.batch.name : 'None'}`)
    console.log('')
  })
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
