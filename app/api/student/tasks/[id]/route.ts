import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { status } = updateStatusSchema.parse(body)

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    // Verify assignment belongs to student
    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        id: params.id,
        OR: [
          { studentId: student.id },
          { batchId: student.batchId },
        ],
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Task assignment not found' },
        { status: 404 }
      )
    }

    // Update status
    const updated = await prisma.taskAssignment.update({
      where: { id: params.id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, assignment: updated })
  } catch (error) {
    console.error('Update task status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
