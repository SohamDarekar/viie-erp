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
    
    // Simply redirect to login without adding the 'from' parameter
    const loginUrl = new URL('/login', request.url)
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
    '/((?!_next/static|_next/image|favicon.ico|img|font|public).*)',
  ],
}
