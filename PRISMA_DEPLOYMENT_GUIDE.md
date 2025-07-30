# Prisma Deployment Guide for Vercel

## Problem Solved
This guide addresses the Vercel deployment error:
```
Error [PrismaClientInitializationError]: Prisma has detected that this project was built on Vercel, which caches dependencies. This leads to an outdated Prisma Client because Prisma's auto-generation isn't triggered.
```

## Solution Implementation

### 1. Package.json Scripts Updated
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

### 2. Vercel Configuration (vercel.json)
```json
{
  "buildCommand": "prisma generate && pnpm run build",
  "installCommand": "pnpm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "PRISMA_GENERATE_SKIP_AUTOINSTALL": "true"
  }
}
```

### 3. Enhanced Error Handling
- API routes now test Prisma Client connection before executing queries
- Detailed error messages for debugging Prisma initialization issues
- Graceful fallback for database connection problems

### 4. Connection Manager Improvements
- Better error handling in the database connection manager
- Environment-specific logging levels
- Clear error messages for missing Prisma Client

## Deployment Checklist

### Before Deployment
- [ ] Ensure `DATABASE_URL` is set in Vercel environment variables
- [ ] Verify `prisma/schema.prisma` is committed to repository
- [ ] Check that `lib/generated/prisma` is in `.gitignore` (generated files)

### Vercel Environment Variables Required
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### Build Process Verification
1. `pnpm install` - Installs dependencies
2. `prisma generate` - Generates Prisma Client (via postinstall)
3. `prisma generate && pnpm run build` - Ensures client is generated before build
4. `next build` - Builds the Next.js application

## Troubleshooting

### If Build Still Fails
1. Check Vercel build logs for Prisma generation errors
2. Verify DATABASE_URL is accessible from Vercel
3. Ensure Prisma schema is valid
4. Check that custom output path `../lib/generated/prisma` is correct

### Common Issues
- **Missing DATABASE_URL**: Set in Vercel dashboard
- **Invalid Schema**: Run `prisma validate` locally
- **Permission Issues**: Ensure Vercel can write to generated directories

### Testing Locally
```bash
# Clean install and build test
rm -rf node_modules lib/generated/prisma
pnpm install
pnpm run build
```

## Files Modified
- `package.json` - Added prisma generate to build and postinstall
- `vercel.json` - Created with build configuration
- `app/api/bitcoin-prices/historical/route.ts` - Enhanced error handling
- `lib/database/connection-manager.ts` - Improved error handling
- `scripts/build-setup.sh` - Build verification script

## Success Indicators
- ✅ Vercel build completes without Prisma errors
- ✅ API routes return data instead of initialization errors
- ✅ `/api/bitcoin-prices/historical` endpoint works correctly
- ✅ Database queries execute successfully in production
