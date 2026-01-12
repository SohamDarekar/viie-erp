import { PrismaClient, Program, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Faker-like data generators
const firstNames = [
  'John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa',
  'James', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Thomas', 'Linda',
  'Charles', 'Barbara', 'Daniel', 'Elizabeth', 'Matthew', 'Susan', 'Christopher', 'Jessica',
  'Andrew', 'Karen', 'Joshua', 'Nancy', 'Joseph', 'Betty', 'Ryan', 'Margaret',
  'Kevin', 'Sandra', 'Brian', 'Ashley', 'George', 'Kimberly', 'Edward', 'Emily',
  'Ronald', 'Donna', 'Timothy', 'Michelle', 'Jason', 'Carol', 'Jeffrey', 'Amanda',
  'Frank', 'Melissa', 'Scott', 'Deborah', 'Eric', 'Stephanie', 'Stephen', 'Rebecca',
  'Raymond', 'Sharon', 'Gregory', 'Laura', 'Samuel', 'Cynthia', 'Patrick', 'Kathleen',
  'Benjamin', 'Amy', 'Jack', 'Shirley', 'Dennis', 'Angela', 'Jerry', 'Helen',
  'Alexander', 'Anna', 'Tyler', 'Brenda', 'Aaron', 'Pamela', 'Jose', 'Nicole',
  'Adam', 'Emma', 'Henry', 'Samantha', 'Nathan', 'Katherine', 'Douglas', 'Christine',
  'Zachary', 'Debra', 'Peter', 'Rachel', 'Kyle', 'Catherine', 'Walter', 'Carolyn',
  'Ethan', 'Janet', 'Jeremy', 'Ruth', 'Harold', 'Maria', 'Keith', 'Heather'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson'
];

const nationalities = [
  'American', 'British', 'Canadian', 'Australian', 'Indian', 'Chinese', 'Japanese',
  'German', 'French', 'Spanish', 'Italian', 'Brazilian', 'Mexican', 'Korean',
  'Pakistani', 'Nigerian', 'Egyptian', 'Turkish', 'Iranian', 'Thai'
];

const countries = [
  'USA', 'UK', 'Canada', 'Australia', 'India', 'China', 'Japan', 'Germany',
  'France', 'Spain', 'Italy', 'Brazil', 'Mexico', 'South Korea', 'Pakistan',
  'Nigeria', 'Egypt', 'Turkey', 'Iran', 'Thailand'
];

const languages = [
  'English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Bengali',
  'Russian', 'Japanese', 'Punjabi', 'German', 'Korean', 'French', 'Telugu',
  'Marathi', 'Turkish', 'Tamil', 'Vietnamese', 'Urdu', 'Italian'
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1-${areaCode}-${prefix}-${lineNumber}`;
}

function generatePassportNumber(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let passport = '';
  for (let i = 0; i < 2; i++) {
    passport += letters[Math.floor(Math.random() * letters.length)];
  }
  for (let i = 0; i < 7; i++) {
    passport += Math.floor(Math.random() * 10);
  }
  return passport;
}

function generatePostalCode(): string {
  return `${Math.floor(Math.random() * 90000) + 10000}`;
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.documentAccessLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.student.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared existing data\n');

  // Create batches for 2023-2026
  console.log('📚 Creating batches...');
  const batches = [];
  const years = [2023, 2024, 2025, 2026];
  const programs: Program[] = ['BS', 'BBA'];

  for (const year of years) {
    for (const program of programs) {
      const batch = await prisma.batch.create({
        data: {
          program,
          intakeYear: year,
          name: `${program}-${year}`,
          isActive: true,
        },
      });
      batches.push(batch);
      console.log(`  ✓ Created batch: ${batch.name}`);
    }
  }
  console.log(`✅ Created ${batches.length} batches\n`);

  // Create admin user
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@viie-erp.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}\n`);

  // Create 200+ students
  console.log('👨‍🎓 Creating students...');
  const totalStudents = 220; // A bit more than 200
  const studentsPerBatch = Math.ceil(totalStudents / batches.length);

  let studentCount = 0;
  for (const batch of batches) {
    const numStudents = Math.min(studentsPerBatch, totalStudents - studentCount);

    for (let i = 0; i < numStudents; i++) {
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@student.viie.edu`;
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 10000)}`;

      const nationality = randomItem(nationalities);
      const countryOfBirth = randomItem(countries);
      const nativeLanguage = randomItem(languages);

      // Create user
      const userPassword = await bcrypt.hash('student123', 10);
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: userPassword,
          role: UserRole.STUDENT,
          emailVerified: Math.random() > 0.3, // 70% verified
          isActive: true,
        },
      });

      // Random date of birth (18-25 years old)
      const today = new Date();
      const minAge = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const maxAge = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      const dateOfBirth = randomDate(minAge, maxAge);

      // Passport dates
      const passportIssueDate = randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31));
      const passportExpiryDate = new Date(passportIssueDate);
      passportExpiryDate.setFullYear(passportExpiryDate.getFullYear() + 10);

      // Create student profile
      const hasCompletedOnboarding = Math.random() > 0.2; // 80% completed onboarding
      
      await prisma.student.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          email,
          phone: generatePhone(),
          dateOfBirth,
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          nationality,
          countryOfBirth,
          nativeLanguage,
          
          // Parent info
          parentName: `${randomItem(firstNames)} ${lastName}`,
          parentPhone: generatePhone(),
          parentEmail: `${lastName.toLowerCase()}parent${Math.floor(Math.random() * 100)}@email.com`,
          
          // Passport info
          passportNumber: generatePassportNumber(),
          nameAsPerPassport: `${firstName} ${lastName}`,
          passportIssueLocation: randomItem(countries),
          passportIssueDate,
          passportExpiryDate,
          
          // Address
          address: `${Math.floor(Math.random() * 9999) + 1} ${randomItem(['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm'])} ${randomItem(['Street', 'Avenue', 'Boulevard', 'Road', 'Lane'])}`,
          postalCode: generatePostalCode(),
          
          // Academic
          program: batch.program,
          intakeYear: batch.intakeYear,
          batchId: batch.id,
          hasCompletedOnboarding,
        },
      });

      studentCount++;
      if (studentCount % 20 === 0) {
        console.log(`  ✓ Created ${studentCount} students...`);
      }
    }
  }
  console.log(`✅ Created ${studentCount} students\n`);

  // Create some tasks
  console.log('📋 Creating sample tasks...');
  const tasks = [];
  const taskTitles = [
    { title: 'Submit I-20 Application', description: 'Complete and submit your I-20 application form with all required documents.' },
    { title: 'Upload Passport Copy', description: 'Upload a clear, colored copy of your passport bio page.' },
    { title: 'Complete Health Insurance Form', description: 'Fill out the health insurance waiver or enrollment form.' },
    { title: 'Submit IELTS Scores', description: 'Upload official IELTS score report.' },
    { title: 'Housing Application', description: 'Complete on-campus housing application if interested.' },
    { title: 'Financial Documents', description: 'Submit bank statements and financial sponsor documents.' },
    { title: 'Orientation Registration', description: 'Register for the new student orientation session.' },
    { title: 'Course Selection', description: 'Select your first semester courses in the student portal.' },
  ];

  for (const taskData of taskTitles) {
    const task = await prisma.task.create({
      data: {
        title: taskData.title,
        description: taskData.description,
        dueDate: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        assignmentType: 'BATCH',
        createdById: adminUser.id,
      },
    });
    tasks.push(task);
  }
  console.log(`✅ Created ${tasks.length} tasks\n`);

  // Assign tasks to batches
  console.log('🔗 Assigning tasks to batches...');
  let assignmentCount = 0;
  for (const task of tasks) {
    // Assign to 2-4 random batches
    const numBatches = Math.floor(Math.random() * 3) + 2;
    const selectedBatches = batches.sort(() => Math.random() - 0.5).slice(0, numBatches);
    
    for (const batch of selectedBatches) {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          batchId: batch.id,
          status: randomItem(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
          completedAt: Math.random() > 0.6 ? new Date() : null,
        },
      });
      assignmentCount++;
    }
  }
  console.log(`✅ Created ${assignmentCount} task assignments\n`);

  // Summary
  console.log('📊 Seeding Summary:');
  console.log('===================');
  console.log(`Batches: ${batches.length}`);
  console.log(`Students: ${studentCount}`);
  console.log(`Admin Users: 1`);
  console.log(`Tasks: ${tasks.length}`);
  console.log(`Task Assignments: ${assignmentCount}`);
  console.log('\n✨ Database seeding completed successfully!\n');
  
  console.log('📝 Test Credentials:');
  console.log('  Admin: admin@viie-erp.com / admin123');
  console.log('  Students: Use any student email / student123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
