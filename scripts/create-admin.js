#!/usr/bin/env node

/**
 * Script to create initial admin user
 * Run with: node scripts/create-admin.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  console.log('=== VIIE ERP - Create Admin User ===\n')

  const username = await question('Admin username: ')
  const email = await question('Admin email: ')
  const password = await question('Admin password (min 8 chars): ')

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters')
    process.exit(1)
  }

  // Check if user exists with email
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUserByEmail) {
    console.error('Error: User with this email already exists')
    process.exit(1)
  }

  // Check if user exists with username
  const existingUserByUsername = await prisma.user.findUnique({
    where: { username },
  })

  if (existingUserByUsername) {
    console.error('Error: User with this username already exists')
    process.exit(1)
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create admin user
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  console.log('\n✓ Admin user created successfully!')
  console.log(`Username: ${user.username}`)
  console.log(`Email: ${user.email}`)
  console.log(`Role: ${user.role}`)
  console.log(`ID: ${user.id}`)

  rl.close()
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
