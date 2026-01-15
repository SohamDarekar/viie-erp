import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { readFile, deleteFile } from '@/lib/file'
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

    // Check if the request wants to view in browser (default) or download
    const shouldDownload = req.nextUrl.searchParams.get('download') === 'true'

    // Log access
    await logDocumentAccess(
      document.id,
      session.email,
      shouldDownload ? 'DOWNLOAD' : 'VIEW',
      req.headers.get('x-forwarded-for') || req.ip
    )

    // Return file
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': shouldDownload 
          ? `attachment; filename="${document.fileName}"`
          : `inline; filename="${document.fileName}"`,
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

    // Delete file from server first
    await deleteFile(document.storedPath)

    // Delete from database
    await prisma.document.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
