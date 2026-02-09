import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword, setAuthCookie } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { emailOrUsername, password } = loginSchema.parse(body)

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
      include: {
        student: {
          select: {
            hasCompletedOnboarding: true,
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password first (before checking verification status)
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log(`Login attempt for ${emailOrUsername} - emailVerified: ${user.emailVerified}`)

    // Enforce authentication flow:
    // 1. If email not verified, deny login with specific message
    if (!user.emailVerified) {
      return NextResponse.json(
        { 
          error: 'Account exists but is not verified. Please verify your email to continue onboarding.',
          needsVerification: true
        },
        { status: 403 }
      )
    }

    // 2. If email verified but onboarding not completed, allow login but flag for onboarding redirect
    // The frontend will redirect to /onboarding based on hasCompletedOnboarding flag

    // Set auth cookie with email verification and onboarding status
    await setAuthCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      hasCompletedOnboarding: user.student?.hasCompletedOnboarding ?? false,
    })

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: user.student?.hasCompletedOnboarding ?? true,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
