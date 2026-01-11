import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { readFile } from '@/lib/file'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
    })

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Authorization check for students
    if (session.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.userId },
      })

      if (!student) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Check visibility
      const hasAccess =
        resource.visibilityType === 'ALL' ||
        (resource.visibilityType === 'PROGRAM' && resource.program === student.program) ||
        (resource.visibilityType === 'BATCH' && resource.batchId === student.batchId)

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Read and return file
    const fileBuffer = await readFile(resource.storedPath)

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': resource.mimeType,
        'Content-Disposition': `attachment; filename="${resource.fileName}"`,
        'Content-Length': resource.fileSize.toString(),
      },
    })
  } catch (error) {
    console.error('Download resource error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
