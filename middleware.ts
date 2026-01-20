import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from './lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes
  const publicRoutes = [
    '/login', 
    '/register', 
    '/admin/login', 
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/admin/login',
    '/api/auth/verify-email',
    '/api/auth/resend-verification'
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check authentication
  const session = await getSessionFromRequest(request)

  if (!session) {
    if (pathname.startsWith('/admin')) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (session.role !== 'ADMIN') {
      // If user is logged in but not an admin, redirect to their appropriate dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Student routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/student') || pathname.startsWith('/profile') || pathname.startsWith('/settings') || pathname.startsWith('/events') || pathname.startsWith('/onboarding')) {
    if (session.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
