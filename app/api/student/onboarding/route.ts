import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { assignStudentToBatch } from '@/lib/batch'
import { createAuditLog } from '@/lib/audit'

const workExperienceSchema = z.object({
  jobTitle: z.string().min(1),
  organizationName: z.string().min(1),
  organizationAddress: z.string().optional(),
  organizationContact: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  hasReference: z.boolean(),
  reference: z.object({
    name: z.string().min(1),
    position: z.string().min(1),
    title: z.string().optional(),
    workEmail: z.string().email(),
    phone: z.string().min(1),
    durationKnown: z.string().optional(),
    relationship: z.string().optional(),
    institution: z.string().optional(),
    institutionAddress: z.string().optional(),
  }).optional(),
})

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
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
  program: z.enum(['BS', 'BBA']),
  intakeYear: z.number().int().min(2020),
  hasWorkExperience: z.boolean().optional(),
  workExperiences: z.array(workExperienceSchema).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can complete onboarding' },
        { status: 403 }
      )
    }

    // Check if already completed
    const existingStudent = await prisma.student.findUnique({
      where: { userId: session.userId },
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Onboarding already completed' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const data = onboardingSchema.parse(body)

    // Automatic batch assignment using transaction
    const batchId = await assignStudentToBatch({
      program: data.program,
      intakeYear: data.intakeYear,
    })

    // Create student profile
    const studentData: any = {
      userId: session.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      program: data.program,
      intakeYear: data.intakeYear,
      batchId,
      hasCompletedOnboarding: true,
      hasWorkExperience: data.hasWorkExperience || false,
    }
    
    // Add optional fields only if they exist
    if (data.email) studentData.email = data.email
    if (data.phone) studentData.phone = data.phone
    if (data.dateOfBirth) studentData.dateOfBirth = new Date(data.dateOfBirth)
    if (data.gender) studentData.gender = data.gender
    if (data.nationality) studentData.nationality = data.nationality
    if (data.countryOfBirth) studentData.countryOfBirth = data.countryOfBirth
    if (data.nativeLanguage) studentData.nativeLanguage = data.nativeLanguage
    if (data.parentName) studentData.parentName = data.parentName
    if (data.parentPhone) studentData.parentPhone = data.parentPhone
    if (data.parentEmail) studentData.parentEmail = data.parentEmail
    if (data.passportNumber) studentData.passportNumber = data.passportNumber
    if (data.nameAsPerPassport) studentData.nameAsPerPassport = data.nameAsPerPassport
    if (data.passportIssueLocation) studentData.passportIssueLocation = data.passportIssueLocation
    if (data.passportIssueDate) studentData.passportIssueDate = new Date(data.passportIssueDate)
    if (data.passportExpiryDate) studentData.passportExpiryDate = new Date(data.passportExpiryDate)
    if (data.address) studentData.address = data.address
    if (data.postalCode) studentData.postalCode = data.postalCode

    const student = await prisma.student.create({
      data: studentData,
    })

    // Create work experiences if provided
    if (data.workExperiences && data.workExperiences.length > 0) {
      for (const workExp of data.workExperiences) {
        const workExperienceData: any = {
          studentId: student.id,
          jobTitle: workExp.jobTitle,
          organizationName: workExp.organizationName,
          organizationAddress: workExp.organizationAddress,
          organizationContact: workExp.organizationContact,
          startDate: new Date(workExp.startDate),
          endDate: new Date(workExp.endDate),
        }

        // Create work experience
        const createdWorkExp = await prisma.workExperience.create({
          data: workExperienceData,
        })

        // Create reference if provided
        if (workExp.hasReference && workExp.reference) {
          await prisma.reference.create({
            data: {
              workExperienceId: createdWorkExp.id,
              name: workExp.reference.name,
              position: workExp.reference.position,
              title: workExp.reference.title,
              workEmail: workExp.reference.workEmail,
              phone: workExp.reference.phone,
              durationKnown: workExp.reference.durationKnown,
              relationship: workExp.reference.relationship,
              institution: workExp.reference.institution,
              institutionAddress: workExp.reference.institutionAddress,
            },
          })
        }
      }
    }

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'COMPLETE_ONBOARDING',
      entity: 'Student',
      entityId: student.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        program: student.program,
        batchId: student.batchId,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      include: {
        batch: true,
      },
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Get student error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
