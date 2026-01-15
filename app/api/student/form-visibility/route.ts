import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET form visibility settings for the current student based on their batch
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student with batch information
    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
      include: {
        batch: {
          include: {
            formVisibility: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // If student is not assigned to a batch or batch has no visibility settings, return all sections visible
    const defaultVisibility = {
      personalDetails: true,
      education: true,
      travel: true,
      workDetails: true,
      financials: true,
      documents: true,
      courseDetails: true,
      university: true,
      postAdmission: true,
    }

    const formVisibility = student.batch?.formVisibility || defaultVisibility

    return NextResponse.json({
      success: true,
      formVisibility,
      batchName: student.batch?.name || 'No batch assigned',
    })
  } catch (error) {
    console.error('Error fetching form visibility settings:', error)
    return NextResponse.json({ error: 'Failed to fetch form visibility settings' }, { status: 500 })
  }
}
