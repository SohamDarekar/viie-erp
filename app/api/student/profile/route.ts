import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { calculateProfileCompletion } from '@/lib/profile-completion'
import { validateAndNormalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

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
  parentRelation: z.string().optional(),
  passportNumber: z.string().optional(),
  passportGivenName: z.string().optional(),
  passportLastName: z.string().optional(),
  passportIssueLocation: z.string().optional(),
  passportIssueDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  // Course details
  program: z.enum(['BS', 'BBA']).optional(),
  intakeYear: z.number().int().min(2020).optional(),
  // Travel fields
  travelHistory: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    country: z.string(),
    reason: z.string(),
  })).optional(),
  visaRefused: z.boolean().optional(),
  visaRefusedCountry: z.string().optional(),
  // Education fields
  school: z.string().optional(),
  schoolCountry: z.string().optional(),
  schoolAddress: z.string().optional(),
  schoolStartYear: z.number().int().optional(),
  schoolEndYear: z.number().int().optional(),
  schoolGrade: z.string().optional(),
  highSchool: z.string().optional(),
  highSchoolCountry: z.string().optional(),
  highSchoolAddress: z.string().optional(),
  highSchoolStartYear: z.number().int().optional(),
  highSchoolEndYear: z.number().int().optional(),
  highSchoolGrade: z.string().optional(),
  bachelorsIn: z.string().optional(),
  bachelorsFromInstitute: z.string().optional(),
  bachelorsCountry: z.string().optional(),
  bachelorsAddress: z.string().optional(),
  bachelorsStartDate: z.string().optional(),
  bachelorsEndDate: z.string().optional(),
  bachelorsGrade: z.string().optional(),
  bachelorsCompleted: z.boolean().optional(),
  greTaken: z.boolean().optional(),
  greScore: z.string().optional(),
  toeflTaken: z.boolean().optional(),
  toeflScore: z.string().optional(),
  languageTest: z.string().optional(),
  languageTestScore: z.string().optional(),
  languageTestDate: z.string().optional(),
  // Financial fields
  personalEverEmployed: z.string().optional(),
  personalTakingLoan: z.string().optional(),
  personalLoanAmount: z.string().optional(),
  personalLoanBankName: z.string().optional(),
  motherIncomeType: z.string().optional(),
  fatherIncomeType: z.string().optional(),
  otherSources: z.array(z.object({
    id: z.string(),
    name: z.string(),
    relationship: z.string(),
    age: z.string(),
    dateOfBirth: z.string(),
    incomeType: z.string(),
  })).optional(),
  // Work experience fields
  hasWorkExperience: z.boolean().optional(),
  workExperiences: z.array(z.object({
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
  })).optional(),
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
        batch: {
          include: {
            formVisibility: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
        workExperiences: {
          include: {
            reference: true,
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
      include: {
        batch: {
          include: {
            formVisibility: true,
          },
        },
        workExperiences: true,
        documents: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = updateProfileSchema.parse(body)

    // Validate and normalize phone numbers if provided
    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      const phoneValidation = validateAndNormalizePhone(data.phone)
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid phone number: ${phoneValidation.error}` },
          { status: 400 }
        )
      }
      data.phone = phoneValidation.normalized
    }
    
    if (data.parentPhone !== undefined && data.parentPhone !== null && data.parentPhone !== '') {
      const parentPhoneValidation = validateAndNormalizePhone(data.parentPhone)
      if (!parentPhoneValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid parent phone number: ${parentPhoneValidation.error}` },
          { status: 400 }
        )
      }
      data.parentPhone = parentPhoneValidation.normalized
    }

    const formVisibility = student.batch?.formVisibility || null

    const profileCompletion = calculateProfileCompletion({
      ...student,
      ...data,
    }, formVisibility)

    // Update student profile
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        profileCompletion,
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
        ...(data.parentRelation !== undefined && { parentRelation: data.parentRelation }),
        ...(data.passportNumber !== undefined && { passportNumber: data.passportNumber }),
        ...(data.passportGivenName !== undefined && { passportGivenName: data.passportGivenName }),
        ...(data.passportLastName !== undefined && { passportLastName: data.passportLastName }),
        ...(data.passportIssueLocation !== undefined && { passportIssueLocation: data.passportIssueLocation }),
        ...(data.passportIssueDate && { passportIssueDate: new Date(data.passportIssueDate) }),
        ...(data.passportExpiryDate && { passportExpiryDate: new Date(data.passportExpiryDate) }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        // Course details
        ...(data.program && { program: data.program }),
        ...(data.intakeYear && { intakeYear: data.intakeYear }),
        // Travel fields
        ...(data.travelHistory !== undefined && { travelHistory: data.travelHistory }),
        ...(data.visaRefused !== undefined && { visaRefused: data.visaRefused }),
        ...(data.visaRefusedCountry !== undefined && { visaRefusedCountry: data.visaRefusedCountry }),
        // Education fields
        ...(data.school !== undefined && { school: data.school }),
        ...(data.schoolCountry !== undefined && { schoolCountry: data.schoolCountry }),
        ...(data.schoolAddress !== undefined && { schoolAddress: data.schoolAddress }),
        ...(data.schoolStartYear !== undefined && { schoolStartYear: data.schoolStartYear }),
        ...(data.schoolEndYear !== undefined && { schoolEndYear: data.schoolEndYear }),
        ...(data.schoolGrade !== undefined && { schoolGrade: data.schoolGrade }),
        ...(data.highSchool !== undefined && { highSchool: data.highSchool }),
        ...(data.highSchoolCountry !== undefined && { highSchoolCountry: data.highSchoolCountry }),
        ...(data.highSchoolAddress !== undefined && { highSchoolAddress: data.highSchoolAddress }),
        ...(data.highSchoolStartYear !== undefined && { highSchoolStartYear: data.highSchoolStartYear }),
        ...(data.highSchoolEndYear !== undefined && { highSchoolEndYear: data.highSchoolEndYear }),
        ...(data.highSchoolGrade !== undefined && { highSchoolGrade: data.highSchoolGrade }),
        ...(data.bachelorsIn !== undefined && { bachelorsIn: data.bachelorsIn }),
        ...(data.bachelorsFromInstitute !== undefined && { bachelorsFromInstitute: data.bachelorsFromInstitute }),
        ...(data.bachelorsCountry !== undefined && { bachelorsCountry: data.bachelorsCountry }),
        ...(data.bachelorsAddress !== undefined && { bachelorsAddress: data.bachelorsAddress }),
        ...(data.bachelorsStartDate && { bachelorsStartDate: new Date(data.bachelorsStartDate) }),
        ...(data.bachelorsEndDate && { bachelorsEndDate: new Date(data.bachelorsEndDate) }),
        ...(data.bachelorsGrade !== undefined && { bachelorsGrade: data.bachelorsGrade }),
        ...(data.bachelorsCompleted !== undefined && { bachelorsCompleted: data.bachelorsCompleted }),
        ...(data.greTaken !== undefined && { greTaken: data.greTaken }),
        ...(data.greScore !== undefined && { greScore: data.greScore }),
        ...(data.toeflTaken !== undefined && { toeflTaken: data.toeflTaken }),
        ...(data.toeflScore !== undefined && { toeflScore: data.toeflScore }),
        ...(data.languageTest !== undefined && { languageTest: data.languageTest }),
        ...(data.languageTestScore !== undefined && { languageTestScore: data.languageTestScore }),
        ...(data.languageTestDate && { languageTestDate: new Date(data.languageTestDate) }),
        // Financial fields
        ...(data.personalEverEmployed !== undefined && { personalEverEmployed: data.personalEverEmployed }),
        ...(data.personalTakingLoan !== undefined && { personalTakingLoan: data.personalTakingLoan }),
        ...(data.personalLoanAmount !== undefined && { personalLoanAmount: data.personalLoanAmount }),
        ...(data.personalLoanBankName !== undefined && { personalLoanBankName: data.personalLoanBankName }),
        ...(data.motherIncomeType !== undefined && { motherIncomeType: data.motherIncomeType }),
        ...(data.fatherIncomeType !== undefined && { fatherIncomeType: data.fatherIncomeType }),
        ...(data.otherSources !== undefined && { otherSources: data.otherSources }),
        ...(data.hasWorkExperience !== undefined && { hasWorkExperience: data.hasWorkExperience }),
      },
      include: {
        batch: true,
      },
    })

    // Handle work experience updates
    if (data.hasWorkExperience !== undefined) {
      if (!data.hasWorkExperience) {
        // Delete all existing work experiences if user now has no experience
        await prisma.workExperience.deleteMany({
          where: { studentId: student.id },
        })
      } else if (data.workExperiences && data.workExperiences.length > 0) {
        // Delete existing work experiences and create new ones
        await prisma.workExperience.deleteMany({
          where: { studentId: student.id },
        })

        // Create new work experiences
        for (const workExp of data.workExperiences) {
          const createdWorkExp = await prisma.workExperience.create({
            data: {
              studentId: student.id,
              jobTitle: workExp.jobTitle,
              organizationName: workExp.organizationName,
              organizationAddress: workExp.organizationAddress,
              organizationContact: workExp.organizationContact,
              startDate: new Date(workExp.startDate),
              endDate: new Date(workExp.endDate),
            },
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
    }

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
