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
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`)
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        emailVerified: false,
      },
    })

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_or_expired_token`)
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
    return NextResponse.redirect(`${baseUrl}/onboarding?verified=true`)
  } catch (error) {
    console.error('Email verification error:', error)
    const protocol = req.headers.get('x-forwarded-proto') || (req.headers.get('host')?.includes('localhost') ? 'http' : 'https')
    const host = req.headers.get('host')
    const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    return NextResponse.redirect(`${baseUrl}/login?error=verification_failed`)
  }
}
