import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

export interface JWTPayload {
  userId: string
  email: string
  role: 'STUDENT' | 'ADMIN'
  emailVerified?: boolean
  hasCompletedOnboarding?: boolean
  [key: string]: any
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT operations
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

// Session management
export async function setAuthCookie(payload: JWTPayload) {
  const token = await signToken(payload)
  const cookieStore = await cookies()
  
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  
  if (!token) return null
  
  return verifyToken(token)
}

// Request-based session (for API routes)
export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get('auth-token')?.value
  
  if (!token) return null
  
  return verifyToken(token)
}

// Authorization helpers
export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await requireAuth()
  
  if (session.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }
  
  return session
}
