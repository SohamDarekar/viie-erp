# VIIE ERP - Student Management System

Production-ready ERP system for college student lifecycle management with automatic batch assignment, document management, task tracking, and secure file storage.

## Features

- **Automatic Batch Assignment** - Students auto-assigned to batches based on Program/Year/Term
- **Document Management** - Secure upload/download of Passport, IELTS, Visa, I-20, etc.
- **Task Management** - Assign tasks to individuals, batches, or entire programs
- **Resource Library** - Admin uploads learning materials with visibility controls
- **Email System** - Bulk emails to batches/programs with async delivery
- **Role-Based Access** - Student and Admin roles with strict permissions
- **Audit Logging** - Track all critical actions and document access
- **5-Year Retention** - Soft delete strategy for compliance

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- **MongoDB Atlas** (managed cloud database)
- Prisma ORM
- JWT Authentication
- Nodemailer (SMTP)
- Server-side file storage
- Nginx + PM2 (Production)

## Quick Start

### Prerequisites

- Node.js 20+
- **MongoDB Atlas account** (free tier available at mongodb.com/cloud/atlas)
- SMTP credentials for email

### Development Setup

```bash
# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Create MongoDB Atlas cluster (if not done)
# 1. Go to cloud.mongodb.com
# 2. Create free M0 cluster
# 3. Create database user
# 4. Add your IP to network access
# 5. Get connection string

# Configure environment with Atlas connection string
nano .env
# DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/viie-erp?retryWrites=true&w=majority"

# Push schema to Atlas
npx prisma db push

# Start development server
npm run dev

# Create admin user
node scripts/create-admin.js
```

Visit `http://localhost:3000`

## Project Structure

```
viie-erp/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication
│   │   ├── documents/    # Document management
│   │   ├── tasks/        # Task management
│   │   ├── resources/    # Resource library
│   │   ├── student/      # Student endpoints
│   │   └── admin/        # Admin endpoints
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── onboarding/       # Student onboarding
│   ├── dashboard/        # Student dashboard
│   └── admin/            # Admin dashboard
├── lib/
│   ├── prisma.ts         # Database client
│   ├── auth.ts           # Authentication utilities
│   ├── batch.ts          # Batch auto-assignment logic
│   ├── file.ts           # File storage utilities
│   ├── email.ts          # Email system
│   └── audit.ts          # Audit logging
├── prisma/
│   └── schema.prisma     # Database schema
├── docs/
│   ├── ARCHITECTURE.md   # System architecture
│   ├── DEPLOYMENT.md     # Deployment guide
│   └── SECURITY.md       # Security documentation
└── scripts/
    ├── create-admin.js   # Create admin user
    └── setup.sh          # Setup script
```

## Key Concepts

### Automatic Batch Assignment

During onboarding, students are automatically assigned to batches:

```typescript
// Student submits: BS, 2024, February
// System creates/finds: BS-2024-February
// Student assigned atomically using MongoDB transaction
```

Batch uniqueness enforced with compound index: `(program, intakeYear, intakeTerm)`

### Document Security

- Files stored outside public directory
- Access only through authenticated API routes
- Authorization checks on every download
- Audit logging for all file access
- PDF-only validation with size limits

### Transaction Safety

Critical operations use MongoDB transactions:
- Batch auto-creation during onboarding
- Multi-assignment task creation
- Ensures data consistency and atomicity

## API Examples

### Authentication
```bash
# Register
POST /api/auth/register
{"email":"student@test.com","password":"password123"}

# Login
POST /api/auth/login
{"email":"student@test.com","password":"password123"}
```

### Student Onboarding (Auto Batch)
```bash
POST /api/student/onboarding
{
  "firstName":"John",
  "lastName":"Doe",
  "dateOfBirth":"2000-01-01",
  "nationality":"Pakistan",
  "program":"BS",
  "intakeYear":2024,
  "intakeTerm":"February"
}
# Automatically creates BS-2024-February batch and assigns student
```

### Document Upload
```bash
POST /api/documents
Content-Type: multipart/form-data
file: [PDF file]
type: "PASSPORT"
```

### Bulk Email
```bash
POST /api/admin/emails/bulk
{
  "recipientType":"BATCH",
  "batchId":"...",
  "subject":"Announcement",
  "message":"<p>Message...</p>"
}
```

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete VPS deployment guide.

**Quick Deploy:**
```bash
# Production build
npm run build

# Start with PM2
pm2 start npm --name viie-erp -- start
pm2 save
```

## Security

- JWT with HTTP-only cookies
- bcrypt password hashing (12 rounds)
- Role-based access control
- Input validation (Zod)
- Audit logging
- File access controls
- HTTPS required in production

See [SECURITY.md](docs/SECURITY.md) for complete security documentation.

## Database Schema

**Core Models:**
- User (authentication)
- Student (profile with batch assignment)
- Batch (auto-created from program/year/term)
- Document (student files)
- Task + TaskAssignment (flexible assignment)
- Resource (admin uploads)
- EmailLog + AuditLog (tracking)

All relationships use Prisma references (not embedded documents).

## Environment Variables

```env
DATABASE_URL="mongodb://localhost:27017/viie-erp?replicaSet=rs0"
JWT_SECRET="your-secret-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"
```

See `.env.example` for complete list.

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint

node scripts/create-admin.js  # Create admin user
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Documentation](docs/SECURITY.md)

## License

MIT License - Academic Project

## Support

For issues or questions, create an issue in the repository.
