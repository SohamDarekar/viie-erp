# VIIE ERP - Security Documentation

## Security Implementation

### 1. Authentication Security

#### Password Security
- **Hashing**: bcrypt with 12 rounds
- **Minimum length**: 8 characters
- **Storage**: Never stored in plain text
- **Reset**: Implement password reset with time-limited tokens (not included in base)

#### Session Management
- **JWT tokens**: HS256 algorithm
- **Cookie security**:
  - HttpOnly: Prevents XSS attacks
  - Secure: HTTPS only in production
  - SameSite: Lax (CSRF protection)
  - MaxAge: 7 days
- **Token rotation**: Implement refresh tokens for extended sessions

### 2. Authorization

#### Role-Based Access Control (RBAC)
- **Roles**: STUDENT, ADMIN
- **Middleware**: All protected routes check authentication
- **API Routes**: Explicit permission checks using `requireAuth()` and `requireAdmin()`

#### Access Matrix

| Resource | Student | Admin |
|----------|---------|-------|
| Own profile | Read/Write | Read/Write (All) |
| Own documents | Read/Write | Read/Write (All) |
| Own tasks | Read | Read/Write (All) |
| Batch info | Read (Own) | Read/Write (All) |
| Resources | Read (Assigned) | Read/Write (All) |
| Email | - | Write |
| Audit logs | - | Read |

### 3. Data Encryption

#### At Rest
- **MongoDB**: Enable encryption at rest
  ```bash
  # mongod.conf
  security:
    enableEncryption: true
    encryptionKeyFile: /path/to/keyfile
  ```

#### In Transit
- **HTTPS**: Mandatory in production (Let's Encrypt SSL)
- **MongoDB connection**: Use TLS
  ```env
  DATABASE_URL="mongodb://localhost:27017/viie-erp?replicaSet=rs0&tls=true"
  ```

#### Sensitive Fields
- **Passwords**: bcrypt hashed
- **JWT Secret**: Strong random key (32+ bytes)
- **File encryption**: Implement for highly sensitive documents (optional)

### 4. File Security

#### Upload Validation
- **File type**: Whitelist (PDF only for documents)
- **File size**: 10MB limit (configurable)
- **Filename sanitization**: Remove special characters
- **MIME type validation**: Server-side check

#### Storage Security
- **Location**: Outside public directory
- **Access**: Only through authenticated API routes
- **Download**: Streaming through API with auth check
- **File naming**: UUID-based to prevent enumeration

#### Implementation
```typescript
// File access requires authentication
const document = await prisma.document.findUnique({ where: { id } })
if (session.role === 'STUDENT' && document.student.userId !== session.userId) {
  throw new Error('Forbidden')
}
```

### 5. Input Validation

#### Server-Side Validation
- **Zod schemas**: All API inputs validated
- **SQL Injection**: Protected by Prisma ORM
- **XSS**: React escapes by default

#### Example
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
const validated = schema.parse(body)
```

### 6. Audit Logging

#### What's Logged
- User login/logout
- Document access (view/download)
- Task creation/assignment
- Batch creation
- Email sending
- Admin actions

#### Log Retention
- Minimum 5 years for student data
- Audit logs retained indefinitely
- Automated cleanup for old email logs

#### Implementation
```typescript
await createAuditLog({
  userId: session.userId,
  action: 'UPLOAD_DOCUMENT',
  entity: 'Document',
  entityId: document.id,
  ipAddress: req.headers.get('x-forwarded-for'),
})
```

### 7. API Security

#### Rate Limiting (Recommended Implementation)
```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache'

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
})

export function checkRateLimit(identifier: string, limit: number = 10) {
  const count = rateLimit.get(identifier) as number || 0
  if (count >= limit) {
    throw new Error('Rate limit exceeded')
  }
  rateLimit.set(identifier, count + 1)
}
```

#### CORS
```typescript
// next.config.js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN },
      ],
    },
  ]
}
```

### 8. MongoDB Atlas Security

#### Built-in Security Features

**Atlas Automatic Security:**
- **Encryption at rest**: Enabled by default on all clusters
- **Encryption in transit**: TLS/SSL for all connections
- **Network isolation**: VPC peering available (M10+)
- **IP whitelisting**: Required for all connections
- **Database authentication**: Username/password required
- **Audit logs**: Track all database operations (M10+)
- **Automated patching**: Security updates applied automatically

#### Connection Security

```env
# Secure Atlas connection string
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/viie-erp?retryWrites=true&w=majority"

# Features:
# - mongodb+srv: Uses SRV DNS records (automatic server discovery)
# - TLS/SSL: Encrypted connections by default
# - retryWrites=true: Automatic retry on transient failures
# - w=majority: Write concern for data durability
```

**Special Characters in Password:**
```bash
# URL-encode special characters:
# @ → %40
# # → %23  
# $ → %24
# % → %25

# Example:
# Password: MyP@ss#123
# Encoded: MyP%40ss%23123
```

#### Network Access Control

**Atlas Network Configuration:**
1. **IP Whitelist** (Atlas Dashboard → Network Access):
   ```
   # Development
   Add Current IP Address
   
   # Production
   Add VPS IP: 192.168.1.100/32
   
   # ⚠️ Avoid: 0.0.0.0/0 (allow all)
   ```

2. **VPC Peering** (M10+ only):
   - Private network connection
   - No exposure to public internet
   - Enhanced security for production

#### Database User Permissions

**Least Privilege Principle:**
```javascript
// In Atlas Dashboard → Database Access

// Application user (read/write to specific database)
Username: viie_app
Password: <strong-password>
Role: readWrite on viie-erp database

// Admin user (for maintenance)
Username: viie_admin  
Password: <strong-password>
Role: dbAdmin on viie-erp database

// Monitoring user (read-only)
Username: viie_monitor
Password: <strong-password>
Role: read on viie-erp database
```

#### Audit Logging (M10+ only)

**Enable in Atlas:**
```
1. Security → Audit Logs → Configure Audit Logs
2. Enable for:
   - Authentication events
   - Authorization failures
   - DDL operations
   - CRUD operations (selective)
3. Retention: 30-365 days
```

**What Gets Logged:**
- All authentication attempts
- Failed authorization checks
- Schema modifications
- Database user changes
- IP access changes

### 9. Environment Variables

#### Protection
- **Never commit**: Listed in `.gitignore`
- **Strong secrets**: Generate with `openssl rand -base64 32`
- **Separate configs**: Different `.env` for dev/staging/prod
- **Minimal exposure**: Only load required variables

#### Required Secrets
```env
# MongoDB Atlas connection (from Atlas dashboard)
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/viie-erp?retryWrites=true&w=majority"

# Application secrets
JWT_SECRET=<32+ byte random string>
NEXTAUTH_SECRET=<32+ byte random string>
SMTP_PASSWORD=<app-specific password>
```

**Special Characters in Passwords:**
URL-encode special characters in Atlas password:
- `@` → `%40`, `#` → `%23`, `$` → `%24`, `%` → `%25`

### 10. HTTPS and SSL

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 11. Security Headers

#### Next.js Configuration
```typescript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      ],
    },
  ]
}
```

### 12. Vulnerability Prevention

#### SQL Injection
- **Protected**: Prisma ORM prevents SQL injection

#### XSS (Cross-Site Scripting)
- **React**: Auto-escapes JSX
- **Validation**: Sanitize HTML in user inputs
- **CSP**: Implement Content Security Policy

#### CSRF (Cross-Site Request Forgery)
- **SameSite cookies**: Lax setting
- **Token validation**: For state-changing operations

#### File Upload Attacks
- **Type validation**: Server-side MIME check
- **Size limits**: Enforced
- **Virus scanning**: Recommended with ClamAV

### 13. Data Retention and Deletion

#### Soft Delete Strategy
```typescript
// Students never hard-deleted
await prisma.student.update({
  where: { id },
  data: { archivedAt: new Date() }
})
```

#### Retention Policy
- Student records: Minimum 5 years
- Audit logs: Indefinite
- Email logs: 1 year (configurable)
- Documents: Retained with student record

### 14. Backup Security

#### MongoDB Atlas Backups

**Automatic Backups (M10+):**
- Continuous backups with point-in-time recovery
- Encrypted snapshots
- Geographic redundancy
- Configurable retention (2-35 days)

**Free Tier (M0):**
- No automatic backups
- Manual export recommended for critical data

#### Manual Backup Encryption
```bash
# Export and encrypt (if needed for M0 tier)
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/viie-erp" --archive | openssl enc -aes-256-cbc -salt -out backup.enc

# Restore
openssl enc -d -aes-256-cbc -in backup.enc | mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/viie-erp" --archive
```

#### Access Control
```bash
# Secure backup directory
chmod 700 /var/backups/viie-erp
chown root:root /var/backups/viie-erp
```

## Security Checklist

- [ ] Strong JWT_SECRET configured (32+ bytes)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] **MongoDB Atlas IP whitelist configured**
- [ ] **Atlas database user with strong password**
- [ ] **Connection string uses mongodb+srv protocol**
- [ ] File uploads restricted to authenticated users
- [ ] Password complexity enforced (8+ characters)
- [ ] Rate limiting implemented on auth endpoints
- [ ] Security headers configured (Nginx)
- [ ] Audit logging enabled for critical actions
- [ ] Regular backups configured (Atlas automatic for M10+)
- [ ] Firewall rules applied (VPS)
- [ ] Environment variables secured (.env not committed)
- [ ] Admin accounts protected with strong passwords
- [ ] **Atlas monitoring alerts configured**
- [ ] **VPC peering enabled (production M10+)**
- [ ] Regular security updates applied
- [ ] Vulnerability scanning enabled

## Incident Response

### Breach Detection
- Monitor audit logs for suspicious activity
- Alert on failed login attempts
- Track document access patterns

### Response Plan
1. Identify scope of breach
2. Isolate affected systems
3. Notify affected users
4. Reset compromised credentials
5. Review and update security measures
6. Document incident for compliance

## Compliance Notes

### GDPR Considerations
- Data minimization implemented
- User consent for data collection
- Right to access (student can view their data)
- Right to deletion (soft delete with archival)
- Data portability (export functionality recommended)

### Educational Data Privacy
- Student data encrypted
- Access logs maintained
- Minimal data collection
- Retention policies enforced
