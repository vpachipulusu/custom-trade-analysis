# Deployment Guide

This guide walks you through deploying the TradingView AI Evaluator to production.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon or Supabase recommended)
- Firebase project
- CHART-IMG API key
- OpenAI API key
- Vercel account (recommended) or other Next.js hosting

---

## 1. Environment Variables Checklist

Create a `.env.local` file (local) or configure environment variables in your hosting platform:

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Firebase Admin SDK
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"

# External APIs
CHART_IMG_API_KEY="your-chart-img-api-key"
OPENAI_API_KEY="sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Encryption (generate random 32-byte hex string)
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### Generate Encryption Key

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell
[System.BitConverter]::ToString((1..32 | ForEach-Object { Get-Random -Maximum 256 })).Replace('-','').ToLower()
```

---

## 2. Database Setup

### Option A: Neon (Recommended)

1. Go to [neon.tech](https://neon.tech) and create account
2. Create new project
3. Copy connection string (pooled connection recommended)
4. Add to `DATABASE_URL`

### Option B: Supabase

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Go to Project Settings → Database
4. Copy connection string (Transaction mode)
5. Add `?pgbouncer=true&connection_limit=1` if using serverless
6. Add to `DATABASE_URL`

### Run Migrations

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database or open Prisma Studio
npx prisma studio
```

---

## 3. Firebase Configuration

### Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project (or use existing)
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable **Email/Password**
   - Enable **Google** (configure OAuth consent screen)
4. Get Client SDK config:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Add web app
   - Copy config values to `NEXT_PUBLIC_FIREBASE_*` variables

### Firebase Admin SDK

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download JSON file
4. Extract values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep `\n` newlines)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

**Important**: For `FIREBASE_PRIVATE_KEY`, ensure newlines are preserved:

```bash
# Correct format (with \n):
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

---

## 4. External API Keys

### CHART-IMG API

1. Go to [chart-img.com](https://www.chart-img.com)
2. Sign up and get API key
3. Add to `CHART_IMG_API_KEY`
4. Verify API plan supports required usage

### OpenAI API

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account and add payment method
3. Create API key
4. Add to `OPENAI_API_KEY`
5. Ensure GPT-4o model access (may require spending threshold)

---

## 5. Vercel Deployment

### Initial Setup

1. Install Vercel CLI (optional):

```bash
npm i -g vercel
```

2. Connect GitHub repository:
   - Go to [vercel.com](https://vercel.com)
   - New Project → Import Git Repository
   - Select your repository

### Configure Environment Variables

1. In Vercel dashboard, go to Project Settings → Environment Variables
2. Add all variables from checklist above
3. Set for **Production**, **Preview**, and **Development** environments

### Deploy

```bash
# Option 1: Git push (automatic)
git push origin main

# Option 2: Vercel CLI
vercel --prod
```

### Verify Build

1. Check build logs for errors
2. Verify Prisma client generation
3. Check for missing environment variables

---

## 6. Post-Deployment Testing

### Smoke Tests

- [ ] Visit homepage - redirects to `/login`
- [ ] Sign up with email/password
- [ ] Log in with email/password
- [ ] Log in with Google OAuth
- [ ] Navigate to dashboard
- [ ] Create a layout (without sessionid)
- [ ] Create a layout (with sessionid - verify encryption)
- [ ] Generate snapshot
- [ ] View snapshots for layout
- [ ] Analyze chart
- [ ] View analysis details
- [ ] Delete snapshot
- [ ] Delete layout
- [ ] Log out

### API Tests

```bash
# Test health (create simple health check endpoint)
curl https://your-app.vercel.app/api/health

# Test authenticated endpoint (use Bearer token from browser DevTools)
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  https://your-app.vercel.app/api/layouts
```

### Database Verification

```bash
# Check production database
npx prisma studio --url "YOUR_PRODUCTION_DATABASE_URL"
```

---

## 7. Troubleshooting

### Build Failures

**Error**: `Cannot find module '@prisma/client'`

```bash
# Solution: Ensure vercel.json has correct buildCommand
# vercel.json should have:
"buildCommand": "prisma generate && next build"
```

**Error**: `Environment variable not found: DATABASE_URL`

```bash
# Solution: Add missing env var in Vercel dashboard
# Settings → Environment Variables
```

### Runtime Errors

**Error**: `Firebase: Error (auth/invalid-api-key)`

```bash
# Solution: Check NEXT_PUBLIC_FIREBASE_API_KEY
# Ensure no trailing spaces or quotes
```

**Error**: `PrismaClientInitializationError`

```bash
# Solution: Check DATABASE_URL format
# Ensure connection string is valid
# For Neon: use pooled connection
# For Supabase: add ?pgbouncer=true
```

**Error**: `Invalid FIREBASE_PRIVATE_KEY`

```bash
# Solution: Ensure newlines are preserved
# Use double quotes, keep \n characters
# Example: "-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

### Image Loading Issues

**Error**: Images not loading from CHART-IMG

```bash
# Solution: Check next.config.js has remotePatterns
# Should include: { protocol: 'https', hostname: 'chart-img.com' }
```

### Authentication Issues

**Error**: 401 Unauthorized on API routes

```bash
# Solution: Check Firebase token generation
# Verify getAuthToken() in AuthContext
# Ensure token is sent in Authorization header
```

---

## 8. Performance Optimization

### Database Connection Pooling

For serverless environments (Vercel), use connection pooling:

```bash
# Neon (already pooled)
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1"

# Supabase
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1"
```

### Caching Strategy

- Static pages: Cached by default
- API routes: Add `revalidate` or Cache-Control headers
- Images: Next.js Image component handles optimization

### Monitoring

Add monitoring (optional):

```bash
# Vercel Analytics
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
// Add <Analytics /> in body
```

---

## 9. Security Checklist

- [ ] All environment variables set (no defaults in code)
- [ ] Firebase security rules configured
- [ ] Database user has minimal required permissions
- [ ] API keys rotated if exposed
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Security headers configured in next.config.js
- [ ] Rate limiting implemented (optional, see Session 10)
- [ ] CORS configured if needed
- [ ] Input validation on all API routes
- [ ] SQL injection protection (Prisma handles this)

---

## 10. Backup & Maintenance

### Database Backups

**Neon**: Automatic backups (paid plans)
**Supabase**: Daily backups included

Manual backup:

```bash
pg_dump DATABASE_URL > backup.sql
```

### Monitoring

- Vercel Dashboard: Check function logs, errors
- Database: Monitor connection count, slow queries
- External APIs: Track usage limits (CHART-IMG, OpenAI)

### Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Update Prisma
npm install @prisma/client@latest prisma@latest
npx prisma generate
```

---

## Support Resources

- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Prisma Docs**: [prisma.io/docs](https://www.prisma.io/docs)
- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **CHART-IMG API**: [chart-img.com/docs](https://www.chart-img.com/documentation)
- **OpenAI API**: [platform.openai.com/docs](https://platform.openai.com/docs)

---

## Quick Reference Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create migration
npx prisma migrate deploy  # Run migrations (production)
npx prisma generate        # Generate Prisma client

# Deployment
git push origin main       # Auto-deploy on Vercel
vercel --prod             # Manual deploy with CLI
```

---

**Deployment Complete!** 🚀

Your TradingView AI Evaluator is now live. Monitor logs and user feedback for any issues.
