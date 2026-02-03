import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { assignStudentToBatch } from '@/lib/batch'
import { createAuditLog } from '@/lib/audit'
import { calculateProfileCompletion } from '@/lib/profile-completion'
import { saveFile } from '@/lib/file'
import { validateAndNormalizePhone } from '@/lib/phone'

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
  parentRelation: z.string().optional(),
  passportNumber: z.string().optional(),
  passportGivenName: z.string().optional(),
  passportLastName: z.string().optional(),
  passportIssueLocation: z.string().optional(),
  passportIssueDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  program: z.enum(['BS', 'BBA']),
  intakeYear: z.number().int().min(2020),
  hasWorkExperience: z.boolean().optional(),
  workExperiences: z.array(workExperienceSchema).optional(),
  
  // Education fields
  school: z.string().optional(),
  schoolCountry: z.string().optional(),
  schoolAddress: z.string().optional(),
  schoolStartYear: z.number().int().optional(), // Changed from Date string
  schoolEndYear: z.number().int().optional(), // Changed from Date string
  schoolGrade: z.string().optional(),
  highSchool: z.string().optional(),
  highSchoolCountry: z.string().optional(),
  highSchoolAddress: z.string().optional(),
  highSchoolStartYear: z.number().int().optional(), // Changed from Date string
  highSchoolEndYear: z.number().int().optional(), // Changed from Date string
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
  languageTestDate: z.string().optional(), // Added
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

    // Check content type to determine how to parse the request
    const contentType = req.headers.get('content-type') || ''
    let body: any
    let files: { marksheet10th?: File; marksheet12th?: File; ieltsScorecard?: File; passport?: File; languageTestScorecard?: File } = {}

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await req.formData()
      body = {}
      
      // Convert FormData to object and extract files
      formData.forEach((value, key) => {
        if (value instanceof File) {
          // Store files separately
          if (key === 'marksheet10th' || key === 'marksheet12th' || key === 'ieltsScorecard' || key === 'passport' || key === 'languageTestScorecard') {
            files[key as keyof typeof files] = value
          }
        } else if (typeof value === 'string') {
          body[key] = value
        }
      })
      
      // Convert year fields to numbers for FormData
      const yearFields = ['schoolStartYear', 'schoolEndYear', 'highSchoolStartYear', 'highSchoolEndYear', 'intakeYear']
      yearFields.forEach(field => {
        if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
          const parsed = parseInt(body[field])
          if (!isNaN(parsed)) {
            body[field] = parsed
          }
        }
      })
      
    } else {
      // Handle JSON
      try {
        const rawBody = await req.text()
        console.log('Raw JSON body:', rawBody.substring(0, 300))
        body = JSON.parse(rawBody)
      } catch (parseError: any) {
        console.error('JSON Parse Error:', parseError.message)
        return NextResponse.json(
          { error: 'Invalid request format. Please check your input and try again.' },
          { status: 400 }
        )
      }
    }
    
    // Convert year fields to numbers if they exist and are valid
    const yearFields = ['schoolStartYear', 'schoolEndYear', 'highSchoolStartYear', 'highSchoolEndYear', 'intakeYear']
    yearFields.forEach(field => {
      if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
        const parsed = parseInt(body[field])
        if (!isNaN(parsed)) {
          body[field] = parsed
        }
      }
    })
    
    // Validate with Zod
    let data
    try {
      data = onboardingSchema.parse(body)
    } catch (validationError: any) {
      console.error('Validation Error:', validationError)
      return NextResponse.json(
        { error: 'Invalid input', details: validationError.errors },
        { status: 400 }
      )
    }

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
    }
    
    // Only set hasWorkExperience if explicitly provided
    if (data.hasWorkExperience !== undefined) {
      studentData.hasWorkExperience = data.hasWorkExperience
    }
    
    // Add optional personal fields
    if (data.email) studentData.email = data.email
    
    // Validate and normalize phone number (server-side validation)
    if (data.phone) {
      const phoneValidation = validateAndNormalizePhone(data.phone)
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid phone number: ${phoneValidation.error}` },
          { status: 400 }
        )
      }
      studentData.phone = phoneValidation.normalized
    }
    
    // Validate and normalize parent phone number
    if (data.parentPhone) {
      const parentPhoneValidation = validateAndNormalizePhone(data.parentPhone)
      if (!parentPhoneValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid parent phone number: ${parentPhoneValidation.error}` },
          { status: 400 }
        )
      }
      studentData.parentPhone = parentPhoneValidation.normalized
    }
    
    if (data.dateOfBirth) studentData.dateOfBirth = new Date(data.dateOfBirth)
    if (data.gender) studentData.gender = data.gender
    if (data.nationality) studentData.nationality = data.nationality
    if (data.countryOfBirth) studentData.countryOfBirth = data.countryOfBirth
    if (data.nativeLanguage) studentData.nativeLanguage = data.nativeLanguage
    if (data.parentName) studentData.parentName = data.parentName
    // parentPhone already handled with validation above
    if (data.parentEmail) studentData.parentEmail = data.parentEmail
    if (data.parentRelation) studentData.parentRelation = data.parentRelation
    if (data.passportNumber) studentData.passportNumber = data.passportNumber
    if (data.passportGivenName) studentData.passportGivenName = data.passportGivenName
    if (data.passportLastName) studentData.passportLastName = data.passportLastName
    if (data.passportIssueLocation) studentData.passportIssueLocation = data.passportIssueLocation
    if (data.passportIssueDate) studentData.passportIssueDate = new Date(data.passportIssueDate)
    if (data.passportExpiryDate) studentData.passportExpiryDate = new Date(data.passportExpiryDate)
    if (data.address) studentData.address = data.address
    if (data.postalCode) studentData.postalCode = data.postalCode
    
    // Add education fields
    if (data.school) studentData.school = data.school
    if (data.schoolCountry) studentData.schoolCountry = data.schoolCountry
    if (data.schoolAddress) studentData.schoolAddress = data.schoolAddress
    if (data.schoolStartYear) studentData.schoolStartYear = data.schoolStartYear // Now an Int
    if (data.schoolEndYear) studentData.schoolEndYear = data.schoolEndYear // Now an Int
    if (data.schoolGrade) studentData.schoolGrade = data.schoolGrade
    if (data.highSchool) studentData.highSchool = data.highSchool
    if (data.highSchoolCountry) studentData.highSchoolCountry = data.highSchoolCountry
    if (data.highSchoolAddress) studentData.highSchoolAddress = data.highSchoolAddress
    if (data.highSchoolStartYear) studentData.highSchoolStartYear = data.highSchoolStartYear // Now an Int
    if (data.highSchoolEndYear) studentData.highSchoolEndYear = data.highSchoolEndYear // Now an Int
    if (data.highSchoolGrade) studentData.highSchoolGrade = data.highSchoolGrade
    if (data.bachelorsIn) studentData.bachelorsIn = data.bachelorsIn
    if (data.bachelorsFromInstitute) studentData.bachelorsFromInstitute = data.bachelorsFromInstitute
    if (data.bachelorsCountry) studentData.bachelorsCountry = data.bachelorsCountry
    if (data.bachelorsAddress) studentData.bachelorsAddress = data.bachelorsAddress
    if (data.bachelorsStartDate) studentData.bachelorsStartDate = new Date(data.bachelorsStartDate)
    if (data.bachelorsEndDate) studentData.bachelorsEndDate = new Date(data.bachelorsEndDate)
    if (data.bachelorsGrade) studentData.bachelorsGrade = data.bachelorsGrade
    if (data.bachelorsCompleted !== undefined) studentData.bachelorsCompleted = data.bachelorsCompleted
    if (data.greTaken !== undefined) studentData.greTaken = data.greTaken
    if (data.greScore) studentData.greScore = data.greScore
    if (data.toeflTaken !== undefined) studentData.toeflTaken = data.toeflTaken
    if (data.toeflScore) studentData.toeflScore = data.toeflScore
    if (data.languageTest) studentData.languageTest = data.languageTest
    if (data.languageTestScore) studentData.languageTestScore = data.languageTestScore
    if (data.languageTestDate) studentData.languageTestDate = new Date(data.languageTestDate) // Added
    
    // Get form visibility for the batch
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        formVisibility: true,
      },
    })
    
    const formVisibility = batch?.formVisibility || null
    
    // Calculate profile completion
    const profileCompletion = calculateProfileCompletion(studentData, formVisibility)
    studentData.profileCompletion = profileCompletion

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

    // Handle file uploads and create Document records
    const fileUploadPromises = []
    
    if (files.marksheet10th) {
      const filePromise = saveFile(files.marksheet10th, {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
        studentId: student.id,
      }).then(async (fileData) => {
        await prisma.document.create({
          data: {
            studentId: student.id,
            type: 'MARKSHEET_10TH',
            fileName: fileData.fileName,
            storedPath: fileData.storedPath,
            fileSize: fileData.fileSize,
            mimeType: files.marksheet10th!.type,
          },
        })
      })
      fileUploadPromises.push(filePromise)
    }

    if (files.marksheet12th) {
      const filePromise = saveFile(files.marksheet12th, {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
        studentId: student.id,
      }).then(async (fileData) => {
        await prisma.document.create({
          data: {
            studentId: student.id,
            type: 'MARKSHEET_12TH',
            fileName: fileData.fileName,
            storedPath: fileData.storedPath,
            fileSize: fileData.fileSize,
            mimeType: files.marksheet12th!.type,
          },
        })
      })
      fileUploadPromises.push(filePromise)
    }

    if (files.ieltsScorecard) {
      const filePromise = saveFile(files.ieltsScorecard, {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
        studentId: student.id,
      }).then(async (fileData) => {
        await prisma.document.create({
          data: {
            studentId: student.id,
            type: 'LANGUAGE_TEST_SCORECARD',
            fileName: fileData.fileName,
            storedPath: fileData.storedPath,
            fileSize: fileData.fileSize,
            mimeType: files.ieltsScorecard!.type,
          },
        })
      })
      fileUploadPromises.push(filePromise)
    }

    if (files.passport) {
      const filePromise = saveFile(files.passport, {
        allowedTypes: ['application/pdf'],
        maxSize: 10 * 1024 * 1024, // 10MB
        studentId: student.id,
      }).then(async (fileData) => {
        await prisma.document.create({
          data: {
            studentId: student.id,
            type: 'PASSPORT',
            fileName: fileData.fileName,
            storedPath: fileData.storedPath,
            fileSize: fileData.fileSize,
            mimeType: files.passport!.type,
          },
        })
      })
      fileUploadPromises.push(filePromise)
    }

    if (files.languageTestScorecard) {
      const filePromise = saveFile(files.languageTestScorecard, {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
        studentId: student.id,
      }).then(async (fileData) => {
        await prisma.document.create({
          data: {
            studentId: student.id,
            type: 'LANGUAGE_TEST_SCORECARD',
            fileName: fileData.fileName,
            storedPath: fileData.storedPath,
            fileSize: fileData.fileSize,
            mimeType: files.languageTestScorecard!.type,
          },
        })
      })
      fileUploadPromises.push(filePromise)
    }

    // Wait for all file uploads to complete
    if (fileUploadPromises.length > 0) {
      try {
        await Promise.all(fileUploadPromises)
        console.log('Successfully uploaded', fileUploadPromises.length, 'documents')
      } catch (fileError) {
        console.error('Error uploading files:', fileError)
        // Continue even if file upload fails - student record is created
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
