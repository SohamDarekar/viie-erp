import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const assignBatchSchema = z.object({
  studentId: z.string(),
  batchId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await req.json()
    const data = assignBatchSchema.parse(body)

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Verify batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
    })

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // Update student's batch
    const updatedStudent = await prisma.student.update({
      where: { id: data.studentId },
      data: {
        batchId: data.batchId,
      },
      include: {
        batch: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'ASSIGN_BATCH',
      entity: 'Student',
      entityId: student.id,
      details: {
        oldBatchId: student.batchId,
        newBatchId: data.batchId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      student: updatedStudent,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    console.error('Assign batch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
