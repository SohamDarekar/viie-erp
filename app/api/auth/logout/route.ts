import { NextRequest, NextResponse } from 'next/server'
import { removeAuthCookie, requireAuth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'LOGOUT',
      entity: 'User',
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    })

    await removeAuthCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
