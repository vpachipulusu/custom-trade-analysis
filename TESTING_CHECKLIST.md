# Trading Journal - Integration Testing Checklist

## ✅ Database & API Tests

### Settings API

- [ ] GET `/api/journal/settings` - Returns default settings for new user
- [ ] GET `/api/journal/settings` - Returns existing settings
- [ ] PATCH `/api/journal/settings` - Updates starting balance
- [ ] PATCH `/api/journal/settings` - Updates current balance
- [ ] PATCH `/api/journal/settings` - Updates currency and preferences

### Trades API

- [ ] POST `/api/journal/trades` - Creates new long trade
- [ ] POST `/api/journal/trades` - Creates new short trade
- [ ] POST `/api/journal/trades` - Validates required fields
- [ ] GET `/api/journal/trades` - Returns all trades with pagination
- [ ] GET `/api/journal/trades?status=open` - Filters open trades
- [ ] GET `/api/journal/trades?status=closed` - Filters closed trades
- [ ] GET `/api/journal/trades?market=EURUSD` - Filters by market
- [ ] GET `/api/journal/trades/[id]` - Returns single trade
- [ ] PATCH `/api/journal/trades/[id]` - Updates trade details
- [ ] DELETE `/api/journal/trades/[id]` - Deletes trade
- [ ] POST `/api/journal/trades/[id]/close` - Closes trade with P/L calculation
- [ ] POST `/api/journal/trades/[id]/close` - Recalculates monthly stats after close

### Statistics API

- [ ] GET `/api/journal/stats?year=2025&month=11` - Returns monthly stats
- [ ] GET `/api/journal/stats?allTime=true` - Returns all-time stats
- [ ] Verify win rate calculation accuracy
- [ ] Verify ROI calculation accuracy
- [ ] Verify risk/reward ratio calculations

### Excel Export/Import

- [ ] GET `/api/journal/export` - Downloads Excel file
- [ ] Excel file has "Trade Log" sheet
- [ ] Excel file has "Trade Summary" sheet
- [ ] Trade Log matches template format
- [ ] POST `/api/journal/import` - Imports Excel file
- [ ] Import validates data correctly
- [ ] Import creates trades successfully
- [ ] Import updates settings if present

## ✅ UI Component Tests

### Journal Page

- [ ] Page loads successfully
- [ ] Shows onboarding dialog for first-time users
- [ ] Onboarding allows setting starting balance
- [ ] Onboarding can be skipped
- [ ] Three tabs render: Trade Log | Statistics | Month Analysis
- [ ] Add Trade button opens dialog
- [ ] Settings button opens settings dialog

### Navigation

- [ ] Journal link appears in main navigation
- [ ] Journal link shows badge with open trades count
- [ ] Badge updates when trades are opened/closed
- [ ] Mobile drawer includes Journal link
- [ ] Desktop nav includes Journal link with icon

### Trade Log Table

- [ ] Displays all trades in DataGrid
- [ ] Sorting works on all columns
- [ ] Filtering works correctly
- [ ] Pagination works
- [ ] Color coding: Green P/L for wins, Red for losses
- [ ] Click row opens trade details dialog
- [ ] Edit button works
- [ ] Delete button works with confirmation
- [ ] Close button only shows for open trades

### Add Trade Dialog

- [ ] Opens with 3-step wizard
- [ ] Step 1: Basic Info validates required fields
- [ ] Step 2: Entry Details calculates position size
- [ ] Step 3: Trade Management shows all options
- [ ] Can attach screenshot URL
- [ ] Can select discipline rating (1-10)
- [ ] Can select emotional state
- [ ] Can add strategy/setup tags
- [ ] Submit creates trade successfully
- [ ] Dialog closes after successful creation

### Close Trade Dialog

- [ ] Shows read-only entry details
- [ ] Allows entering exit price
- [ ] Calculates P/L automatically for long trades
- [ ] Calculates P/L automatically for short trades
- [ ] Shows account change percentage
- [ ] Updates current balance after close
- [ ] Recalculates monthly stats
- [ ] Shows success message

### Trade Details Dialog

- [ ] Displays all trade fields
- [ ] Shows screenshot if available
- [ ] Shows linked analysis with link
- [ ] Edit button opens edit mode
- [ ] Close button opens close dialog (for open trades)
- [ ] Delete button shows confirmation

### Statistics Tab

- [ ] Loads trade data successfully
- [ ] Displays top stats cards
- [ ] Shows Equity Curve chart
- [ ] Shows Win/Loss chart
- [ ] Shows P/L Distribution chart
- [ ] Shows Market Performance chart
- [ ] Shows Discipline chart
- [ ] Charts handle empty data gracefully

### Charts

- [ ] **Equity Curve**: Line chart with win/loss dots, drawdown shading
- [ ] **Win/Loss**: Toggle between count and amount views
- [ ] **P/L Distribution**: Histogram with proper buckets
- [ ] **Market Performance**: Toggle between P/L, win rate, count
- [ ] **Discipline**: Overlays discipline rating with P/L bars
- [ ] All charts show tooltips on hover
- [ ] All charts are responsive
- [ ] All charts handle zero trades

### Monthly Analysis Table

- [ ] Displays year selector
- [ ] Shows months as columns
- [ ] Shows metrics as rows
- [ ] Color codes positive/negative values
- [ ] Allows clicking to drill down

### Settings Dialog

- [ ] Loads current settings
- [ ] Allows updating starting balance
- [ ] Shows calculated current balance (read-only)
- [ ] Allows changing currency
- [ ] Allows setting default position size
- [ ] Allows setting default risk percentage
- [ ] Saves successfully

### Excel Export

- [ ] Export button triggers download
- [ ] File name includes date
- [ ] Opens in Excel without errors
- [ ] Trade Log sheet has all trades
- [ ] Trade Summary has stats
- [ ] Month On Month table present
- [ ] Formatting matches template

### Excel Import

- [ ] File upload accepts .xlsx files
- [ ] Shows validation errors if any
- [ ] Shows success message with count
- [ ] Imports all valid trades
- [ ] Updates settings if present
- [ ] Refreshes UI after import

## ✅ Integration Tests

### Analysis → Journal Linking

- [ ] "Log This Trade" button appears on analysis page
- [ ] Button opens confirmation dialog
- [ ] Clicking confirm navigates to journal with query param
- [ ] Journal opens add trade dialog automatically
- [ ] Analysis ID is passed correctly
- [ ] Can link multiple analyses to same trade

### Onboarding Flow

- [ ] Shows automatically for new users
- [ ] Step 1 explains features
- [ ] Step 2 collects starting balance
- [ ] Step 3 shows next steps
- [ ] Can skip onboarding
- [ ] Doesn't show again after completion

### Navigation Badge

- [ ] Badge shows count of open trades
- [ ] Badge updates after opening trade
- [ ] Badge updates after closing trade
- [ ] Badge hidden when count is 0

### Data Consistency

- [ ] Closing trade updates account balance
- [ ] Deleting trade recalculates balance
- [ ] Monthly stats update automatically
- [ ] All-time stats reflect all trades
- [ ] Charts update when trades change

## ✅ Performance Tests

### Database Queries

- [ ] Trade list loads quickly (<1s for 1000 trades)
- [ ] Statistics calculation is efficient
- [ ] Monthly stats query is optimized
- [ ] Excel export handles large datasets

### UI Rendering

- [ ] Charts render smoothly
- [ ] DataGrid handles 100+ rows
- [ ] No lag when switching tabs
- [ ] Dialogs open/close smoothly

## ✅ Edge Cases

### Validation

- [ ] Cannot create trade with negative position size
- [ ] Cannot close trade without exit price
- [ ] Cannot set stop loss equal to entry price
- [ ] Cannot set invalid discipline rating
- [ ] Handles decimal precision correctly

### Error Handling

- [ ] Shows error if API fails
- [ ] Shows error if Excel import fails
- [ ] Gracefully handles network errors
- [ ] Shows loading states appropriately

### Browser Compatibility

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Mobile responsive

## ✅ User Experience

### First-Time User Journey

1. [ ] Navigate to /journal
2. [ ] See onboarding dialog
3. [ ] Complete setup with starting balance
4. [ ] See empty journal with helpful message
5. [ ] Click "Add Trade"
6. [ ] Fill in first trade
7. [ ] See trade in table
8. [ ] View statistics tab
9. [ ] Close trade
10. [ ] See updated P/L and stats

### Analysis Linking Journey

1. [ ] Generate chart analysis
2. [ ] Click "Log This Trade" button
3. [ ] Confirm dialog
4. [ ] Redirect to journal
5. [ ] Add trade dialog opens
6. [ ] Fill in trade details
7. [ ] Trade created with analysis link
8. [ ] Can view linked analysis from trade details

### Excel Workflow

1. [ ] Add several trades
2. [ ] Export to Excel
3. [ ] Open file in Excel
4. [ ] Verify all data present
5. [ ] Modify some trades in Excel
6. [ ] Import back
7. [ ] Verify changes applied

## 📝 Notes

- All database operations use Prisma Decimal for financial precision
- Statistics are recalculated automatically on trade close/delete
- Monthly stats are cached for performance
- Excel format matches user's original template exactly
- Charts use Recharts library with Material-UI theming
- All forms use Material-UI validation
- Protected routes ensure authentication
- Open trades badge updates via API polling

## 🎯 Priority Issues to Test

1. **P/L Calculation Accuracy** - Most critical for financial data
2. **Balance Updates** - Ensure account balance always accurate
3. **Statistics Calculations** - Verify all formulas correct
4. **Excel Import/Export** - Must match template exactly
5. **Analysis Linking** - Seamless integration with existing feature
6. **Onboarding Flow** - Good first impression for new users
7. **Chart Accuracy** - Visual data must be correct
8. **Mobile Responsiveness** - Usable on all devices
