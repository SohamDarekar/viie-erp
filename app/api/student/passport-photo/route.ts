import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { saveFile, deleteFile, ensureUploadDir } from '@/lib/file'
import { createAuditLog } from '@/lib/audit'
import fs from 'fs/promises'

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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    await ensureUploadDir()

    if (student.passportPhoto) {
      try {
        await deleteFile(student.passportPhoto)
      } catch (error) {
        console.error('Failed to delete old passport photo:', error)
      }
    }

    const { storedPath } = await saveFile(file, {
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    })

    // Update passport photo without recalculating profile completion
    // Profile completion will be recalculated when user saves profile data
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        passportPhoto: storedPath,
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
      passportPhoto: storedPath,
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

    if (student.passportPhoto) {
      try {
        await deleteFile(student.passportPhoto)
      } catch (error) {
        console.error('Failed to delete passport photo file:', error)
      }
    }

    // Update passport photo without recalculating profile completion
    // Profile completion will be recalculated when user saves profile data
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

    if (session.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can access passport photos' },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    })

    if (!student || !student.passportPhoto) {
      return NextResponse.json(
        { error: 'Passport photo not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') || student.passportPhoto

    try {
      const fileBuffer = await fs.readFile(path)
      const ext = path.split('.').pop()?.toLowerCase()
      const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/*'

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (error) {
      console.error('Failed to read passport photo:', error)
      return NextResponse.json(
        { error: 'Failed to read passport photo' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Get passport photo error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
