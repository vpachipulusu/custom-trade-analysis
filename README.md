# TradingView AI Evaluator

A Next.js SaaS application that generates TradingView chart snapshots and provides AI-powered technical analysis using GPT-4o Vision.

## Features

### Core Functionality

- **Layout Management**: Create, edit, and delete TradingView chart layouts with encrypted session IDs
- **Snapshot Generation**: Generate chart snapshots using the CHART-IMG API
- **AI Analysis**: Get comprehensive technical analysis with GPT-4o Vision
  - Trading action (BUY/SELL/HOLD)
  - Confidence level (0-100%)
  - Timeframe recommendation
  - Detailed reasoning with multiple insights

### Authentication

- Email/password authentication via Firebase
- Google OAuth sign-in
- Protected routes with automatic redirection
- Secure token-based API authentication

### User Experience

- Material Design UI with responsive layout
- Real-time data updates with React Query
- Loading states and error handling
- Recent analyses dashboard
- Snapshot gallery for each layout

## Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: SCSS Modules + Material UI v5
- **State Management**: React Query v5
- **Authentication**: Firebase Auth

### Backend

- **Database**: PostgreSQL with Prisma ORM
- **API Routes**: Next.js API routes with middleware
- **Authentication**: Firebase Admin SDK
- **Encryption**: AES-256 for sessionid storage

### External Services

- **CHART-IMG API**: Chart snapshot generation
- **OpenAI GPT-4o**: Vision-based chart analysis
- **Firebase**: Authentication and user management

## Architecture

### Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  firebaseId String  @unique
  createdAt DateTime @default(now())
  layouts   Layout[]
}

model Layout {
  id        String     @id @default(cuid())
  userId    String
  symbol    String
  interval  String
  layoutId  String
  sessionid String?    // Encrypted AES-256
  createdAt DateTime   @default(now())
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  snapshots Snapshot[]
}

model Snapshot {
  id          String     @id @default(cuid())
  layoutId    String
  imageUrl    String
  expiresAt   DateTime
  createdAt   DateTime   @default(now())
  layout      Layout     @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  analyses    Analysis[]
}

model Analysis {
  id         String   @id @default(cuid())
  snapshotId String
  action     String   // BUY, SELL, HOLD
  confidence Int      // 0-100
  timeframe  String
  reasons    Json     // Array of reason objects
  createdAt  DateTime @default(now())
  snapshot   Snapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
}
```

### API Routes

| Method | Endpoint              | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | `/api/layouts`        | List user's layouts       |
| POST   | `/api/layouts`        | Create new layout         |
| PATCH  | `/api/layouts/[id]`   | Update layout             |
| DELETE | `/api/layouts/[id]`   | Delete layout (cascade)   |
| POST   | `/api/snapshot`       | Generate chart snapshot   |
| DELETE | `/api/snapshots/[id]` | Delete snapshot           |
| POST   | `/api/analyze`        | Analyze chart with AI     |
| GET    | `/api/analyses`       | List analyses (paginated) |
| GET    | `/api/analyses/[id]`  | Get single analysis       |

All routes require Firebase Bearer token authentication.

### Directory Structure

```
trade-analysis/
├── app/
│   ├── api/                   # API routes
│   │   ├── layouts/
│   │   ├── snapshot/
│   │   ├── snapshots/
│   │   ├── analyze/
│   │   └── analyses/
│   ├── dashboard/             # Main dashboard
│   ├── analysis/[id]/         # Analysis detail page
│   ├── login/                 # Auth pages
│   ├── signup/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing page
│   └── globals.scss
├── components/                # Reusable UI components
│   ├── ProtectedRoute.tsx
│   ├── Layout.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorAlert.tsx
│   ├── ActionChip.tsx
│   ├── ConfidenceProgress.tsx
│   ├── DeleteConfirmationDialog.tsx
│   ├── SnapshotCard.tsx
│   ├── LayoutsTable.tsx
│   ├── AddLayoutDialog.tsx
│   ├── EditLayoutDialog.tsx
│   ├── RecentAnalyses.tsx
│   ├── ViewSnapshotsDialog.tsx
│   ├── AnalysisDisplay.tsx
│   └── ErrorBoundary.tsx
├── contexts/
│   └── AuthContext.tsx        # Global auth state
├── hooks/                     # React Query hooks
│   ├── useLayouts.ts
│   ├── useSnapshots.ts
│   └── useAnalyses.ts
├── lib/
│   ├── db/                    # Database operations
│   │   ├── users.ts
│   │   ├── layouts.ts
│   │   ├── snapshots.ts
│   │   └── analyses.ts
│   ├── firebase/
│   │   ├── clientApp.ts
│   │   └── adminApp.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── services/              # External APIs
│   │   ├── chartimg.ts
│   │   └── openai.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   ├── errorHandler.ts
│   │   ├── validation.ts
│   │   ├── apiAuth.ts
│   │   └── validateEnv.ts
│   └── prisma.ts
├── prisma/
│   └── schema.prisma
├── next.config.js
├── vercel.json
├── package.json
├── tsconfig.json
├── DEPLOYMENT.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon or Supabase recommended)
- Firebase project
- CHART-IMG API key
- OpenAI API key

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations (after setting up DATABASE_URL in .env.local)
npx prisma migrate dev
```

## Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# Firebase Admin
FIREBASE_PROJECT_ID="..."
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL="..."

# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# External APIs
CHART_IMG_API_KEY="..."
OPENAI_API_KEY="..."

# Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY="..."
```

See `DEPLOYMENT.md` for detailed setup instructions.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Create a Layout

1. Log in or sign up
2. Navigate to Dashboard
3. Click "Add Layout"
4. Fill in:
   - Symbol (e.g., BTCUSD, AAPL)
   - Interval (e.g., 1D, 4H)
   - Layout ID (from TradingView URL)
   - Session ID (optional, from browser cookies)

### 2. Generate Snapshot

1. Click "Generate Snapshot" on a layout
2. Wait for CHART-IMG to generate the image
3. View snapshot in the gallery

### 3. Analyze Chart

1. Click "Analyze" on a snapshot
2. Wait for GPT-4o to analyze the chart
3. View analysis results with:
   - Action recommendation (BUY/SELL/HOLD)
   - Confidence percentage
   - Timeframe
   - Detailed reasoning

### 4. View Past Analyses

- Recent analyses appear in the dashboard
- Click "View Details" to see full analysis
- Analyses are linked to their snapshots

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database Commands

```bash
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Create and apply migration
npx prisma migrate deploy   # Apply migrations (production)
npx prisma generate         # Generate Prisma client
```

## API Documentation

### Authentication

All API routes require a Firebase Bearer token:

```bash
Authorization: Bearer <firebase-token>
```

### Request/Response Examples

**Create Layout**

```bash
POST /api/layouts
Content-Type: application/json
Authorization: Bearer <token>

{
  "symbol": "BTCUSD",
  "interval": "1D",
  "layoutId": "abc123",
  "sessionid": "optional-session-id"
}
```

**Generate Snapshot**

```bash
POST /api/snapshot
Content-Type: application/json
Authorization: Bearer <token>

{
  "layoutId": "layout-id"
}
```

**Analyze Chart**

```bash
POST /api/analyze
Content-Type: application/json
Authorization: Bearer <token>

{
  "snapshotId": "snapshot-id"
}
```

Response:

```json
{
  "id": "analysis-id",
  "action": "BUY",
  "confidence": 75,
  "timeframe": "Short-term (1-3 days)",
  "reasons": [
    {
      "title": "Bullish Breakout",
      "description": "Price broke above resistance..."
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Deployment

See `DEPLOYMENT.md` for comprehensive deployment instructions including:

- Environment variable setup
- Database configuration (Neon/Supabase)
- Firebase project setup
- External API key configuration
- Vercel deployment
- Post-deployment testing
- Troubleshooting guide

### Quick Deploy to Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy!

## Security

- **Authentication**: Firebase tokens verified on all API routes
- **Database**: Prisma ORM prevents SQL injection
- **Encryption**: AES-256 for sensitive sessionid data
- **Headers**: Security headers configured (X-Frame-Options, etc.)
- **Validation**: Input validation on all endpoints
- **HTTPS**: Enforced in production

## Troubleshooting

### Common Issues

**"Cannot find module '@prisma/client'"**

```bash
npx prisma generate
```

**"Firebase: Error (auth/invalid-api-key)"**

- Check `NEXT_PUBLIC_FIREBASE_API_KEY` in `.env.local`

**"PrismaClientInitializationError"**

- Verify `DATABASE_URL` format
- For serverless: add `?pgbouncer=true&connection_limit=1`

**Images not loading**

- Verify `next.config.js` has `remotePatterns` for `chart-img.com`

See `DEPLOYMENT.md` for more troubleshooting tips.

## License

MIT License

## Roadmap

- [ ] Stripe subscription integration
- [ ] Rate limiting on API routes
- [ ] Enhanced analytics dashboard
- [ ] Multiple AI model comparison
- [ ] Export analysis to PDF
- [ ] Backtesting with historical data

---

**Built with Next.js, TypeScript, Material UI, Prisma, and Firebase** 🚀

- Layout management
- Analysis history

## Project Structure

```
src/
├── app/                 # Next.js pages
├── components/          # React components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
│   ├── db/            # Database operations
│   ├── firebase/      # Firebase setup
│   ├── middleware/    # Auth middleware
│   ├── services/      # External API services
│   └── utils/         # Helper functions
└── styles/            # Global styles
```
