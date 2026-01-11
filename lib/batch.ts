import { prisma } from './prisma'
import { Program } from '@prisma/client'

export interface BatchInfo {
  program: Program
  intakeYear: number
}

/**
 * Automatically assigns student to appropriate batch
 * Creates batch if it doesn't exist
 * Uses MongoDB transactions for atomicity
 */
export async function assignStudentToBatch(batchInfo: BatchInfo): Promise<string> {
  const batchName = generateBatchName(batchInfo)

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Try to find existing batch
    let batch = await tx.batch.findUnique({
      where: {
        program_intakeYear: {
          program: batchInfo.program,
          intakeYear: batchInfo.intakeYear,
        },
      },
    })

    // Create batch if doesn't exist
    if (!batch) {
      batch = await tx.batch.create({
        data: {
          program: batchInfo.program,
          intakeYear: batchInfo.intakeYear,
          name: batchName,
          isActive: true,
        },
      })
    }

    return batch.id
  })

  return result
}

export function generateBatchName(batchInfo: BatchInfo): string {
  return `${batchInfo.program}-${batchInfo.intakeYear}`
}

/**
 * Get batch with student count
 */
export async function getBatchWithStats(batchId: string) {
  return prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      _count: {
        select: { students: true },
      },
    },
  })
}

/**
 * Get all batches with pagination
 */
export async function getBatches(
  page: number = 1,
  limit: number = 20,
  filters?: {
    program?: Program
    isActive?: boolean
  }
) {
  const skip = (page - 1) * limit

  const where: any = {}
  if (filters?.program) where.program = filters.program
  if (filters?.isActive !== undefined) where.isActive = filters.isActive

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { intakeYear: 'desc' },
      ],
      include: {
        _count: {
          select: { students: true },
        },
      },
    }),
    prisma.batch.count({ where }),
  ])

  return {
    batches,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}
