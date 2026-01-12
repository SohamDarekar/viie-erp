import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getBatches } from '@/lib/batch'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().nullable().optional().transform(val => parseInt(val || '1')),
  limit: z.string().nullable().optional().transform(val => parseInt(val || '20')),
  program: z.enum(['BS', 'BBA']).nullable().optional(),
  isActive: z.string().nullable().optional().transform(val => val === null || val === undefined ? undefined : val === 'true'),
})

const createBatchSchema = z.object({
  program: z.enum(['BS', 'BBA']),
  intakeYear: z.number().int().min(2000).max(2100),
  isActive: z.boolean().optional().default(true),
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const data = createBatchSchema.parse(body)

    // Check if batch already exists
    const existing = await prisma.batch.findUnique({
      where: {
        program_intakeYear: {
          program: data.program,
          intakeYear: data.intakeYear,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A batch with this program and intake year already exists' },
        { status: 400 }
      )
    }

    // Create batch
    const batch = await prisma.batch.create({
      data: {
        program: data.program,
        intakeYear: data.intakeYear,
        name: `${data.program}-${data.intakeYear}`,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    })

    return NextResponse.json({ batch }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create batch error:', error.message || error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
