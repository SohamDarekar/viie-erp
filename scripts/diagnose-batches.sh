#!/bin/bash

# Batch Functionality Diagnostic Script
# This script checks all components of the batch system

echo "==================================="
echo "   BATCH SYSTEM DIAGNOSTIC"
echo "==================================="
echo ""

# Check 1: Database connectivity
echo "1. Checking database connectivity..."
if node scripts/check-batches.js &> /dev/null; then
    echo "   ✓ Database connection successful"
else
    echo "   ✗ Database connection failed"
    exit 1
fi

# Check 2: Batch data
echo ""
echo "2. Checking batch data..."
node scripts/check-batches.js

# Check 3: User data
echo ""
echo "3. Checking admin users..."
node scripts/list-all-users.js | grep -A 6 "ADMIN" || echo "No admin users found"

# Check 4: Simulate admin page load
echo ""
echo "4. Simulating admin page data load..."
node scripts/simulate-admin-load.js

# Check 5: Prisma client
echo ""
echo "5. Checking Prisma client..."
if [ -d "node_modules/.prisma/client" ]; then
    echo "   ✓ Prisma client is generated"
else
    echo "   ✗ Prisma client not found. Running 'npx prisma generate'..."
    npx prisma generate
fi

# Check 6: TypeScript compilation
echo ""
echo "6. Checking TypeScript compilation..."
if npx tsc --noEmit &> /dev/null; then
    echo "   ✓ No TypeScript errors found"
else
    echo "   ⚠️  TypeScript errors detected (check with 'npx tsc --noEmit')"
fi

echo ""
echo "==================================="
echo "   DIAGNOSTIC COMPLETE"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. If all checks pass, the issue is likely in the browser"
echo "2. Open browser DevTools (F12) and check Console tab"
echo "3. Refresh the admin page and look for API call logs"
echo "4. Check Network tab for /api/admin/batches response"
echo ""
echo "For more help, see: BATCH_FIX_SUMMARY.md"
