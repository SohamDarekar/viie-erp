import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  assignmentType: z.enum(['INDIVIDUAL', 'BATCH', 'PROGRAM']),
  // For individual assignment
  studentId: z.string().optional(),
  // For batch assignment
  batchId: z.string().optional(),
  // For program assignment
  program: z.enum(['BS', 'BBA']).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await req.json()
    const data = createTaskSchema.parse(body)

    // Validation based on assignment type
    if (data.assignmentType === 'INDIVIDUAL' && !data.studentId) {
      return NextResponse.json(
        { error: 'studentId required for individual assignment' },
        { status: 400 }
      )
    }

    if (data.assignmentType === 'BATCH' && !data.batchId) {
      return NextResponse.json(
        { error: 'batchId required for batch assignment' },
        { status: 400 }
      )
    }

    if (data.assignmentType === 'PROGRAM' && !data.program) {
      return NextResponse.json(
        { error: 'program required for program assignment' },
        { status: 400 }
      )
    }

    // Use transaction for task creation and assignment
    const result = await prisma.$transaction(async (tx) => {
      // Create task
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          assignmentType: data.assignmentType,
          createdById: session.userId,
        },
      })

      // Create assignments based on type
      if (data.assignmentType === 'INDIVIDUAL') {
        await tx.taskAssignment.create({
          data: {
            taskId: task.id,
            studentId: data.studentId,
          },
        })
      } else if (data.assignmentType === 'BATCH') {
        await tx.taskAssignment.create({
          data: {
            taskId: task.id,
            batchId: data.batchId,
          },
        })
      } else if (data.assignmentType === 'PROGRAM') {
        // Assign to all batches in the program
        const batches = await tx.batch.findMany({
          where: { program: data.program, isActive: true },
        })

        await Promise.all(
          batches.map(batch =>
            tx.taskAssignment.create({
              data: {
                taskId: task.id,
                batchId: batch.id,
              },
            })
          )
        )
      }

      return task
    })

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE_TASK',
      entity: 'Task',
      entityId: result.id,
      details: { assignmentType: data.assignmentType },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({ success: true, task: result })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create task error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin()

    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            email: true,
          },
        },
        assignments: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            batch: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
