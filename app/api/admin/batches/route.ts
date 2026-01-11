import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getBatches } from '@/lib/batch'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().nullable().optional().transform(val => parseInt(val || '1')),
  limit: z.string().nullable().optional().transform(val => parseInt(val || '20')),
  program: z.enum(['BS', 'BBA']).nullable().optional(),
  isActive: z.string().nullable().optional().transform(val => val === 'true'),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const params = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      program: searchParams.get('program'),
      isActive: searchParams.get('isActive'),
    })

    const result = await getBatches(
      params.page,
      params.limit,
      {
        program: params.program || undefined,
        isActive: params.isActive,
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    console.error('Get batches error:', error.message || error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
