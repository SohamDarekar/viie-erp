import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()

    // Find the student
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        batch: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    if (!student.batch) {
      return NextResponse.json(
        { error: 'Student is not assigned to any batch' },
        { status: 400 }
      )
    }

    const oldBatch = student.batch

    // Remove student from batch by setting batchId to null using raw update
    await prisma.$runCommandRaw({
      update: 'students',
      updates: [
        {
          q: { _id: { $oid: params.id } },
          u: { $set: { batchId: null } },
        },
      ],
    })

    // Fetch the updated student
    const updatedStudent = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        batch: true,
      },
    })

    // Create audit log
    await createAuditLog({
      userId: admin.id,
      action: 'REMOVE_FROM_BATCH',
      entity: 'STUDENT',
      entityId: student.id,
      details: {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        oldBatchId: oldBatch.id,
        oldBatchName: oldBatch.name,
      },
    })

    return NextResponse.json({
      message: 'Student removed from batch successfully',
      student: updatedStudent,
    })
  } catch (error: any) {
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    console.error('Remove student from batch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
