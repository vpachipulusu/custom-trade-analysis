# Trading Journal Feature Documentation

## Overview

The Trading Journal is a comprehensive trade tracking and performance analytics system integrated into the TradingView AI Evaluator application. It allows traders to log every trade, analyze performance metrics, and maintain discipline through detailed tracking.

## Features

### 🎯 Core Capabilities

1. **Comprehensive Trade Logging**

   - Record all trade details: entry, exit, position size, stop loss, take profit
   - Track costs, P/L, and account balance changes
   - Add screenshots and trade notes
   - Link trades to AI chart analyses

2. **Performance Analytics**

   - Win rate, ROI, risk/reward ratios
   - Average win/loss amounts
   - Monthly and all-time statistics
   - Market-specific performance tracking

3. **Visual Charts & Analytics**

   - Equity curve with drawdown tracking
   - Win/loss distribution
   - P/L distribution histogram
   - Market performance comparison
   - Discipline vs performance correlation

4. **Excel Integration**

   - Export full journal to Excel
   - Import existing trades from Excel
   - Compatible with "Disciplined Trader" template
   - Preserves all formatting and formulas

5. **Discipline Tracking**
   - Rate discipline (1-10) for each trade
   - Track emotional state
   - Tag strategies and setups
   - Analyze correlation with outcomes

## Architecture

### Database Schema

```prisma
model JournalSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  startingBalance Decimal  @db.Decimal(10, 2)
  currentBalance  Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD")
  // ... other fields
}

model Trade {
  id                String   @id @default(cuid())
  userId            String
  date              DateTime
  direction         String   // "Long" or "Short"
  market            String
  entryPrice        Decimal  @db.Decimal(10, 5)
  positionSize      Decimal  @db.Decimal(10, 2)
  stopLossPrice     Decimal? @db.Decimal(10, 5)
  takeProfitPrice   Decimal? @db.Decimal(10, 5)
  actualExitPrice   Decimal? @db.Decimal(10, 5)
  closedPositionPL  Decimal? @db.Decimal(10, 2)
  status            String   @default("open") // "open" or "closed"
  disciplineRating  Int?     // 1-10
  emotionalState    String?
  analysisId        String?  // Link to Analysis
  // ... 40+ fields total
}

model MonthlyStats {
  id              String   @id @default(cuid())
  userId          String
  year            Int
  month           Int      // 1-12
  totalTrades     Int
  winningTrades   Int
  losingTrades    Int
  winRate         Decimal  @db.Decimal(5, 2)
  totalPL         Decimal  @db.Decimal(10, 2)
  // ... 27 fields total

  @@unique([userId, year, month])
}
```

### API Routes

- `GET /api/journal/settings` - Get user settings
- `PATCH /api/journal/settings` - Update settings
- `GET /api/journal/trades` - List trades (with filters)
- `POST /api/journal/trades` - Create new trade
- `GET /api/journal/trades/[id]` - Get single trade
- `PATCH /api/journal/trades/[id]` - Update trade
- `DELETE /api/journal/trades/[id]` - Delete trade
- `POST /api/journal/trades/[id]/close` - Close trade
- `GET /api/journal/stats` - Get statistics
- `GET /api/journal/export` - Export to Excel
- `POST /api/journal/import` - Import from Excel

### UI Components

```
src/
├── app/
│   └── journal/
│       └── page.tsx                 # Main journal page
├── components/
│   ├── Layout.tsx                   # Updated with journal nav
│   ├── LinkToJournalButton.tsx      # Analysis → Journal link
│   └── journal/
│       ├── JournalStats.tsx         # Top-level metrics
│       ├── TradeLogTable.tsx        # DataGrid of trades
│       ├── AddTradeDialog.tsx       # 3-step trade entry
│       ├── CloseTradeDialog.tsx     # Trade exit form
│       ├── TradeDetailsDialog.tsx   # Full trade view
│       ├── MonthlyAnalysisTable.tsx # Month comparison
│       ├── JournalSettingsDialog.tsx# Settings form
│       ├── OnboardingDialog.tsx     # First-time setup
│       ├── StatisticsTab.tsx        # Charts container
│       ├── EquityCurveChart.tsx     # Account growth
│       ├── WinLossChart.tsx         # Win/loss bars
│       ├── PLDistributionChart.tsx  # P/L histogram
│       ├── MarketPerformanceChart.tsx # By-symbol stats
│       └── DisciplineChart.tsx      # Discipline tracking
├── lib/
│   ├── db/
│   │   └── journal.ts               # Database operations
│   └── utils/
│       ├── excelExport.ts           # Excel generation
│       └── excelImport.ts           # Excel parsing
```

## Usage Guide

### First-Time Setup

1. Navigate to `/journal`
2. Complete onboarding wizard:
   - Welcome screen
   - Set starting balance
   - Review features
3. Start adding trades!

### Adding a Trade

**Method 1: Manual Entry**

1. Click "Add Trade" button
2. Fill Step 1: Date, time, direction, market
3. Fill Step 2: Prices, position size, costs
4. Fill Step 3: Analysis link, notes, discipline rating
5. Submit

**Method 2: From Analysis**

1. Generate chart analysis
2. Click "Log This Trade"
3. Confirm and redirect
4. Fill in trade details with analysis linked

**Method 3: Excel Import**

1. Prepare Excel file in template format
2. Click Settings → Import
3. Select file
4. Review validation results
5. Confirm import

### Closing a Trade

1. Find trade in Trade Log table
2. Click "Close" button
3. Enter exit date, time, and price
4. Review auto-calculated P/L
5. Update notes and emotional state
6. Confirm

**Auto-calculations:**

- P/L = (Exit - Entry) × Position Size (for Long)
- P/L = (Entry - Exit) × Position Size (for Short)
- Account Change % = P/L / Account Balance × 100

### Viewing Statistics

Navigate to "Statistics" tab to see:

1. **Top Stats Cards**

   - Current balance
   - Total P/L
   - Win rate
   - ROI
   - Average win/loss

2. **Equity Curve**

   - Account growth over time
   - Peak balance line
   - Drawdown shading
   - Win/loss trade dots

3. **Win/Loss Chart**

   - Toggle count vs amount
   - Visual distribution

4. **P/L Distribution**

   - Histogram of outcomes
   - Shows most common ranges

5. **Market Performance**

   - Performance by symbol
   - Toggle P/L, win rate, trade count

6. **Discipline Chart**
   - Discipline rating trends
   - Correlation with P/L

### Monthly Analysis

View month-on-month comparison:

- Select year
- See grid: Months × Metrics
- Identify trends
- Click cells to drill down

### Excel Export/Import

**Export:**

1. Click top-right menu → Export
2. Download `trading-journal-YYYY-MM-DD.xlsx`
3. Open in Excel

**File Structure:**

- Sheet 1: "Trade Log" - All trades with formatting
- Sheet 2: "Trade Summary" - Stats + Month-on-Month table

**Import:**

1. Prepare Excel file matching template
2. Settings → Import
3. Upload file
4. Review validation
5. Confirm import

## Technical Details

### P/L Calculation

```typescript
// Long trades
const pl = (exitPrice - entryPrice) * positionSize - costs;

// Short trades
const pl = (entryPrice - exitPrice) * positionSize - costs;

// Account change %
const changePercent = (pl / accountBalance) * 100;
```

### Monthly Stats Calculation

```typescript
const stats = {
  totalTrades: trades.length,
  winningTrades: trades.filter((t) => t.pl > 0).length,
  losingTrades: trades.filter((t) => t.pl < 0).length,
  winRate: (winningTrades / totalTrades) * 100,
  totalPL: trades.reduce((sum, t) => sum + t.pl, 0),
  avgWin: totalWinAmount / winningTrades,
  avgLoss: Math.abs(totalLossAmount / losingTrades),
  largestWin: Math.max(...wins),
  largestLoss: Math.min(...losses),
  totalCosts: trades.reduce((sum, t) => sum + t.costs, 0),
  roi: (totalPL / startingBalance) * 100,
  avgRiskReward: avgWin / Math.abs(avgLoss),
  // ... more metrics
};
```

### Decimal Precision

All financial fields use Prisma `Decimal` type for accuracy:

- Prices: 5 decimal places
- Amounts: 2 decimal places
- Percentages: 2 decimal places

Conversion in code:

```typescript
import { Decimal } from "@prisma/client/runtime/library";

const price = new Decimal("1234.56789");
const amount = price.toNumber(); // Use for display
```

## Dependencies

- **Database**: PostgreSQL with Prisma ORM
- **Charts**: Recharts
- **Excel**: ExcelJS
- **UI**: Material-UI (MUI)
- **Data Fetching**: React Query
- **Authentication**: Firebase Auth

## Performance Optimizations

1. **Database Indexes**

   - `@@unique([userId, year, month])` on MonthlyStats
   - Index on userId for all queries

2. **Query Optimizations**

   - Pagination on trade lists
   - Filtered queries for open/closed trades
   - Cached monthly stats

3. **UI Optimizations**

   - Virtual scrolling for large trade lists
   - Lazy loading of charts
   - Debounced search inputs
   - Memoized calculations

4. **Data Flow**
   - React Query caching
   - Optimistic updates
   - Background refetching

## Security Considerations

1. **Authentication**

   - All API routes use Firebase auth middleware
   - User ID from auth token, not request body

2. **Authorization**

   - Users can only access their own trades
   - All queries filtered by userId

3. **Validation**

   - Input validation on all API routes
   - Type checking with TypeScript
   - Prisma schema constraints

4. **Data Privacy**
   - No sharing of trade data between users
   - Secure Excel export/import

## Known Limitations

1. Excel import requires exact template format
2. Charts may slow with 10,000+ trades
3. Monthly stats require manual recalculation if trades edited directly in DB
4. Discipline ratings are subjective (user input)

## Future Enhancements

1. **Advanced Analytics**

   - Time-of-day performance
   - Day-of-week patterns
   - Consecutive win/loss streaks
   - Maximum drawdown tracking

2. **Risk Management**

   - Position sizing calculator
   - Risk of ruin calculator
   - Kelly criterion suggestions

3. **Social Features**

   - Share anonymized stats
   - Community benchmarks
   - Leaderboards

4. **AI Integration**

   - Auto-tag setups from analysis
   - Predict trade outcomes
   - Suggest improvements

5. **Mobile App**
   - React Native version
   - Quick trade logging
   - Push notifications

## Support & Troubleshooting

### Common Issues

**Issue**: Onboarding shows every time

- **Solution**: Check that starting balance is being saved to settings

**Issue**: Charts not loading

- **Solution**: Verify Recharts is installed: `npm install recharts`

**Issue**: Excel import fails

- **Solution**: Ensure Excel file matches template format exactly

**Issue**: P/L calculation incorrect

- **Solution**: Verify direction (Long/Short) and costs are entered correctly

**Issue**: Open trades badge not updating

- **Solution**: Check API route `/api/journal/trades?status=open` returns correct data

### Debug Mode

Enable debug logging:

```typescript
// In journal.ts
console.log("Trade data:", trade);
console.log("Calculated P/L:", pl);
console.log("Monthly stats:", stats);
```

## Changelog

### Version 1.0.0 (November 2025)

- ✅ Complete trading journal implementation
- ✅ Database schema with 3 models
- ✅ Full CRUD API routes
- ✅ 8 UI components
- ✅ 5 analytics charts
- ✅ Excel import/export
- ✅ Onboarding flow
- ✅ Analysis linking
- ✅ Navigation integration

## License

Part of TradingView AI Evaluator application.

## Credits

Based on "Disciplined Trader" Excel template concept.
Built with Next.js 14, Material-UI, Recharts, and Prisma.
