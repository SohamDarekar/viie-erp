#!/bin/bash

# VIIE ERP - Quick Start Script
# This script helps set up the development environment

echo "=== VIIE ERP Setup Script ==="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20.x first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Generate Prisma Client
echo ""
echo "Generating Prisma Client..."
npx prisma generate

# Create upload directory
echo ""
echo "Creating upload directory..."
mkdir -p storage/uploads

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Create MongoDB Atlas cluster (free tier available)"
echo "2. Get connection string from Atlas dashboard"
echo "3. Edit .env file with your Atlas connection string"
echo "4. Run: npx prisma db push (to sync schema)"
echo "5. Run: npm run dev"
echo "6. Create admin user: node scripts/create-admin.js"
echo ""
