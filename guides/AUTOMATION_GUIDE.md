# Automated Trading Analysis & Telegram Alerts

## Overview

This feature enables automated chart analysis with Telegram notifications. The system runs in the background on your local machine, automatically capturing TradingView charts, analyzing them with AI, and sending trading signals to your Telegram.

## Features

- 🤖 **Automated Chart Capture**: Uses Puppeteer to capture charts from your active TradingView session
- 🧠 **AI Analysis**: Analyzes charts with GPT-4 Vision for trade setups
- 📱 **Telegram Alerts**: Sends formatted trading signals directly to your Telegram
- ⏰ **Flexible Scheduling**: 15m, 1h, 4h, daily, or weekly analysis
- 🎯 **Smart Filtering**: Only notify on signal changes, minimum confidence, etc.
- 📊 **Trade Setup Details**: Entry, stop loss, target, and R:R ratio
- 🌍 **Economic Context**: Includes relevant economic events

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to name your bot (e.g., "My Trading Assistant")
4. Save the bot token (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)

### 2. Get Your Chat ID

1. Start your bot in Telegram (click the link from BotFather or search for your bot)
2. Send `/start` to your bot
3. Open this URL in your browser (replace with your bot token):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. Look for `"chat":{"id":123456789}` - that number is your Chat ID

### 3. Configure Environment Variables

Add to your `.env.local` file:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="YourBotUsername"

# Automation
ENABLE_AUTOMATION="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run Database Migration

The automation tables should already exist in your schema. Verify with:

```bash
npx prisma migrate status
```

If needed, generate the Prisma client:

```bash
npx prisma generate
```

### 5. Start the Application

```bash
npm run dev
```

The automation scheduler will initialize automatically when `ENABLE_AUTOMATION=true`.

## Usage

### Configure Telegram

1. Go to your profile/settings in the app
2. Click "Telegram Settings" or "Connect Telegram"
3. Enter your Chat ID
4. Test the connection (you'll receive a test message)
5. Configure alert preferences:
   - Include chart images
   - Include economic context
   - Send HOLD signals

### Set Up Automation for a Layout

1. Go to your Layouts page
2. Find the layout you want to automate
3. Click the automation icon ⚙️
4. Configure settings:
   - **Enable Automation**: Turn on/off
   - **Frequency**: How often to analyze (15m, 1h, 4h, daily, weekly)
   - **Send to Telegram**: Enable alerts
   - **Only on Signal Change**: Only alert when BUY→SELL, etc.
   - **Minimum Confidence**: Filter low-confidence signals (0-100%)
   - **Send HOLD signals**: Whether to notify on HOLD actions

### How It Works

```
1. Cron scheduler runs every 5 minutes
   ↓
2. Checks database for due automation jobs
   ↓
3. For each job:
   a. Decrypts TradingView sessionid
   b. Captures chart screenshot with Puppeteer
   c. Analyzes with GPT-4 Vision
   d. Creates snapshot + analysis records
   e. Checks alert filters (confidence, signal change, etc.)
   f. Sends Telegram alert if conditions met
   ↓
4. Updates lastRunAt and nextRunAt timestamps
```

## Telegram Message Format

```
🤖 Trade Analysis Alert

📊 EURUSD 1H
⏰ Dec 25, 2024 10:30 AM

Action: 📈 BUY
Confidence: 85% 🟢🟢🟢

💼 Trade Setup (A)
Entry: `1.15920`
Stop Loss: `1.15720`
Target: `1.16320`
R:R Ratio: `1:2.0`

Key Reasons:
1. Strong bullish momentum on 1H
2. Price above 20 EMA with bullish crossover
3. RSI showing strength at 62

📝 Summary: Strong uptrend continuation pattern...

⚠️ Economic Risk: MEDIUM
📊 Weekly Outlook: BULLISH

🔗 [View Full Analysis](http://localhost:3000/analysis/abc123)
```

## Alert Filters

### Only on Signal Change

When enabled, only sends alerts when the action changes:

- Previous: BUY → New: SELL ✅ Alert sent
- Previous: BUY → New: BUY ❌ No alert
- Previous: HOLD → New: BUY ✅ Alert sent

### Minimum Confidence

Only alerts if `confidence >= minConfidence`:

- Confidence: 75%, Min: 50% ✅ Alert sent
- Confidence: 45%, Min: 50% ❌ No alert

### Send HOLD Signals

- Enabled: Sends alerts for all actions (BUY/SELL/HOLD)
- Disabled: Only sends BUY/SELL alerts

## Background Job Scheduler

The system uses `node-cron` to run jobs:

```typescript
// Runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  await runScheduledJobs();
});
```

Each automation schedule stores its own frequency and nextRunAt:

- **15m**: Runs every 15 minutes
- **1h**: Runs every hour
- **4h**: Runs every 4 hours
- **1d**: Runs once per day
- **1w**: Runs once per week

## Manual Testing

You can manually trigger automation jobs via API:

```bash
# Trigger all due jobs now
curl -X POST http://localhost:3000/api/automation/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or use the UI button (if implemented).

## Troubleshooting

### Bot Not Sending Messages

1. **Check bot token**: Verify `TELEGRAM_BOT_TOKEN` in `.env.local`
2. **Test connection**: Use the "Test Connection" button in Telegram settings
3. **Check chat ID**: Make sure you entered the correct Chat ID
4. **Bot blocked**: Make sure you haven't blocked the bot in Telegram

### Screenshots Failing

1. **TradingView session**: Make sure you have an active TradingView session
2. **Sessionid encryption**: Verify your `ENCRYPTION_KEY` hasn't changed
3. **Puppeteer**: Check Chrome/Chromium is installed
4. **Logs**: Check console for Puppeteer errors

### Jobs Not Running

1. **Automation enabled**: Check `ENABLE_AUTOMATION=true` in `.env.local`
2. **Scheduler status**: Look for "Automation scheduler initialized" in logs
3. **Schedule enabled**: Make sure the automation is enabled in UI
4. **nextRunAt**: Check if nextRunAt timestamp is in the past

### Database Errors

1. **Migration**: Run `npx prisma migrate dev`
2. **Generate client**: Run `npx prisma generate`
3. **Check schema**: Verify AutomationSchedule, TelegramConfig tables exist

## Performance Considerations

### Resource Usage

Each automation job:

- Launches headless Chrome (Puppeteer)
- Captures screenshot (~500KB-2MB)
- Sends to OpenAI API (~4-6MB with image)
- Stores in database

**Recommendations**:

- Limit to 5-10 layouts max
- Use 1h+ frequency for most layouts
- Use 15m only for critical setups

### Rate Limits

- **OpenAI**: Respect API rate limits (tier-based)
- **Telegram**: 30 messages/second per bot
- **Database**: No practical limit with PostgreSQL

### Cost Estimation

Per automation job:

- **OpenAI API**: ~$0.02-0.05 (GPT-4 Vision)
- **Storage**: ~2MB per snapshot
- **Telegram**: Free

Example monthly costs (10 layouts, 1h frequency):

- Jobs/month: 10 layouts × 24 hours × 30 days = 7,200 jobs
- OpenAI: 7,200 × $0.03 = **$216/month**
- Storage: 7,200 × 2MB = **14.4GB/month**

**Cost Optimization**:

- Use 4h frequency: $216 → $54/month
- Use "only on signal change": Save 50-70%
- Increase min confidence: Filter unnecessary analyses

## Security

- ✅ Sessionid encrypted with AES-256-CBC
- ✅ User authentication required for all API routes
- ✅ Telegram bot token server-side only
- ✅ Chat ID verification before sending alerts

## Future Enhancements

- [ ] Multi-timeframe analysis (analyze 15m, 1h, 4h together)
- [ ] Custom alert templates
- [ ] Alert statistics dashboard
- [ ] Telegram inline buttons for quick actions
- [ ] WhatsApp/Discord/Email support
- [ ] Backtesting alert accuracy
- [ ] Portfolio position sizing suggestions
- [ ] Risk management integration

## API Reference

### GET /api/automation

Get all automation schedules for authenticated user

### POST /api/automation

Create or update automation schedule

```json
{
  "layoutId": "uuid",
  "enabled": true,
  "frequency": "1h",
  "sendToTelegram": true,
  "onlyOnSignalChange": false,
  "minConfidence": 50,
  "sendOnHold": false
}
```

### DELETE /api/automation/[id]

Delete automation schedule

### GET /api/telegram

Get Telegram configuration

### POST /api/telegram

Save Telegram configuration

```json
{
  "chatId": "123456789",
  "username": "@username",
  "isActive": true,
  "includeChart": true,
  "includeEconomic": true,
  "notifyOnHold": false
}
```

### POST /api/telegram/test

Test Telegram connection

```json
{
  "chatId": "123456789"
}
```

### POST /api/automation/trigger

Manually trigger all due automation jobs (for testing)

## Support

For issues or questions:

1. Check logs: `npm run dev` console output
2. Verify environment variables
3. Test each component individually (Telegram, Puppeteer, OpenAI)
4. Check database records (AutomationSchedule, TelegramConfig)

---

**Note**: This feature is designed for local deployment. For cloud deployment (Vercel, Firebase Functions), you'll need to:

1. Use serverless cron (Vercel Cron, Cloud Scheduler)
2. Replace Puppeteer with chart-img.com API
3. Handle cold starts and timeouts
