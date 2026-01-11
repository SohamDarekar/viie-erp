#!/usr/bin/env node

/**
 * Check user email verification status
 * Run with: node scripts/check-user.js <email>
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('Usage: node scripts/check-user.js <email>')
    process.exit(1)
  }

  console.log(`\n=== Checking user: ${email} ===\n`)

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: true,
    },
  })

  if (!user) {
    console.log('❌ User not found')
    await prisma.$disconnect()
    return
  }

  console.log('User Details:')
  console.log('ID:', user.id)
  console.log('Username:', user.username)
  console.log('Email:', user.email)
  console.log('Email Verified:', user.emailVerified ? '✅ Yes' : '❌ No')
  console.log('Verification Token:', user.verificationToken || 'None')
  console.log('Role:', user.role)
  console.log('Active:', user.isActive ? '✅ Yes' : '❌ No')
  console.log('Created:', user.createdAt)
  
  if (user.student) {
    console.log('\nStudent Profile:')
    console.log('Onboarding Complete:', user.student.hasCompletedOnboarding ? '✅ Yes' : '❌ No')
  } else {
    console.log('\nStudent Profile: Not created yet')
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
