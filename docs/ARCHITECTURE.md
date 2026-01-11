# VIIE ERP - Architecture Overview

## System Architecture

### Technology Stack
- **Frontend/Backend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB Atlas (managed cloud cluster)
- **ORM**: Prisma with MongoDB connector
- **Authentication**: JWT with secure HTTP-only cookies
- **Email**: Nodemailer with SMTP
- **File Storage**: Server filesystem
- **Process Manager**: PM2
- **Web Server**: Nginx (reverse proxy)
- **SSL**: Let's Encrypt

### Data Model

#### Core Entities
1. **User** - Authentication account (Student/Admin)
2. **Student** - Extended profile with academic data
3. **Batch** - Auto-created groups (Program + Year + Term)
4. **Document** - Student file uploads (Passport, IELTS, etc.)
5. **Task** - Assignments with status tracking
6. **TaskAssignment** - Junction table (Student/Batch assignments)
7. **Resource** - Admin-uploaded learning materials
8. **EmailLog** - Email tracking and audit
9. **AuditLog** - System activity logging
10. **DocumentAccessLog** - File access tracking

#### Relationships
- User 1:1 Student (optional for admins)
- Student N:1 Batch
- Student 1:N Documents
- Student 1:N TaskAssignments
- Batch 1:N Students
- Batch 1:N TaskAssignments
- Batch 1:N Resources
- Task 1:N TaskAssignments

### Automatic Batch Assignment

**Critical Feature**: During onboarding, students are automatically assigned to batches.

**Flow**:
1. Student submits onboarding form with Program, Year, Term
2. System checks if batch exists (compound unique index: program_intakeYear_intakeTerm)
3. If not exists: Create batch with name format "PROGRAM-YEAR-TERM"
4. Assign student to batch (using MongoDB transaction for atomicity)

**Transaction Safety**:
```typescript
await prisma.$transaction(async (tx) => {
  let batch = await tx.batch.findUnique({ where: { compound_key } })
  if (!batch) {
    batch = await tx.batch.create({ data })
  }
  return batch.id
})
```

### File Storage Architecture

**Storage Structure**:
```
storage/uploads/
├── {studentId}/
│   ├── {uuid}.pdf
│   ├── {uuid}.pdf
│   └── ...
```

**Security**:
- Files NOT in public directory
- All access through authenticated API routes
- Download streaming with authorization check
- Audit logging on every access

### API Design

#### Authentication APIs
- POST `/api/auth/register` - Student signup
- POST `/api/auth/login` - Login (returns role)
- POST `/api/auth/logout` - Session termination
- GET `/api/auth/me` - Current user info

#### Student APIs
- POST `/api/student/onboarding` - Complete profile + auto batch assignment
- GET `/api/student/onboarding` - Get current profile
- GET `/api/student/tasks` - View assigned tasks
- PATCH `/api/student/tasks/[id]` - Update task status

#### Document APIs
- POST `/api/documents` - Upload document (multipart/form-data)
- GET `/api/documents` - List documents (filtered by role)
- GET `/api/documents/[id]` - Download document (with auth check)
- DELETE `/api/documents/[id]` - Delete document

#### Admin APIs
- GET `/api/admin/batches` - List all batches with pagination
- GET `/api/admin/batches/[id]` - Batch details with students
- POST `/api/tasks` - Create and assign tasks
- GET `/api/tasks` - List all tasks
- POST `/api/resources` - Upload resource
- GET `/api/resources` - List resources (visibility-filtered)
- POST `/api/admin/emails/bulk` - Send bulk emails

### Email System

**Architecture**:
- Asynchronous sending (non-blocking)
- Database logging for all emails
- Status tracking (PENDING, SENT, FAILED)
- Template system for common emails

**Bulk Email Flow**:
1. Admin selects recipients (Batch/Program/All)
2. System queries students based on criteria
3. Emails queued asynchronously
4. Individual tracking per recipient
5. Audit log created

**Templates**:
- Document reminder
- Task assignment notification
- Resource upload notification
- Bulk announcements

### Authentication & Authorization

**Session Flow**:
1. User logs in with email/password
2. Password verified with bcrypt
3. JWT generated with userId, email, role
4. Token stored in HTTP-only cookie (7-day expiry)
5. Middleware validates token on protected routes
6. Role-based route protection (Student vs Admin)

**Middleware Logic**:
- Public routes: /login, /register, /api/auth/*
- Student routes: /dashboard, /student/*
- Admin routes: /admin, /api/admin/*
- Auto-redirect based on role

### Transaction Safety

**Critical Operations Using Transactions**:
1. Batch assignment during onboarding
2. Task creation with multiple assignments (PROGRAM type)
3. Any multi-document write operations

**Why Transactions**:
- MongoDB Atlas clusters support transactions natively
- No replica set configuration needed (handled by Atlas)
- Ensures atomicity for batch auto-creation
- Prevents race conditions
- Data consistency guarantee

**Atlas Advantages**:
- Transactions work out of the box (no replica set setup)
- Automatic failover and high availability
- Built-in backups and point-in-time recovery

### Data Retention Strategy

**Soft Delete Approach**:
- Students have `archivedAt` field
- Batches have `archivedAt` field
- No hard deletes for student-related data
- Minimum 5-year retention enforced

**Archival Process**:
```typescript
// Archive old batches
await prisma.batch.updateMany({
  where: { intakeYear: { lt: currentYear - 5 } },
  data: { archivedAt: new Date() }
})
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Set up MongoDB with replica set
2. Initialize Next.js project
3. Configure Prisma schema
4. Run `npx prisma generate`
5. Implement authentication system
6. Create middleware for route protection

### Phase 2: Core Features (Week 3-4)
1. Student onboarding with automatic batch assignment
2. Document upload/download system
3. Admin batch management
4. Task creation and assignment
5. Resource management

### Phase 3: Communication (Week 5)
1. Email system setup
2. Bulk email functionality
3. Email templates
4. Notification triggers

### Phase 4: Frontend (Week 6-7)
1. Student dashboard
2. Admin dashboard
3. Document management UI
4. Task management UI
5. Resource library UI

### Phase 5: Security & Deployment (Week 8)
1. Security audit
2. SSL configuration
3. Nginx setup
4. PM2 process management
5. Backup automation
6. Monitoring setup

### Phase 6: Testing & Launch (Week 9-10)
1. Integration testing
2. Security penetration testing
3. Load testing
4. User acceptance testing
5. Production deployment
6. User training

---

## Development Workflow

### Initial Setup
```bash
# 1. Install dependencies
npm install

# 2. Create MongoDB Atlas cluster
# - Go to cloud.mongodb.com
# - Create free M0 cluster
# - Setup database user and network access

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with Atlas connection string

# 4. Generate Prisma Client
npx prisma generate

# 5. Push schema to Atlas
npx prisma db push

# 6. Start development server
npm run dev
```

### Database Management
```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Push schema changes to Atlas (no migrations)
npx prisma db push

# Pull current schema from Atlas
npx prisma db pull

# View database in Prisma Studio
npx prisma studio
```

### Creating Admin User
```javascript
// scripts/create-admin.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@viie.edu'
  const password = await bcrypt.hash('SecurePassword123!', 12)

  await prisma.user.create({
    data: {
      email,
      password,
      role: 'ADMIN',
    },
  })

  console.log('Admin created:', email)
}

main()
```

---

## API Usage Examples

### Student Registration & Onboarding
```typescript
// 1. Register
POST /api/auth/register
{
  "email": "student@example.com",
  "password": "SecurePass123"
}

// 2. Complete onboarding (auto batch assignment)
POST /api/student/onboarding
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2000-01-01",
  "nationality": "Pakistan",
  "program": "BS",
  "intakeYear": 2024,
  "intakeTerm": "February"
}
// Response includes automatically assigned batch
```

### Document Upload
```typescript
// Upload document
POST /api/documents
Content-Type: multipart/form-data

file: [PDF file]
type: "PASSPORT"

// Download document
GET /api/documents/{documentId}
// Returns file stream with authentication check
```

### Task Assignment
```typescript
// Assign to entire batch
POST /api/tasks
{
  "title": "Submit Visa Application",
  "description": "Complete and submit visa application",
  "dueDate": "2024-03-01",
  "assignmentType": "BATCH",
  "batchId": "batch_id_here"
}

// Assign to entire program
POST /api/tasks
{
  "title": "Orientation Session",
  "description": "Attend orientation",
  "assignmentType": "PROGRAM",
  "program": "BS"
}
// Automatically creates assignments for all BS batches
```

### Bulk Email
```typescript
POST /api/admin/emails/bulk
{
  "recipientType": "BATCH",
  "batchId": "batch_id_here",
  "subject": "Important Announcement",
  "message": "<p>This is an important message...</p>"
}
// Sends to all students in batch asynchronously
```

---

## Key Technical Decisions

### Why MongoDB Atlas?
- **Managed service**: No server maintenance, automatic updates
- **Built-in replica sets**: Transactions work immediately
- **Free tier**: M0 cluster perfect for development/small deployments
- **Automatic backups**: Point-in-time recovery included
- **Global infrastructure**: Deploy close to users
- **High availability**: 99.995% uptime SLA (paid tiers)
- **Monitoring**: Built-in performance metrics and alerts
- **Security**: Encryption at rest/transit, network isolation
- **Scalability**: Vertical and horizontal scaling without downtime

### Why Prisma?
- Type-safe database access
- Excellent MongoDB support with referenced relationships
- Migration management
- Developer productivity

### Why Next.js App Router?
- Full-stack in one framework
- Server components for performance
- API routes for backend logic
- Built-in optimizations

### Why JWT over Session?
- Stateless authentication
- Easier horizontal scaling
- Mobile app compatibility (future)
- Reduced database queries

### Why Server File Storage?
- Full control over data
- No third-party dependencies
- Cost-effective for college use case
- Easy backup and migration
- GDPR/privacy compliance

---

## Monitoring & Maintenance

### Log Files
```bash
# Application logs
pm2 logs viie-erp

# Nginx access logs
/var/log/nginx/access.log

# Nginx error logs
/var/log/nginx/error.log

# MongoDB logs
/var/log/mongodb/mongod.log
```

### Health Checks
```bash
# Check application status
pm2 status

# Check MongoDB
mongosh --eval "db.adminCommand('ping')"

# Check Nginx
sudo systemctl status nginx
```

### Performance Monitoring
- PM2 built-in monitoring: `pm2 monit`
- MongoDB performance: Use MongoDB Atlas or monitoring tools
- Application metrics: Implement custom logging

---

## Scaling Considerations

### MongoDB Atlas Scaling
**Free Tier (M0):**
- 512 MB storage
- Shared RAM
- Perfect for development/testing

**Vertical Scaling:**
- Upgrade to M10, M20, M30... via dashboard
- Zero downtime cluster upgrades
- Automatic failover during scaling

**Horizontal Scaling:**
- Sharding available (M30+)
- Automatic chunk migration
- Geographic distribution

### Application Scaling
- Multiple Next.js instances behind load balancer
- Shared Atlas cluster (handles concurrent connections)
- Centralized file storage (NFS/S3)
- Redis for session caching (optional)

---

## Security Best Practices Summary

1. **Never commit secrets** to version control
2. **Use HTTPS** in production always
3. **Validate all inputs** server-side
4. **Implement rate limiting** on auth endpoints
5. **Audit critical actions** (document access, admin operations)
6. **Regular backups** with encryption
7. **Keep dependencies updated** (npm audit)
8. **Monitor logs** for suspicious activity
9. **Strong password policies** enforced
10. **Principle of least privilege** for database access
