import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './storage/uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB

export interface UploadOptions {
  allowedTypes?: string[]
  maxSize?: number
  studentId?: string
}

export async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function saveFile(
  file: File,
  options: UploadOptions = {}
): Promise<{ storedPath: string; fileName: string; fileSize: number }> {
  const {
    allowedTypes = ['application/pdf'],
    maxSize = MAX_FILE_SIZE,
    studentId,
  } = options

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`)
  }

  // Validate file size
  if (file.size > maxSize) {
    throw new Error(`File too large. Max size: ${maxSize} bytes`)
  }

  // Create student directory if needed
  const studentDir = studentId ? path.join(UPLOAD_DIR, studentId) : UPLOAD_DIR
  await fs.mkdir(studentDir, { recursive: true })

  // Generate unique filename
  const ext = path.extname(file.name)
  const uniqueName = `${uuidv4()}${ext}`
  const storedPath = path.join(studentDir, uniqueName)

  // Save file
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(storedPath, buffer)

  return {
    storedPath,
    fileName: file.name,
    fileSize: file.size,
  }
}

export async function deleteFile(storedPath: string) {
  try {
    await fs.unlink(storedPath)
  } catch (error) {
    console.error('Failed to delete file:', error)
  }
}

export async function readFile(storedPath: string): Promise<Buffer> {
  return fs.readFile(storedPath)
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9._-]/gi, '_').toLowerCase()
}
