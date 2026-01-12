import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/admin/events - Get all events (admin or student)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If student, filter events by their batch
    let events
    if (session.role === 'STUDENT') {
      // Get student's batch
      const student = await prisma.student.findUnique({
        where: { userId: session.userId },
        select: { batchId: true }
      })

      if (!student?.batchId) {
        return NextResponse.json({ events: [] })
      }

      // Get events that include this batch
      events = await prisma.event.findMany({
        where: {
          batchIds: {
            has: student.batchId
          }
        },
        orderBy: { eventDate: 'asc' }
      })
    } else {
      // Admin - get all events
      events = await prisma.event.findMany({
        orderBy: { eventDate: 'asc' }
      })
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// POST /api/admin/events - Create new event (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      eventDate,
      eventTime,
      venue,
      banner,
      registrationLink,
      resources,
      batchIds
    } = body

    // Validation
    if (!name || !description || !eventDate || !eventTime || !venue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        name,
        description,
        eventDate: new Date(eventDate),
        eventTime,
        venue,
        banner: banner || null,
        registrationLink: registrationLink || null,
        resources: resources || [],
        batchIds: batchIds || []
      }
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
