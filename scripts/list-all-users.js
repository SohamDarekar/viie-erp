#!/usr/bin/env node

/**
 * List all users in the database with their roles
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n=== All Users in Database ===\n')

  const users = await prisma.user.findMany({
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (users.length === 0) {
    console.log('No users found in database')
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${users.length} user(s):\n`)

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.role === 'ADMIN' ? '👑' : '👤'} ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Username: ${user.username}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`)
    console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`)
    if (user.student) {
      console.log(`   Student: ${user.student.firstName} ${user.student.lastName}`)
    }
    console.log('')
  })

  await prisma.$disconnect()
}

main().catch(console.error)
