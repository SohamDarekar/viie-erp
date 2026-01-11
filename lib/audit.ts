import { prisma } from './prisma'

export interface AuditLogData {
  userId: string
  action: string
  entity: string
  entityId?: string
  details?: Record<string, any>
  ipAddress?: string
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        details: data.details ? JSON.stringify(data.details) : undefined,
        ipAddress: data.ipAddress,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function logDocumentAccess(
  documentId: string,
  accessedBy: string,
  action: 'VIEW' | 'DOWNLOAD',
  ipAddress?: string
) {
  try {
    await prisma.documentAccessLog.create({
      data: {
        documentId,
        accessedBy,
        action,
        ipAddress,
      },
    })
  } catch (error) {
    console.error('Failed to log document access:', error)
  }
}
