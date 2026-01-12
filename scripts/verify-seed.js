const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  console.log('📊 Verifying Seeded Data\n');
  console.log('='.repeat(50));

  // Count students per batch
  const batches = await prisma.batch.findMany({
    include: {
      _count: {
        select: { students: true }
      }
    },
    orderBy: [
      { intakeYear: 'asc' },
      { program: 'asc' }
    ]
  });

  console.log('\n📚 Students per Batch:');
  console.log('-'.repeat(50));
  let totalStudents = 0;
  batches.forEach(batch => {
    const count = batch._count.students;
    totalStudents += count;
    console.log(`${batch.name.padEnd(10)} - ${count} students`);
  });
  console.log('-'.repeat(50));
  console.log(`Total: ${totalStudents} students\n`);

  // Count by program
  const bsCount = await prisma.student.count({ where: { program: 'BS' } });
  const bbaCount = await prisma.student.count({ where: { program: 'BBA' } });
  console.log('📖 Students by Program:');
  console.log(`BS:  ${bsCount}`);
  console.log(`BBA: ${bbaCount}\n`);

  // Count by intake year
  console.log('📅 Students by Intake Year:');
  for (let year = 2023; year <= 2026; year++) {
    const count = await prisma.student.count({ where: { intakeYear: year } });
    console.log(`${year}: ${count} students`);
  }

  // Other stats
  console.log('\n📈 Other Statistics:');
  const verifiedCount = await prisma.user.count({ where: { emailVerified: true } });
  const onboardedCount = await prisma.student.count({ where: { hasCompletedOnboarding: true } });
  const taskCount = await prisma.task.count();
  const assignmentCount = await prisma.taskAssignment.count();

  console.log(`Email Verified Users: ${verifiedCount}`);
  console.log(`Completed Onboarding: ${onboardedCount}`);
  console.log(`Tasks Created: ${taskCount}`);
  console.log(`Task Assignments: ${assignmentCount}\n`);

  // Sample students from different batches
  console.log('👥 Sample Students:');
  console.log('-'.repeat(50));
  for (const batch of batches.slice(0, 4)) {
    const student = await prisma.student.findFirst({
      where: { batchId: batch.id },
      include: { user: true }
    });
    if (student) {
      console.log(`${batch.name}: ${student.firstName} ${student.lastName} (${student.user.email})`);
    }
  }
  console.log('\n✅ Data verification complete!\n');
}

verifyData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
