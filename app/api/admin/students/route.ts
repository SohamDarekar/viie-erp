import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().nullable().optional().transform(val => parseInt(val || '1')),
  limit: z.string().nullable().optional().transform(val => parseInt(val || '50')),
  batchId: z.string().nullable().optional(),
  program: z.enum(['BS', 'BBA']).nullable().optional(),
  search: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const params = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      batchId: searchParams.get('batchId'),
      program: searchParams.get('program'),
      search: searchParams.get('search'),
    })

    const skip = (params.page - 1) * params.limit

    const where: any = {}

    if (params.batchId) {
      where.batchId = params.batchId
    }

    if (params.program) {
      where.program = params.program
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
      ]
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: params.limit,
        include: {
          user: {
            select: {
              email: true,
              isActive: true,
            },
          },
          batch: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.student.count({ where }),
    ])

    return NextResponse.json({
      students,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    })
  } catch (error: any) {
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    console.error('Get students error:', error.message || error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
