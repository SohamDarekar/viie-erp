import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { readFile } from '@/lib/file'
import { logDocumentAccess } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Authorization check
    if (session.role === 'STUDENT' && document.student.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Read file
    const fileBuffer = await readFile(document.storedPath)

    // Log access
    await logDocumentAccess(
      document.id,
      session.email,
      'DOWNLOAD',
      req.headers.get('x-forwarded-for') || req.ip
    )

    // Return file
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    })
  } catch (error) {
    console.error('Download document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Only student owner or admin can delete
    if (
      session.role === 'STUDENT' &&
      document.student.userId !== session.userId
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: params.id },
    })

    // Note: File deletion handled by cleanup job or manual process
    // to prevent accidental data loss

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
