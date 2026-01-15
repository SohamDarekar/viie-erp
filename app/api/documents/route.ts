import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { saveFile, ensureUploadDir } from '@/lib/file'
import { createAuditLog } from '@/lib/audit'

const DOCUMENT_TYPES = [
  'PASSPORT', 'IELTS', 'VISA', 'I20', 'TRANSCRIPT', 'MARKSHEET_10TH', 'MARKSHEET_12TH', 'AADHAR_CARD', 'DRIVERS_LICENSE', 'OTHER',
  // Financial Documents - Personal
  'PERSONAL_PAN_CARD', 'PERSONAL_ITR', 'PERSONAL_SALARY_SLIPS', 'PERSONAL_SALARY_ACCOUNT_STATEMENT',
  'PERSONAL_SAVING_ACCOUNT_STATEMENT', 'PERSONAL_FD_RECEIPTS', 'PERSONAL_BALANCE_CERT_SAVINGS',
  'PERSONAL_BALANCE_CERT_BUSINESS', 'PERSONAL_BALANCE_CERT_FD',
  'PERSONAL_LOAN_SANCTION_LETTER', 'PERSONAL_LOAN_DISBURSEMENT_LETTER', 'PERSONAL_LOAN_AGREEMENT',
  // Financial Documents - Mother
  'MOTHER_PAN_CARD', 'MOTHER_ITR', 'MOTHER_ITR_COMPUTATION', 'MOTHER_SALARY_ACCOUNT_STATEMENT',
  'MOTHER_SALARY_SLIPS', 'MOTHER_SAVING_ACCOUNT_STATEMENT', 'MOTHER_FD_RECEIPTS',
  'MOTHER_BALANCE_CERT_SAVINGS', 'MOTHER_BALANCE_CERT_BUSINESS', 'MOTHER_BALANCE_CERT_FD',
  'MOTHER_GST_CERTIFICATE', 'MOTHER_BUSINESS_REGISTRATION',
  // Financial Documents - Father
  'FATHER_PAN_CARD', 'FATHER_ITR', 'FATHER_ITR_COMPUTATION', 'FATHER_SALARY_ACCOUNT_STATEMENT',
  'FATHER_SALARY_SLIPS', 'FATHER_SAVING_ACCOUNT_STATEMENT', 'FATHER_FD_RECEIPTS',
  'FATHER_BALANCE_CERT_SAVINGS', 'FATHER_BALANCE_CERT_BUSINESS', 'FATHER_BALANCE_CERT_FD',
  'FATHER_GST_CERTIFICATE', 'FATHER_BUSINESS_REGISTRATION',
  // Financial Documents - Other
  'OTHER_SOURCE_PAN_CARD', 'OTHER_SOURCE_ITR', 'OTHER_SOURCE_ITR_COMPUTATION', 'OTHER_SOURCE_SALARY_ACCOUNT_STATEMENT',
  'OTHER_SOURCE_SALARY_SLIPS', 'OTHER_SOURCE_SAVING_ACCOUNT_STATEMENT', 'OTHER_SOURCE_FD_RECEIPTS',
  'OTHER_SOURCE_BALANCE_CERT_SAVINGS', 'OTHER_SOURCE_BALANCE_CERT_BUSINESS', 'OTHER_SOURCE_BALANCE_CERT_FD',
  'OTHER_SOURCE_GST_CERTIFICATE', 'OTHER_SOURCE_BUSINESS_REGISTRATION',
  // Document Section Files
  'AFFIDAVIT', 'CV_RESUME', 'SOP', 'OLD_PASSPORT'
] as const

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can upload documents' },
        { status: 403 }
      )
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('type') as string
    const otherSourceIndexStr = formData.get('otherSourceIndex') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!DOCUMENT_TYPES.includes(documentType as any)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      )
    }

    // Parse otherSourceIndex if provided
    const otherSourceIndex = otherSourceIndexStr ? parseInt(otherSourceIndexStr) : null

    // Ensure upload directory exists
    await ensureUploadDir()

    // Save file
    const { storedPath, fileName, fileSize } = await saveFile(file, {
      allowedTypes: ['application/pdf'],
      studentId: student.id,
    })

    // Create document record
    const document = await prisma.document.create({
      data: {
        studentId: student.id,
        type: documentType as any,
        fileName,
        storedPath,
        fileSize,
        mimeType: file.type,
        ...(otherSourceIndex !== null && { otherSourceIndex }),
      },
    })

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPLOAD_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
      details: { type: documentType, fileName },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt,
      },
    })
  } catch (error: any) {
    console.error('Upload document error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()

    let documents

    if (session.role === 'STUDENT') {
      // Student can only see their own documents
      const student = await prisma.student.findUnique({
        where: { userId: session.userId },
      })

      if (!student) {
        return NextResponse.json({ documents: [] })
      }

      documents = await prisma.document.findMany({
        where: { studentId: student.id },
        orderBy: { uploadedAt: 'desc' },
      })
    } else if (session.role === 'ADMIN') {
      // Admin can see all documents
      const { searchParams } = new URL(req.url)
      const studentId = searchParams.get('studentId')

      const where = studentId ? { studentId } : {}

      documents = await prisma.document.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
