# Snapshot Feature Configuration

## Current Status

The snapshot generation feature has been configured with **mock mode enabled** for development.

## Mock Mode (Currently Active)

When `USE_MOCK_SNAPSHOTS=true` in `.env.local`, the application generates placeholder images instead of calling the CHART-IMG API.

### Benefits:

✅ No API costs during development
✅ Instant snapshot generation
✅ Test the full workflow without external dependencies
✅ No rate limits

### Mock Snapshots:

- Generate placeholder images from placeholder.com
- Include the symbol/layoutId in the image text
- Set expiration to 30 days (same as real API)

## Using Real CHART-IMG API

To use the actual CHART-IMG API for real chart snapshots:

### Step 1: Update Environment Variable

Edit `.env.local` and change:

```env
USE_MOCK_SNAPSHOTS="true"
```

To:

```env
USE_MOCK_SNAPSHOTS="false"
```

Or remove the line entirely (defaults to false).

### Step 2: Verify API Key

Ensure your CHART-IMG API key is set:

```env
CHART_IMG_KEY="your-actual-api-key-here"
```

### Step 3: Restart Server

```powershell
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Test Real API

The real API requires:

- Valid TradingView layout ID, OR
- Symbol + interval combination
- Optional: sessionid + sessionid_sign for private charts

## API Endpoints

### Generate Snapshot

```
POST /api/snapshot
Body: { layoutId: "uuid" }
```

### View Snapshots

```
GET /api/snapshots?layoutId=uuid
```

### Get Single Snapshot

```
GET /api/snapshots/[id]
```

### Delete Snapshot

```
DELETE /api/snapshots/[id]
```

## Troubleshooting

### Issue: "Invalid response from CHART-IMG API"

**Possible causes:**

1. Invalid API key
2. Invalid layoutId or symbol/interval
3. TradingView session expired (for private charts)
4. CHART-IMG API service issue

**Solution:**

1. Enable detailed logging (already enabled)
2. Check terminal output for request/response details
3. Verify API key is valid at https://chart-img.com
4. Try with a public chart first (symbol + interval)

### Issue: "404 Not Found" when viewing snapshots

**Fixed!** The `/api/snapshots` route has been created.

### Testing Workflow

1. **Create a Layout** (Dashboard → Add Layout)
   - Add symbol (e.g., BTCUSDT)
   - Add interval (e.g., 1D)
2. **Generate Snapshot** (View Details → Generate Snapshot button)
   - With mock mode: Instant placeholder image
   - With real API: TradingView chart screenshot
3. **View Snapshots** (View Details → View Snapshots button)
   - See all generated snapshots for the layout
   - Click to view full-size image
4. **Generate Analysis** (requires snapshot)
   - Select a snapshot
   - AI analyzes the chart image
   - Provides BUY/SELL/HOLD recommendation

## Production Deployment

For production:

1. Set `USE_MOCK_SNAPSHOTS="false"` (or remove)
2. Use valid CHART_IMG_KEY
3. Consider setting up webhook for snapshot expiration notifications
4. Monitor API usage and costs

## Current Configuration

```env
# In .env.local
USE_MOCK_SNAPSHOTS="true"  # Currently using mock mode
CHART_IMG_KEY="dBeCQv..."  # API key available for when you switch to real mode
```

## Next Steps

✅ Mock snapshots working
✅ View snapshots API created
✅ Full workflow testable

To use real CHART-IMG:

1. Change `USE_MOCK_SNAPSHOTS="false"` in `.env.local`
2. Restart dev server
3. Test with a simple symbol/interval first
