import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can view their tasks' },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    })

    if (!student) {
      return NextResponse.json({ tasks: [] })
    }

    // Get tasks assigned directly to student
    const directTasks = await prisma.taskAssignment.findMany({
      where: { studentId: student.id },
      include: {
        task: true,
      },
    })

    // Get tasks assigned to student's batch
    const batchTasks = await prisma.taskAssignment.findMany({
      where: { batchId: student.batchId },
      include: {
        task: true,
      },
    })

    const allTasks = [...directTasks, ...batchTasks].map(assignment => ({
      ...assignment.task,
      assignmentId: assignment.id,
      status: assignment.status,
    }))

    return NextResponse.json({ tasks: allTasks })
  } catch (error) {
    console.error('Get student tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
