import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET all form visibility settings for all batches
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all batches with their form visibility settings
    const batches = await prisma.batch.findMany({
      where: {
        isActive: true,
      },
      include: {
        formVisibility: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: [
        { program: 'asc' },
        { intakeYear: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      batches: batches.map(batch => ({
        id: batch.id,
        name: batch.name,
        code: batch.code,
        program: batch.program,
        intakeYear: batch.intakeYear,
        studentCount: batch._count.students,
        formVisibility: batch.formVisibility || {
          personalDetails: true,
          education: true,
          travel: true,
          workDetails: true,
          financials: true,
          documents: true,
          courseDetails: true,
          university: true,
          postAdmission: true,
        },
      })),
    })
  } catch (error) {
    console.error('Error fetching form visibility settings:', error)
    return NextResponse.json({ error: 'Failed to fetch form visibility settings' }, { status: 500 })
  }
}

// POST - Create or update form visibility settings for a batch
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { batchId, formVisibility } = body

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    // Verify batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Upsert form visibility settings
    const visibility = await prisma.formVisibility.upsert({
      where: { batchId },
      update: {
        personalDetails: formVisibility.personalDetails ?? true,
        education: formVisibility.education ?? true,
        travel: formVisibility.travel ?? true,
        workDetails: formVisibility.workDetails ?? true,
        financials: formVisibility.financials ?? true,
        documents: formVisibility.documents ?? true,
        courseDetails: formVisibility.courseDetails ?? true,
        university: formVisibility.university ?? true,
        postAdmission: formVisibility.postAdmission ?? true,
      },
      create: {
        batchId,
        personalDetails: formVisibility.personalDetails ?? true,
        education: formVisibility.education ?? true,
        travel: formVisibility.travel ?? true,
        workDetails: formVisibility.workDetails ?? true,
        financials: formVisibility.financials ?? true,
        documents: formVisibility.documents ?? true,
        courseDetails: formVisibility.courseDetails ?? true,
        university: formVisibility.university ?? true,
        postAdmission: formVisibility.postAdmission ?? true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Form visibility settings updated successfully',
      formVisibility: visibility,
    })
  } catch (error) {
    console.error('Error updating form visibility settings:', error)
    return NextResponse.json({ error: 'Failed to update form visibility settings' }, { status: 500 })
  }
}
