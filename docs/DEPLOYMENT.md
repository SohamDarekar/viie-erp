# VIIE ERP - Deployment Guide

## VPS Deployment with MongoDB Atlas

### Prerequisites
- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name (optional but recommended)
- **MongoDB Atlas account** (free tier available)

### 1. Setup MongoDB Atlas

**Create Atlas Cluster:**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account or sign in
3. Create new cluster (M0 Free tier is sufficient for development)
4. Choose cloud provider and region (closest to your VPS)
5. Cluster name: `viie-erp-cluster`

**Configure Database Access:**

```
1. Database Access → Add New Database User
   - Username: viie_admin
   - Password: [Generate secure password]
   - Database User Privileges: Read and write to any database
   - Save
```

**Configure Network Access:**

```
1. Network Access → Add IP Address
   - For development: Add Current IP Address
   - For production: Add your VPS IP address
   - Or use 0.0.0.0/0 (allow from anywhere - less secure)
```

**Get Connection String:**

```
1. Clusters → Connect → Connect your application
2. Driver: Node.js, Version: 5.5 or later
3. Copy connection string:
   mongodb+srv://viie_admin:<password>@viie-erp-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
4. Replace <password> with your actual password
5. Add database name: /viie-erp before the query string
```

### 2. Install Dependencies on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### 3. Clone and Setup Project

```bash
# Create application directory
sudo mkdir -p /var/www/viie-erp
sudo chown -R $USER:$USER /var/www/viie-erp

# Navigate to directory
cd /var/www/viie-erp

# Clone your repository or copy files
# git clone <your-repo> .

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env
```

### 4. Configure Environment

Edit `.env` file:

```env
# MongoDB Atlas connection string (from Atlas dashboard)
DATABASE_URL="mongodb+srv://viie_admin:YOUR_PASSWORD@viie-erp-cluster.xxxxx.mongodb.net/viie-erp?retryWrites=true&w=majority"

# Generate strong secrets
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://yourdomain.com"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@domain.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="VIIE ERP <noreply@viie.edu>"

UPLOAD_DIR="/var/www/viie-erp/storage/uploads"
MAX_FILE_SIZE="10485760"

NODE_ENV="production"
NEXT5. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to MongoDB Atlas (no migrations needed)
npx prisma db push

# Create initial admin user
node scripts/create-admin.js
```

**Note:** MongoDB Atlas automatically handles:
- Replica set configuration (transactions work out of the box)
- Backups and point-in-time recovery
- Hi7h availability and failover
- Automatic scaling

### 6scripts/create-admin.js
```

### 5. Build Application

```bash
npm run build
```

### 6. Configure PM2

```bash
# Start application with PM2
pm2 start npm --name "viie-erp" -- start
8
# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions
```

### 7. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/viie-erp
```

Add configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload size limit
    client_max_body_size 10M;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/viie-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 10. Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 11. Monitoring and Logs

```bash
# View application logs
pm2 logs viie-erp

# Monitor application
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB Atlas monitoring
# Access through Atlas dashboard:
# - Real-time performance metrics
# - Query performance
# - Connection statistics
# - Alerts and notifications
```

## Maintenance

### Backup Strategy

**MongoDB Atlas Automatic Backups:**

Atlas provides automatic backups:
- **Continuous backups** with point-in-time recovery (M10+ clusters)
- **Snapshot backups** every 6-24 hours (all tiers)
- Retention: 2-35 days depending on tier
- One-click restore capability

**Manual Backup (Optional):**

```bash
# Export data using mongodump (requires MongoDB tools)
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/viie-erp" --out=/var/backups/viie-erp/mongo_backup

# Restore
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/viie-erp" /var/backups/viie-erp/mongo_backup/viie-erp
```

**Application Files Backup:**

```bash
# Create backup script for uploads
cat > /var/www/viie-erp/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/viie-erp"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup uploads only (database handled by Atlas)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/viie-erp/storage/uploads

# Remove backups older than 30 days
find $BACKUP_DIR -type f -name "uploads_*.tar.gz" -mtime +30 -delete

echo "Upload backup completed: $DATE"
EOF

chmod +x /var/www/viie-erp/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/viie-erp/backup.sh") | crontab -
```

### Update Application

```bash
cd /var/www/viie-erp

# Pull latest changes
git pull

# Install dependencies
npm install

# Rebuild
npm run build

# Restart application
pm2 restart viie-erp
```

### Database Schema Changes

```bash
# After updating prisma/schema.prisma
npx prisma generate
npx prisma db push  # Pushes changes to Atlas

pm2 restart viie-erp
```

**NoMongoDB Atlas Optimization

**Indexes:**
- Automatically created by Prisma schema
- Monitor in Atlas → Performance Advisor
- Atlas suggests missing indexes

**Atlas Features:**
- Auto-scaling (M10+ clusters)
- Performance analytics
- Query profiler
- Real-time metrics

### te:** MongoDB Atlas with Prisma uses `db push`, not migrations. This directly syncs your schema.

## Performance Optimization
 MongoDB Atlas Specific Features

### Monitoring Dashboard
Access at `cloud.mongodb.com`:
- Real-time metrics
- Connection pool stats
- Query performance
- Slow query analysis
- Alerts configuration

### Security Features
- Network isolation (VPC peering available)
- Encryption at rest (enabled by default)
- Encryption in transit (TLS/SSL)
- Database auditing (M10+)
- Field-level encryption
- IP whitelisting

### Scaling
**Vertical Scaling:**
- Upgrade cluster tier in Atlas dashboard
- Zero downtime (M10+)

**Horizontal Scaling:**
- Sharding available (M30+)
- Automatic chunk balancing
Add to `/etc/nginx/nginx.conf`:
# Test Atlas connection
npx prisma db pull

# Check connection string format
# Should be: mongodb+srv://username:password@cluster.mongodb.net/database

# Verify IP whitelist in Atlas
# Network Access → IP Access List

# Check database user permissions
# Database Access → Database Users
```

### Atlas-specific issues
- **Slow queries**: Check Atlas Performance Advisor
- **Connection timeout**: Verify VPS IP is whitelisted
- **Authentication failed**: Check username/password, special characters must be URL-encoded
- **SSL errors**: Ensure connection string includes `retryWrites=true&w=majorityip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### MongoDB Indexes

Indexes are automatically created by Prisma based on schema.

## Troubleshooting

### Application won't start
```bash
pm2 logs viie-erp
# Check for errors in environment variables or dependencies
```

### Database connection issues
```bash
sudo systemctl status mongod
mongosh --eval "rs.status()"
```

### File upload issues
```bash
# Check permissions
ls -la /var/www/viie-erp/storage/uploads
sudo chown -R $USER:$USER /var/www/viie-erp/storage
```
