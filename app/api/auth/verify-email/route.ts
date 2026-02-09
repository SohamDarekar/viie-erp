import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setAuthCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    // Get the base URL from the request headers to support both dev and prod
    const protocol = req.headers.get('x-forwarded-proto') || (req.headers.get('host')?.includes('localhost') ? 'http' : 'https')
    const host = req.headers.get('host')
    const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    
    console.log(`[Verify Email] Protocol: ${protocol}, Host: ${host}, BaseURL: ${baseUrl}`)

    if (!token) {
      console.log('[Verify Email] No token provided')
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`)
    }

    console.log(`[Verify Email] Looking for token: ${token.substring(0, 10)}...`)

    // Find user with this verification token (check both verified and unverified)
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
      },
    })

    if (!user) {
      console.log('[Verify Email] No user found with this token')
      // Check if token exists but was already used
      const anyUser = await prisma.user.findFirst({
        where: {
          email: { contains: '@' }
        },
        select: {
          email: true,
          verificationToken: true,
          emailVerified: true
        }
      })
      console.log('[Verify Email] Sample user in DB:', anyUser ? `Email: ${anyUser.email}, Token exists: ${!!anyUser.verificationToken}, Verified: ${anyUser.emailVerified}` : 'No users found')
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_or_expired_token`)
    }

    console.log(`[Verify Email] Found user: ${user.email}, Already verified: ${user.emailVerified}`)

    let updatedUser = user

    // If not yet verified, mark as verified
    if (!user.emailVerified) {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      })
      console.log(`✓ Email verified for user: ${updatedUser.email}`)
    } else {
      // Already verified, just clear the token
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: null,
        },
      })
      console.log(`✓ User already verified: ${updatedUser.email}`)
    }

    // Auto-login the user after email verification and redirect to onboarding
    await setAuthCookie({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: true,
      hasCompletedOnboarding: false,
    })

    // Redirect directly to onboarding page
    return NextResponse.redirect(`${baseUrl}/onboarding?verified=true`)
  } catch (error) {
    console.error('Email verification error:', error)
    const protocol = req.headers.get('x-forwarded-proto') || (req.headers.get('host')?.includes('localhost') ? 'http' : 'https')
    const host = req.headers.get('host')
    const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    return NextResponse.redirect(`${baseUrl}/login?error=verification_failed`)
  }
}
