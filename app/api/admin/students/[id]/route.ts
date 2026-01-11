import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createAuditLog } from '@/lib/audit'

const updateStudentSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  program: z.enum(['BS', 'BBA']).optional(),
  batchId: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
          },
        },
        batch: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ student })
  } catch (error: any) {
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    console.error('Get student error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    const data = updateStudentSchema.parse(body)

    // Find existing student
    const existingStudent = await prisma.student.findUnique({
      where: { id: params.id },
      include: { user: true },
    })

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const studentUpdate: any = {}
    const userUpdate: any = {}

    if (data.firstName) studentUpdate.firstName = data.firstName
    if (data.lastName) studentUpdate.lastName = data.lastName
    if (data.phone) studentUpdate.phone = data.phone
    if (data.dateOfBirth) studentUpdate.dateOfBirth = new Date(data.dateOfBirth)
    if (data.gender) studentUpdate.gender = data.gender
    if (data.nationality) studentUpdate.nationality = data.nationality
    if (data.program) studentUpdate.program = data.program
    if (data.batchId) studentUpdate.batchId = data.batchId

    if (data.email) {
      userUpdate.email = data.email
      studentUpdate.email = data.email
    }
    if (data.username) userUpdate.username = data.username

    // Update user if there are user updates
    if (Object.keys(userUpdate).length > 0) {
      // Check if email or username already exists for another user
      if (data.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: data.email },
        })
        if (existingEmail && existingEmail.id !== existingStudent.userId) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 400 }
          )
        }
      }

      if (data.username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: data.username },
        })
        if (existingUsername && existingUsername.id !== existingStudent.userId) {
          return NextResponse.json(
            { error: 'Username already in use' },
            { status: 400 }
          )
        }
      }

      await prisma.user.update({
        where: { id: existingStudent.userId },
        data: userUpdate,
      })
    }

    // Update student
    const student = await prisma.student.update({
      where: { id: params.id },
      data: studentUpdate,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
          },
        },
        batch: true,
      },
    })

    // Audit log
    await createAuditLog({
      userId: admin.userId,
      action: 'UPDATE',
      entity: 'Student',
      entityId: params.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      student,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    console.error('Update student error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()

    // Find student
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: { user: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // First, create audit log before deletion
    await createAuditLog({
      userId: admin.userId,
      action: 'DELETE',
      entity: 'Student',
      entityId: params.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    // Delete all audit logs associated with this user to avoid foreign key constraint
    await prisma.auditLog.deleteMany({
      where: { userId: student.userId },
    })

    // Delete student (will cascade delete user due to onDelete: Cascade in schema)
    await prisma.user.delete({
      where: { id: student.userId },
    })

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    })
  } catch (error: any) {
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    console.error('Delete student error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
