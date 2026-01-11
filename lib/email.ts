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
