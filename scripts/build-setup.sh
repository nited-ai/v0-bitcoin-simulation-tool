#!/bin/bash

# Build Setup Script for Vercel Deployment
# Ensures Prisma Client is properly generated before build

echo "🚀 Starting build setup..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Check if generation was successful
if [ $? -eq 0 ]; then
  echo "✅ Prisma Client generated successfully"
else
  echo "❌ Failed to generate Prisma Client"
  exit 1
fi

# Verify the generated client exists
if node -e "require('@prisma/client')"; then
  echo "✅ Prisma Client package available"
else
  echo "❌ Prisma Client files not found"
  exit 1
fi

echo "🎉 Build setup completed successfully"
