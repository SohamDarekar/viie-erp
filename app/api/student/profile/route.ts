import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  countryOfBirth: z.string().optional(),
  nativeLanguage: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().optional(),
  passportNumber: z.string().optional(),
  nameAsPerPassport: z.string().optional(),
  passportIssueLocation: z.string().optional(),
  passportIssueDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  // Education fields
  school: z.string().optional(),
  schoolCountry: z.string().optional(),
  schoolAddress: z.string().optional(),
  schoolStartDate: z.string().optional(),
  schoolEndDate: z.string().optional(),
  schoolGrade: z.string().optional(),
  highSchool: z.string().optional(),
  highSchoolCountry: z.string().optional(),
  highSchoolAddress: z.string().optional(),
  highSchoolStartDate: z.string().optional(),
  highSchoolEndDate: z.string().optional(),
  highSchoolGrade: z.string().optional(),
  bachelorsIn: z.string().optional(),
  bachelorsFromInstitute: z.string().optional(),
  bachelorsCountry: z.string().optional(),
  bachelorsAddress: z.string().optional(),
  bachelorsStartDate: z.string().optional(),
  bachelorsEndDate: z.string().optional(),
  bachelorsGrade: z.string().optional(),
  greTaken: z.boolean().optional(),
  toeflTaken: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can access this endpoint' },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      include: {
        batch: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ student })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can update their profile' },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = updateProfileSchema.parse(body)

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.nationality !== undefined && { nationality: data.nationality }),
        ...(data.countryOfBirth !== undefined && { countryOfBirth: data.countryOfBirth }),
        ...(data.nativeLanguage !== undefined && { nativeLanguage: data.nativeLanguage }),
        ...(data.parentName !== undefined && { parentName: data.parentName }),
        ...(data.parentPhone !== undefined && { parentPhone: data.parentPhone }),
        ...(data.parentEmail !== undefined && { parentEmail: data.parentEmail }),
        ...(data.passportNumber !== undefined && { passportNumber: data.passportNumber }),
        ...(data.nameAsPerPassport !== undefined && { nameAsPerPassport: data.nameAsPerPassport }),
        ...(data.passportIssueLocation !== undefined && { passportIssueLocation: data.passportIssueLocation }),
        ...(data.passportIssueDate && { passportIssueDate: new Date(data.passportIssueDate) }),
        ...(data.passportExpiryDate && { passportExpiryDate: new Date(data.passportExpiryDate) }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        // Education fields
        ...(data.school !== undefined && { school: data.school }),
        ...(data.schoolCountry !== undefined && { schoolCountry: data.schoolCountry }),
        ...(data.schoolAddress !== undefined && { schoolAddress: data.schoolAddress }),
        ...(data.schoolStartDate && { schoolStartDate: new Date(data.schoolStartDate) }),
        ...(data.schoolEndDate && { schoolEndDate: new Date(data.schoolEndDate) }),
        ...(data.schoolGrade !== undefined && { schoolGrade: data.schoolGrade }),
        ...(data.highSchool !== undefined && { highSchool: data.highSchool }),
        ...(data.highSchoolCountry !== undefined && { highSchoolCountry: data.highSchoolCountry }),
        ...(data.highSchoolAddress !== undefined && { highSchoolAddress: data.highSchoolAddress }),
        ...(data.highSchoolStartDate && { highSchoolStartDate: new Date(data.highSchoolStartDate) }),
        ...(data.highSchoolEndDate && { highSchoolEndDate: new Date(data.highSchoolEndDate) }),
        ...(data.highSchoolGrade !== undefined && { highSchoolGrade: data.highSchoolGrade }),
        ...(data.bachelorsIn !== undefined && { bachelorsIn: data.bachelorsIn }),
        ...(data.bachelorsFromInstitute !== undefined && { bachelorsFromInstitute: data.bachelorsFromInstitute }),
        ...(data.bachelorsCountry !== undefined && { bachelorsCountry: data.bachelorsCountry }),
        ...(data.bachelorsAddress !== undefined && { bachelorsAddress: data.bachelorsAddress }),
        ...(data.bachelorsStartDate && { bachelorsStartDate: new Date(data.bachelorsStartDate) }),
        ...(data.bachelorsEndDate && { bachelorsEndDate: new Date(data.bachelorsEndDate) }),
        ...(data.bachelorsGrade !== undefined && { bachelorsGrade: data.bachelorsGrade }),
        ...(data.greTaken !== undefined && { greTaken: data.greTaken }),
        ...(data.toeflTaken !== undefined && { toeflTaken: data.toeflTaken }),
      },
      include: {
        batch: true,
      },
    })

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE_PROFILE',
      entity: 'Student',
      entityId: student.id,
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

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
