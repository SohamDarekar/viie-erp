import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sendEmailAsync, getBulkAnnouncementTemplate } from '@/lib/email'
import { createAuditLog } from '@/lib/audit'

const bulkEmailSchema = z.object({
  recipientType: z.enum(['BATCH', 'PROGRAM', 'ALL']),
  batchId: z.string().optional(),
  program: z.enum(['BS', 'BBA']).optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await req.json()
    const data = bulkEmailSchema.parse(body)

    // Validation
    if (data.recipientType === 'BATCH' && !data.batchId) {
      return NextResponse.json(
        { error: 'batchId required for batch emails' },
        { status: 400 }
      )
    }

    if (data.recipientType === 'PROGRAM' && !data.program) {
      return NextResponse.json(
        { error: 'program required for program emails' },
        { status: 400 }
      )
    }

    // Get recipients
    let students: any[] = []

    if (data.recipientType === 'BATCH') {
      students = await prisma.student.findMany({
        where: { batchId: data.batchId },
        include: {
          user: {
            select: { email: true },
          },
        },
      })
    } else if (data.recipientType === 'PROGRAM') {
      students = await prisma.student.findMany({
        where: { program: data.program },
        include: {
          user: {
            select: { email: true },
          },
        },
      })
    } else {
      students = await prisma.student.findMany({
        include: {
          user: {
            select: { email: true },
          },
        },
      })
    }

    const emails = students.map(s => s.user.email)

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Send emails asynchronously
    const emailTemplate = getBulkAnnouncementTemplate(data.subject, data.message)
    
    await sendEmailAsync({
      to: emails,
      ...emailTemplate,
    })

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'SEND_BULK_EMAIL',
      entity: 'Email',
      details: {
        recipientType: data.recipientType,
        recipientCount: emails.length,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      recipientCount: emails.length,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Bulk email error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
