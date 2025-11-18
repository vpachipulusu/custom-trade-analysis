# Economic Calendar Feature - Setup Guide

## ✅ Completed Implementation

### Phase 1: Backend Infrastructure (COMPLETED)

- ✅ Database schema updated (EconomicEvent & EconomicContext tables)
- ✅ Prisma migration applied successfully
- ✅ Rate limiter created (250 requests/day tracking)
- ✅ Economic Calendar service (FMP API integration)
- ✅ Symbol parser (BTCUSD, EURUSD, AAPL, XAUUSD support)
- ✅ Database operations (economicEvents.ts & economicContext.ts)
- ✅ AI economic impact analysis added to OpenAI service

### Phase 2: API Routes (COMPLETED)

- ✅ `/api/economic-events` - Fetch economic events with filters
- ✅ `/api/economic-impact` - Analyze economic impact for symbols
- ✅ `/api/analyze` - Enhanced to include automatic economic context
- ✅ Analysis queries updated to include economic context relation

### Phase 3: UI Components (COMPLETED)

- ✅ `RiskLevelBadge` - Display risk levels (NONE/LOW/MEDIUM/HIGH/EXTREME)
- ✅ `OutlookChip` - Display weekly outlook (BULLISH/BEARISH/NEUTRAL/VOLATILE)
- ✅ `EconomicEventCard` - Display individual event details
- ✅ `EconomicEventsList` - List events grouped by day with filters
- ✅ `EconomicContextPanel` - Main component showing complete analysis

## 🔑 Required: Add FMP API Key

**CRITICAL**: You must add your Financial Modeling Prep API key to use this feature.

### Step 1: Get Free API Key

1. Go to: https://financialmodelingprep.com/developer/docs/
2. Click "Get API Key" button
3. Sign up (NO credit card required for free tier)
4. Copy your API key from the dashboard

### Step 2: Add to Environment Variables

Open `.env.local` and add:

```bash
FMP_API_KEY=your_api_key_here
```

### Step 3: Verify Setup

The free tier provides:

- ✅ 250 API requests per day
- ✅ Real-time economic calendar data
- ✅ 5+ years of historical data
- ✅ No credit card required

With our smart caching (6-hour TTL), 250 requests/day supports ~60 users checking multiple symbols daily.

## 📊 How It Works

### Automatic Integration

When a user runs an analysis:

1. **Technical Analysis** runs first (existing functionality)
2. **Economic Context** automatically fetches:
   - Events within ±1 hour (immediate volatility risk)
   - Events within 7 days (trend impact)
3. **AI Analysis** evaluates economic impact using GPT-4
4. **Database Storage** saves economic context linked to analysis

### API Endpoints

#### GET /api/economic-events

Fetch economic events with optional filters:

```
GET /api/economic-events?symbol=EURUSD&startDate=2025-11-16&endDate=2025-11-23
GET /api/economic-events?countries=US,EU&impact=HIGH
```

#### POST /api/economic-impact

Analyze economic impact for a symbol:

```json
{
  "symbol": "BTCUSD",
  "action": "BUY",
  "date": "2025-11-16T10:00:00Z"
}
```

Response includes:

- upcomingEvents (±1 hour)
- weeklyEvents (7 days)
- immediateRisk level
- weeklyOutlook
- AI-generated warnings, opportunities, and recommendations

## 🎯 Next Steps (Optional)

### Remaining Sessions:

**Session G**: Integrate into Analysis Page

- Update analysis display to show economic context tab
- Add "Refresh Economic Data" button
- Show risk badges on recent analyses

**Session H**: Standalone Economic Calendar Page

- Full calendar view at `/economic-calendar`
- Timeline, list, and grid views
- Advanced filtering (date, country, impact, category)
- Export to CSV functionality

**Session I**: Background Jobs (Optional)

- Automatic data refresh every 6 hours
- Cleanup old events (30+ days)
- Manual refresh endpoint for admins

**Session J**: Testing & Polish

- Error boundaries
- Loading skeletons
- Mobile responsive design
- Performance optimization

## 🧪 Testing

### 1. Test FMP API Connection

Create a test file: `test-fmp.ts`

```typescript
import { fetchEconomicEvents } from "./src/lib/services/economicCalendar";

async function test() {
  const events = await fetchEconomicEvents({
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    countries: ["US"],
  });

  console.log(`Fetched ${events.length} US events`);
  console.log(events.slice(0, 3)); // Show first 3
}

test();
```

Run: `npx ts-node test-fmp.ts`

### 2. Test Symbol Parser

```typescript
import { parseSymbolCurrencies } from "./src/lib/services/economicCalendar";

console.log(parseSymbolCurrencies("BTCUSD"));
// { currencies: ["BTC", "USD"], countries: ["US"], assetType: "crypto" }

console.log(parseSymbolCurrencies("EURUSD"));
// { currencies: ["EUR", "USD"], countries: ["EU", "US"], assetType: "forex" }
```

### 3. Test Analysis with Economic Context

1. Create a snapshot in your app
2. Run analysis
3. Check response - should include `economicContext` field
4. Database should have new record in `EconomicContext` table

## 📋 Rate Limit Monitoring

The rate limiter automatically:

- ✅ Tracks daily usage (resets at midnight UTC)
- ✅ Warns at 200/250 requests (80% capacity)
- ✅ Blocks requests at 250/250
- ✅ Extends cache to 12 hours when approaching limit
- ✅ Returns cached data when limit exceeded

View current usage in logs:

```
[RateLimiter] FMP requests today: 45/250
```

## 🎨 UI Components Usage

### In Analysis Display

```tsx
import EconomicContextPanel from "@/components/EconomicContextPanel";

// Inside your component
{
  analysis.economicContext && (
    <EconomicContextPanel economicContext={analysis.economicContext} />
  );
}
```

### Risk Badge in List

```tsx
import RiskLevelBadge from "@/components/RiskLevelBadge";

{
  analysis.economicContext && (
    <RiskLevelBadge
      riskLevel={analysis.economicContext.immediateRisk}
      size="small"
    />
  );
}
```

## 🚀 Deployment Checklist

- [ ] FMP_API_KEY added to production environment variables
- [ ] Database migrations run on production: `npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] OPENAI_KEY still configured (required for economic impact analysis)
- [ ] Monitor FMP usage in production logs
- [ ] Consider upgrading FMP plan if > 60 active users

## 💰 Cost Considerations

### Current Setup (FREE)

- FMP Free Tier: $0/month (250 requests/day)
- OpenAI: Existing usage + ~0.5-1 cent per economic analysis

### Scaling Options

If you exceed 250 FMP requests/day:

**Option 1**: Increase cache duration

- Change DEFAULT_CACHE_TTL to 12 hours
- Reduces daily requests by 50%

**Option 2**: Upgrade FMP

- Starter: $14.99/month (750 requests/day)
- Professional: $99/month (5,000 requests/day)

**Option 3**: Conditional economic analysis

- Only run for HIGH confidence technical signals
- Only run for symbols with recent user activity

## 📝 Feature Flags (Optional)

To disable economic calendar feature:

1. Skip setting FMP_API_KEY
2. Economic analysis will gracefully skip
3. Analyses will continue without economic context
4. No errors or breaking changes

The feature is designed to enhance, not replace, existing functionality.

## ✨ Summary

You now have a complete economic calendar integration that:

- ✅ Automatically enriches every analysis with fundamental context
- ✅ Uses smart caching to stay within free API limits
- ✅ Provides AI-powered risk assessment and recommendations
- ✅ Displays beautiful, informative UI components
- ✅ Gracefully degrades if API is unavailable

**Just add your FMP_API_KEY to .env.local and you're ready to go!**
