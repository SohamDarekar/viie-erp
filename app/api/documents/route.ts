import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { saveFile, ensureUploadDir } from '@/lib/file'
import { createAuditLog } from '@/lib/audit'

const DOCUMENT_TYPES = ['PASSPORT', 'IELTS', 'VISA', 'I20', 'TRANSCRIPT', 'OTHER'] as const

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
