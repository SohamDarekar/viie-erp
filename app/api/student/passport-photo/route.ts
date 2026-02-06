import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can upload passport photos' },
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

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPG, and JPEG formats are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Convert to base64 and store in database
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    // Update passport photo without recalculating profile completion
    // Profile completion will be recalculated when user saves profile data
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        passportPhoto: base64,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: 'UPLOAD_PASSPORT_PHOTO',
      entity: 'Student',
      entityId: student.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      passportPhoto: 'uploaded',
    })
  } catch (error: any) {
    console.error('Upload passport photo error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can delete passport photos' },
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

    // Update passport photo to null (remove from database)
    await prisma.student.update({
      where: { id: student.id },
      data: {
        passportPhoto: null,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: 'DELETE_PASSPORT_PHOTO',
      entity: 'Student',
      entityId: student.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete passport photo error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    let student

    // Admin can view any student's photo by providing studentId
    if (session.role === 'ADMIN' && studentId) {
      student = await prisma.student.findUnique({
        where: { id: studentId },
      })
    } 
    // Student can only view their own photo
    else if (session.role === 'STUDENT') {
      student = await prisma.student.findUnique({
        where: { userId: session.userId },
      })
    } else {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (!student || !student.passportPhoto) {
      return NextResponse.json(
        { error: 'Passport photo not found' },
        { status: 404 }
      )
    }

    // If stored as base64, return it directly as image
    if (student.passportPhoto.startsWith('data:image/')) {
      // Extract base64 data and content type
      const matches = student.passportPhoto.match(/^data:(.+);base64,(.+)$/)
      if (matches) {
        const contentType = matches[1]
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'private, max-age=31536000',
          },
        })
      }
    }

    return NextResponse.json(
      { error: 'Invalid photo format' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Get passport photo error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
