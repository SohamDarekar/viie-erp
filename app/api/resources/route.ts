import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { saveFile, ensureUploadDir } from '@/lib/file'
import { createAuditLog } from '@/lib/audit'

const VISIBILITY_TYPES = ['BATCH', 'PROGRAM', 'ALL'] as const

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const visibilityType = formData.get('visibilityType') as string
    const program = formData.get('program') as string | null
    const batchId = formData.get('batchId') as string | null

    if (!file || !title || !visibilityType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!VISIBILITY_TYPES.includes(visibilityType as any)) {
      return NextResponse.json(
        { error: 'Invalid visibility type' },
        { status: 400 }
      )
    }

    // Validation
    if (visibilityType === 'BATCH' && !batchId) {
      return NextResponse.json(
        { error: 'batchId required for batch visibility' },
        { status: 400 }
      )
    }

    if (visibilityType === 'PROGRAM' && !program) {
      return NextResponse.json(
        { error: 'program required for program visibility' },
        { status: 400 }
      )
    }

    await ensureUploadDir()

    // Save file
    const { storedPath, fileName, fileSize } = await saveFile(file, {
      allowedTypes: ['application/pdf', 'application/vnd.ms-powerpoint', 
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    })

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        fileName,
        storedPath,
        fileSize,
        mimeType: file.type,
        visibilityType: visibilityType as any,
        program: program as any,
        batchId,
      },
    })

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPLOAD_RESOURCE',
      entity: 'Resource',
      entityId: resource.id,
      details: { visibilityType, title },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({ success: true, resource })
  } catch (error: any) {
    console.error('Upload resource error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()

    let resources

    if (session.role === 'ADMIN') {
      // Admin sees all resources
      resources = await prisma.resource.findMany({
        orderBy: { uploadedAt: 'desc' },
        include: {
          batch: {
            select: {
              name: true,
            },
          },
        },
      })
    } else {
      // Student sees resources based on visibility
      const student = await prisma.student.findUnique({
        where: { userId: session.userId },
      })

      if (!student) {
        return NextResponse.json({ resources: [] })
      }

      resources = await prisma.resource.findMany({
        where: {
          OR: [
            { visibilityType: 'ALL' },
            { visibilityType: 'PROGRAM', program: student.program },
            { visibilityType: 'BATCH', batchId: student.batchId },
          ],
        },
        orderBy: { uploadedAt: 'desc' },
      })
    }

    return NextResponse.json({ resources })
  } catch (error) {
    console.error('Get resources error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
