import nodemailer from 'nodemailer'
import { prisma } from './prisma'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to]

  for (const recipient of recipients) {
    const emailLog = await prisma.emailLog.create({
      data: {
        recipient,
        subject: options.subject,
        body: options.html,
        status: 'PENDING',
      },
    })

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: recipient,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      })

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch (error: any) {
      console.error('Email send error:', error)
      
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      })
    }
  }
}

// Async email sending (non-blocking)
export async function sendEmailAsync(options: EmailOptions): Promise<void> {
  // Queue email for background processing
  setImmediate(() => {
    sendEmail(options).catch(error => {
      console.error('Async email error:', error)
    })
  })
}

// Email templates
export function getDocumentReminderTemplate(studentName: string, documentType: string) {
  return {
    subject: 'Document Upload Reminder',
    html: `
      <h2>Hello ${studentName},</h2>
      <p>This is a reminder to upload your <strong>${documentType}</strong> document.</p>
      <p>Please log in to your account to upload the required document.</p>
      <p>Best regards,<br/>VIIE ERP Team</p>
    `,
  }
}

export function getTaskAssignedTemplate(studentName: string, taskTitle: string, dueDate?: Date) {
  return {
    subject: 'New Task Assigned',
    html: `
      <h2>Hello ${studentName},</h2>
      <p>A new task has been assigned to you: <strong>${taskTitle}</strong></p>
      ${dueDate ? `<p>Due date: ${dueDate.toLocaleDateString()}</p>` : ''}
      <p>Please log in to your account to view task details.</p>
      <p>Best regards,<br/>VIIE ERP Team</p>
    `,
  }
}

export function getResourceUploadedTemplate(studentName: string, resourceTitle: string) {
  return {
    subject: 'New Resource Available',
    html: `
      <h2>Hello ${studentName},</h2>
      <p>A new resource has been uploaded: <strong>${resourceTitle}</strong></p>
      <p>Please log in to your account to access the resource.</p>
      <p>Best regards,<br/>VIIE ERP Team</p>
    `,
  }
}

export function getBulkAnnouncementTemplate(subject: string, message: string) {
  return {
    subject,
    html: `
      <h2>${subject}</h2>
      <div>${message}</div>
      <br/>
      <p>Best regards,<br/>VIIE ERP Team</p>
    `,
  }
}

export function getEmailVerificationTemplate(email: string, verificationUrl: string) {
  return {
    subject: 'Verify your email - VIIE ERP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #5568d3; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to VIIE ERP!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for registering with VIIE ERP. To complete your registration and access your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <div class="note">
              <strong>Note:</strong> This verification link will expire in 24 hours for security purposes.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            
            <p>If you didn't create an account with VIIE ERP, you can safely ignore this email.</p>
            
            <p>Best regards,<br/>The VIIE ERP Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} VIIE ERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to VIIE ERP!

Verify Your Email Address

Thank you for registering with VIIE ERP. To complete your registration and access your account, please verify your email address by clicking the link below:

${verificationUrl}

Note: This verification link will expire in 24 hours for security purposes.

If you didn't create an account with VIIE ERP, you can safely ignore this email.

Best regards,
The VIIE ERP Team
    `,
  }
}
