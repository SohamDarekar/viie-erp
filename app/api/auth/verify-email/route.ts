import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setAuthCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        emailVerified: false,
      },
    })

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=invalid_or_expired_token', req.url))
    }

    // Mark email as verified and clear the token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    })

    console.log(`✓ Email verified for user: ${updatedUser.email}`)

    // Set auth cookie to log them in
    await setAuthCookie({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    })

    // Redirect to onboarding page
    return NextResponse.redirect(new URL('/onboarding?verified=true', req.url))
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url))
  }
}
