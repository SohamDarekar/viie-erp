# MongoDB Atlas Setup Guide

Complete guide for setting up MongoDB Atlas for VIIE ERP system.

## Create Atlas Account

1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Start Free**
3. Sign up with email or Google/GitHub
4. Verify email address

## Create Cluster

### Step 1: Choose Deployment Type
- Select **Shared** (Free tier M0)
- Click **Create**

### Step 2: Cloud Provider & Region
- **Provider**: AWS, Google Cloud, or Azure (choose closest to your VPS)
- **Region**: Select region nearest to your deployment location
  - For US deployment: `us-east-1` (AWS) or `us-central1` (GCP)
  - For Europe: `eu-west-1` (AWS) or `europe-west1` (GCP)
  - For Asia: `ap-southeast-1` (AWS) or `asia-south1` (GCP)

### Step 3: Cluster Tier
- **M0 Sandbox** (Free Forever)
  - 512 MB storage
  - Shared RAM
  - No backup/restore
  - Perfect for development
- **M10+** (Paid - for production)
  - Dedicated resources
  - Automatic backups
  - Performance advisor
  - Auto-scaling

### Step 4: Cluster Name
- Name: `viie-erp-cluster` (or your preferred name)
- Click **Create Cluster**

**Wait 3-5 minutes** for cluster provisioning.

## Configure Database Access

### Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **Add New Database User**
3. **Authentication Method**: Password
4. **Username**: `viie_admin`
5. **Password**: 
   - Click **Autogenerate Secure Password** (recommended)
   - Save this password securely
6. **Database User Privileges**: 
   - Built-in Role: **Read and write to any database**
7. **Restrict Access to Specific Clusters**: (optional, leave default)
8. Click **Add User**

**Important**: Save credentials immediately:
```
Username: viie_admin
Password: [your-generated-password]
```

## Configure Network Access

### Add IP Address

1. Go to **Network Access** (left sidebar)
2. Click **Add IP Address**

**For Development:**
- Click **Add Current IP Address**
- Automatically adds your current IP

**For Production (VPS):**
- **Access List Entry**: Enter your VPS public IP
  ```bash
  # Get VPS IP
  curl ifconfig.me
  ```
- Or use `0.0.0.0/0` to allow from anywhere (⚠️ less secure)

3. **Comment**: `Development Machine` or `Production VPS`
4. Click **Confirm**

## Get Connection String

### Step 1: Connect to Cluster
1. Go to **Database** (left sidebar)
2. Find your cluster
3. Click **Connect** button
4. Choose **Connect your application**

### Step 2: Select Driver
- **Driver**: Node.js
- **Version**: 5.5 or later

### Step 3: Copy Connection String
```
mongodb+srv://viie_admin:<password>@viie-erp-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Step 4: Format for Application
Replace:
- `<password>` with your actual password
- Add database name before query string

**Final format:**
```
mongodb+srv://viie_admin:YOUR_PASSWORD@viie-erp-cluster.xxxxx.mongodb.net/viie-erp?retryWrites=true&w=majority
```

**Special characters in password:**
If password contains special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`

## Add to Environment File

Edit `.env`:
```env
DATABASE_URL="mongodb+srv://viie_admin:YOUR_PASSWORD@viie-erp-cluster.xxxxx.mongodb.net/viie-erp?retryWrites=true&w=majority"
```

## Test Connection

```bash
# Generate Prisma Client
npx prisma generate

# Test connection by pushing schema
npx prisma db push

# Should output:
# ✓ Your database is now in sync with your schema
```

## Atlas Dashboard Features

### Overview Tab
- Cluster metrics
- Connection count
- Operations per second
- Network traffic

### Collections Tab
- Browse database collections
- View documents
- Edit data (carefully!)
- Create indexes manually

### Metrics Tab
- **Operations**: Read/write operations
- **Network**: Bytes in/out
- **Connections**: Active connections
- **Opcounters**: Query types breakdown

### Alerts Tab
Configure alerts for:
- High CPU usage
- Low disk space
- Replication lag
- Connection spikes

### Backup Tab (M10+)
- Scheduled snapshots
- Point-in-time recovery
- Download backups
- Restore to cluster

## Production Recommendations

### Security
1. **Use strong passwords**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
2. **Restrict IP access**
   - Add only necessary IPs
   - Avoid `0.0.0.0/0` in production
3. **Enable encryption**
   - Enabled by default
   - Verify in Security → Encryption at Rest
4. **Enable audit logs** (M10+)
   - Database Access → Enable Audit Logs
5. **Use VPC Peering** (M10+)
   - For private network connection

### Performance
1. **Create indexes**
   - Atlas Performance Advisor suggests indexes
   - Prisma creates indexes from schema
2. **Monitor slow queries**
   - Performance → Query Profiler
3. **Set up alerts**
   - Alerts → Configure thresholds
4. **Review Performance Advisor weekly**

### Backup
1. **Enable continuous backups** (M10+)
   - Backup → Enable Continuous Backups
2. **Configure retention**
   - Default: 2 days
   - Production: 7-35 days
3. **Test restore process**
   - Restore to test cluster periodically

### Scaling
1. **Monitor cluster capacity**
   - Storage: < 80% full
   - Connections: < 80% of limit
2. **Upgrade cluster tier** when needed
   - Metrics → Cluster Tier → Modify
3. **Enable auto-scaling** (M10+)
   - Cluster → Configuration → Enable Auto-scaling

## Atlas Cluster Tiers Comparison

| Feature | M0 (Free) | M10 (Paid) | M30+ (Production) |
|---------|-----------|------------|-------------------|
| Storage | 512 MB | 10-4096 GB | 10-4096 GB |
| RAM | Shared | 2-16 GB | 8-768 GB |
| Backups | ❌ | ✅ Continuous | ✅ Continuous |
| Auto-scaling | ❌ | ✅ | ✅ |
| Performance Advisor | ❌ | ✅ | ✅ |
| VPC Peering | ❌ | ✅ | ✅ |
| Sharding | ❌ | ❌ | ✅ |
| Multi-region | ❌ | ❌ | ✅ |
| Price | Free | ~$0.08/hr | Varies |

## Common Issues

### Connection Timeout
**Problem**: Cannot connect to Atlas

**Solutions**:
1. Check IP whitelist (Network Access)
2. Verify connection string format
3. Check firewall on your machine/VPS
4. Ensure cluster is running (not paused)

### Authentication Failed
**Problem**: Login credentials rejected

**Solutions**:
1. Verify username/password
2. URL-encode special characters in password
3. Check database user exists (Database Access)
4. Verify user has correct permissions

### Slow Queries
**Problem**: Application slow, high response time

**Solutions**:
1. Check Performance Advisor for index suggestions
2. Review Query Profiler for slow queries
3. Upgrade cluster tier if CPU/RAM maxed
4. Optimize Prisma queries

### Storage Full
**Problem**: Cluster storage limit reached

**Solutions**:
1. M0: Upgrade to M10
2. M10+: Scale storage in cluster configuration
3. Archive old data
4. Implement soft delete cleanup

### Too Many Connections
**Problem**: Connection pool exhausted

**Solutions**:
1. Reduce Prisma connection pool size
2. Implement connection pooling
3. Upgrade cluster tier for more connections
4. Fix connection leaks in application

## Cost Estimation

### Free Tier (M0)
- **Cost**: $0/month
- **Limits**: 512 MB storage, shared resources
- **Best for**: Development, testing, small projects

### Production Tiers
**M10 (Starter):**
- **Cost**: ~$57/month (AWS)
- **Storage**: 10 GB
- **RAM**: 2 GB
- **Best for**: Small production apps

**M20 (Small Production):**
- **Cost**: ~$143/month (AWS)
- **Storage**: 20 GB
- **RAM**: 4 GB
- **Best for**: Growing applications

**M30 (Medium Production):**
- **Cost**: ~$285/month (AWS)
- **Storage**: 40 GB
- **RAM**: 8 GB
- **Features**: Sharding, multi-region
- **Best for**: Large-scale applications

**Cost Optimization:**
- Start with M0 for development
- Upgrade to M10 for production launch
- Monitor and scale as needed
- Use auto-scaling to handle spikes

## Migration from Local MongoDB

If migrating from local MongoDB:

```bash
# Export from local MongoDB
mongodump --db viie-erp --out ./backup

# Import to Atlas
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net" --db viie-erp ./backup/viie-erp

# Verify data
npx prisma studio
```

## Support Resources

- **Documentation**: https://docs.atlas.mongodb.com
- **Community Forums**: https://www.mongodb.com/community/forums
- **Support**: https://support.mongodb.com
- **Status Page**: https://status.mongodb.com
- **University**: https://university.mongodb.com (free courses)

## Next Steps

After Atlas setup:
1. ✅ Configure connection string in `.env`
2. ✅ Run `npx prisma db push`
3. ✅ Create admin user: `node scripts/create-admin.js`
4. ✅ Start development: `npm run dev`
5. ✅ Set up monitoring alerts
6. ✅ Configure backups (M10+)
7. ✅ Review security checklist
