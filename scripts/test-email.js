#!/usr/bin/env node

/**
 * Test email configuration
 * Run with: node scripts/test-email.js
 */

const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

// Load .env file
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

async function testEmail() {
  console.log('=== Testing Email Configuration ===\n')
  
  console.log('SMTP Configuration:')
  console.log('Host:', process.env.SMTP_HOST)
  console.log('Port:', process.env.SMTP_PORT)
  console.log('User:', process.env.SMTP_USER)
  console.log('From:', process.env.SMTP_FROM)
  console.log()

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  try {
    console.log('Verifying SMTP connection...')
    await transporter.verify()
    console.log('✓ SMTP connection verified!\n')

    const testEmail = process.env.SMTP_USER
    console.log(`Sending test email to ${testEmail}...`)

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: testEmail,
      subject: 'VIIE ERP - Email Configuration Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>If you're reading this, your email configuration is working correctly!</p>
        <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
        <p>You can now use email verification in your VIIE ERP application.</p>
      `,
    })

    console.log('✓ Test email sent successfully!')
    console.log('\n✅ Email configuration is working correctly!')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('\nPlease check your SMTP credentials in the .env file')
  }
}

testEmail()
