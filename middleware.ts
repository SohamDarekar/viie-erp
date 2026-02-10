import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from './lib/auth'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20 // 20 requests per minute

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown'
  return `${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, RATE_LIMIT_WINDOW)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to sensitive routes
  const sensitiveRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/admin/login',
    '/api/student/onboarding',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
  ]

  if (sensitiveRoutes.some(route => pathname.startsWith(route))) {
    const rateLimitKey = getRateLimitKey(request)
    const { allowed, remaining } = checkRateLimit(rateLimitKey)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          }
        }
      )
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
  }

  // Define route categories
  const emailVerificationRoutes = [
    '/api/auth/verify-email',
    '/api/auth/resend-verification'
  ]
  
  const authApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/admin/login'
  ]
  
  const onboardingApiRoutes = [
    '/api/student/onboarding'
  ]

  const publicAuthPages = ['/login', '/register']
  const adminLoginPage = '/admin/login'

  // Check if route is email verification related (always accessible)
  const isEmailVerificationRoute = emailVerificationRoutes.some(route => pathname.startsWith(route))
  
  // Check if route is auth API (always accessible)
  const isAuthApiRoute = authApiRoutes.some(route => pathname.startsWith(route))
  
  // Check if route is onboarding API (accessible for authenticated users even without email verification)
  const isOnboardingApiRoute = onboardingApiRoutes.some(route => pathname.startsWith(route))

  // Check authentication
  const session = await getSessionFromRequest(request)

  // Handle public auth pages (/login, /register)
  if (publicAuthPages.some(route => pathname.startsWith(route))) {
    if (!session) {
      // Not authenticated - allow access
      return NextResponse.next()
    }

    // Authenticated - apply routing logic
    if (session.role === 'STUDENT') {
      // Student is authenticated
      if (!session.emailVerified) {
        // Email not verified - allow /login (to see verification message)
        return NextResponse.next()
      }
      
      const hasCompletedOnboarding = session.hasCompletedOnboarding ?? false
      
      if (!hasCompletedOnboarding) {
        // Email verified but onboarding incomplete - redirect to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      
      // Fully onboarded - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (session.role === 'ADMIN') {
      // Admin should go to admin dashboard
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Handle admin login page
  if (pathname.startsWith(adminLoginPage)) {
    if (session && session.role === 'ADMIN') {
      // Already logged in as admin - redirect to admin dashboard
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // Not logged in or not admin - allow access
    return NextResponse.next()
  }

  // Allow email verification, auth API routes, and onboarding API without authentication checks
  if (isEmailVerificationRoute || isAuthApiRoute || (isOnboardingApiRoute && session)) {
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!session) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Handle student-specific routing with global email verification and onboarding enforcement
  if (session.role === 'STUDENT') {
    const hasCompletedOnboarding = session.hasCompletedOnboarding ?? false

    // STEP 1: Check email verification (highest priority)
    if (!session.emailVerified) {
      // Email not verified - redirect to login for all protected routes
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // STEP 2: Check onboarding completion
    if (pathname.startsWith('/onboarding')) {
      // Trying to access onboarding page
      if (hasCompletedOnboarding) {
        // Already completed - redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // Email verified and onboarding incomplete - allow access
      return NextResponse.next()
    }

    // STEP 3: For all other protected routes, enforce onboarding completion
    if (!hasCompletedOnboarding) {
      // Email verified but onboarding not complete - force to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Email verified and onboarding complete - allow access to protected routes
    return NextResponse.next()
  }

  // Handle admin-only routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (session.role !== 'ADMIN') {
      // Not an admin - redirect to student dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|img|font|public).*)',
  ],
}
