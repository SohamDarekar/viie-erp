import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && existingUser.id !== payload.userId) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Update email in User model
    await prisma.user.update({
      where: { id: payload.userId },
      data: { email },
    })

    // Log audit event
    await createAuditLog({
      userId: payload.userId,
      action: 'UPDATE_EMAIL',
      entity: 'User',
      entityId: payload.userId,
      details: { newEmail: email }
    })

    return NextResponse.json({ message: 'Email updated successfully' })
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    )
  }
}
