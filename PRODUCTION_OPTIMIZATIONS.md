# Production Optimization Guide

This document outlines the production optimizations implemented in the TradingView AI Evaluator.

## Overview

The following optimizations have been added to ensure the application performs well in production:

1. **React Strict Mode** - Development-time checks for potential issues
2. **Rate Limiting** - Prevents API abuse
3. **Request Logging** - Monitors API usage and performance
4. **Caching Headers** - Optimizes static asset delivery
5. **Environment Validation** - Ensures proper configuration

---

## 1. React Strict Mode

**File**: `src/app/layout.tsx`

React Strict Mode is enabled to help identify potential problems during development:

```tsx
<StrictMode>
  <QueryClientProvider client={queryClient}>{/* ... */}</QueryClientProvider>
</StrictMode>
```

**Benefits**:

- Identifies unsafe lifecycle methods
- Warns about legacy string ref API usage
- Detects unexpected side effects
- Helps prepare for future React features

**Note**: Strict Mode only runs in development and doesn't impact production.

---

## 2. Rate Limiting

**File**: `lib/middleware/rateLimit.ts`

Basic in-memory rate limiting to prevent API abuse:

### Usage in API Routes

```typescript
import {
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimitResponse,
  STRICT_RATE_LIMIT,
} from "@/lib/middleware/rateLimit";

export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResult = checkRateLimit(request, STRICT_RATE_LIMIT);

  if (!rateLimitResult.success) {
    return createRateLimitResponse();
  }

  // Your API logic here...
  const response = new Response(/* ... */);

  // Add rate limit headers
  const headers = getRateLimitHeaders(rateLimitResult);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

### Available Rate Limit Configurations

```typescript
// Standard: 100 requests per 15 minutes
STANDARD_RATE_LIMIT;

// Strict (expensive operations): 10 requests per 15 minutes
STRICT_RATE_LIMIT;

// Auth endpoints: 5 requests per 15 minutes
AUTH_RATE_LIMIT;
```

### Custom Rate Limit

```typescript
const customLimit: RateLimitConfig = {
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: (request) => {
    // Custom identifier logic (e.g., user ID from token)
    return getUserIdFromToken(request);
  },
};
```

### Production Considerations

The current implementation uses **in-memory storage**, which works for single-instance deployments. For multi-instance/serverless environments:

**Option 1: Redis-based rate limiting**

```bash
npm install ioredis
```

**Option 2: Upstash (serverless Redis)**

```bash
npm install @upstash/redis
```

**Option 3: Vercel Edge Config**

```bash
npm install @vercel/edge-config
```

---

## 3. Request Logging

**File**: `lib/utils/logging.ts`

Comprehensive request logging for monitoring and debugging:

### Basic Logging

```typescript
import { logRequest, LogLevel } from "@/lib/utils/logging";

export async function GET(request: Request) {
  logRequest(LogLevel.INFO, request, {
    userId: "user-123",
    status: 200,
  });
}
```

### Automatic Request Logging

```typescript
import { withRequestLogging } from "@/lib/utils/logging";

async function handler(request: Request): Promise<Response> {
  // Your logic here
  return new Response(JSON.stringify({ success: true }));
}

export const POST = withRequestLogging(handler, { userId: "user-123" });
```

### Performance Monitoring

```typescript
import { measureDuration } from "@/lib/utils/logging";

const result = await measureDuration(
  "OpenAI Analysis",
  async () => {
    return await analyzeChart(imageUrl);
  },
  { imageUrl, model: "gpt-4o" }
);
```

### Log Output

Logs include:

- Timestamp (ISO 8601)
- HTTP method and URL
- Client IP address
- User ID (if authenticated)
- Request duration
- Response status
- Error messages

Example:

```
[INFO] [2024-01-01T12:00:00.000Z] POST /api/analyze | IP: 192.168.1.1 | User: user-123 | Duration: 1234ms | Status: 200
```

### External Logging Services

For production, integrate with:

**Vercel Analytics**

```bash
npm install @vercel/analytics
```

**Sentry**

```bash
npm install @sentry/nextjs
```

**Datadog**

```bash
npm install dd-trace
```

---

## 4. Caching Headers

**File**: `next.config.js`

Optimized caching for static assets:

```javascript
async headers() {
  return [
    // Static assets (forever cache)
    {
      source: "/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    // Images (1 day cache with revalidation)
    {
      source: "/:path*.{jpg,jpeg,png,gif,webp,svg,ico}",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, must-revalidate",
        },
      ],
    },
  ];
}
```

### Cache Durations

| Asset Type                 | Duration | Strategy                  |
| -------------------------- | -------- | ------------------------- |
| Static files (`/static/*`) | 1 year   | Immutable (fingerprinted) |
| Images                     | 1 day    | Revalidate                |
| API responses              | No cache | Dynamic data              |

### API Response Caching

For cacheable API responses:

```typescript
export async function GET(request: Request) {
  const response = new Response(JSON.stringify(data));

  // Cache for 5 minutes
  response.headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=600"
  );

  return response;
}
```

---

## 5. Environment Validation

**File**: `lib/utils/validateEnv.ts`

Validates all required environment variables on build:

### Validation Rules

- **DATABASE_URL**: Must start with `postgresql://`
- **FIREBASE_PRIVATE_KEY**: Must contain valid private key markers
- **FIREBASE_CLIENT_EMAIL**: Must be a service account email
- **ENCRYPTION_KEY**: Must be 64 hex characters (32 bytes)
- **OPENAI_API_KEY**: Must start with `sk-`
- **NEXT_PUBLIC_FIREBASE_API_KEY**: Must start with `AIza`

### Usage

Automatically runs on build (non-development):

```javascript
// next.config.js
if (process.env.NODE_ENV !== "development") {
  const { validateEnv } = require("./lib/utils/validateEnv");
  validateEnv();
}
```

### Manual Validation

```typescript
import { validateEnv, getEnvConfig } from "@/lib/utils/validateEnv";

// Validate
validateEnv();

// Get typed config
const config = getEnvConfig();
console.log(config.DATABASE_URL);
```

---

## 6. Security Headers

**File**: `next.config.js`

Comprehensive security headers for all routes:

```javascript
headers: [
  {
    key: "X-Frame-Options",
    value: "DENY", // Prevent clickjacking
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff", // Prevent MIME sniffing
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
```

---

## 7. Database Optimizations

### Connection Pooling

For serverless environments (Vercel), use connection pooling:

```bash
# Neon (built-in pooling)
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1"

# Supabase
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1"
```

### Prisma Client Optimization

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});
```

---

## 8. Image Optimization

**File**: `next.config.js`

Next.js Image component handles optimization automatically:

```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "chart-img.com",
    },
  ],
}
```

### Usage

```tsx
import Image from "next/image";

<Image
  src={snapshot.imageUrl}
  alt="Chart snapshot"
  width={800}
  height={600}
  quality={85}
  priority={false} // Lazy load
/>;
```

---

## 9. Bundle Optimization

### Already Configured

- **Code splitting**: Automatic with Next.js App Router
- **Tree shaking**: Removes unused code
- **Compression**: Enabled in `next.config.js`
- **Minification**: Automatic in production builds

### Monitor Bundle Size

```bash
npm run build

# Analyze bundle
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

---

## 10. Monitoring Checklist

- [ ] Set up error tracking (Sentry)
- [ ] Enable Vercel Analytics
- [ ] Monitor API rate limits
- [ ] Track slow database queries
- [ ] Monitor external API usage (CHART-IMG, OpenAI)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors

---

## Production Deployment Checklist

- [ ] All environment variables set
- [ ] Environment validation passing
- [ ] Database migrations applied
- [ ] Firebase configured
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Security headers verified
- [ ] Caching headers tested
- [ ] SSL/HTTPS enabled
- [ ] Error tracking set up

---

## Performance Benchmarks

Target metrics for production:

| Metric                         | Target  | Current |
| ------------------------------ | ------- | ------- |
| Time to First Byte (TTFB)      | < 200ms | Monitor |
| First Contentful Paint (FCP)   | < 1.8s  | Monitor |
| Largest Contentful Paint (LCP) | < 2.5s  | Monitor |
| Time to Interactive (TTI)      | < 3.8s  | Monitor |
| API Response Time (avg)        | < 500ms | Monitor |

Use Vercel Analytics or Lighthouse to track these metrics.

---

## Additional Optimizations (Future)

### Redis Caching

```bash
npm install ioredis
```

### API Response Compression

```typescript
import { compress } from "compress-json";
```

### Database Query Caching

```typescript
// Use React Query's caching for client-side
// Use Redis for server-side caching
```

### CDN for Static Assets

- Vercel automatically uses CDN
- Configure custom CDN if needed

---

**All optimizations are production-ready!** 🚀
