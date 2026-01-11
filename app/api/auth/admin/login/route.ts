import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { setAuthCookie } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

// Simple hardcoded admin credentials
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = adminLoginSchema.parse(body)

    // Validate credentials
    if (data.username !== ADMIN_USERNAME || data.password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Find or create admin user
    let adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        email: 'admin@viie.edu',
      },
    })

    if (!adminUser) {
      // Create admin user if doesn't exist
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@viie.edu',
          password: 'hashed-admin-password', // Not used for login
          role: 'ADMIN',
          isActive: true,
        },
      })
    }

    // Set auth cookie
    await setAuthCookie({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
    })

    // Audit log
    await createAuditLog({
      userId: adminUser.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: adminUser.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      user: {
        email: adminUser.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
