# Components Directory Structure

This directory contains all React components organized by functionality.

## Directory Structure

### `/common`
Reusable UI components used throughout the application
- `LoadingSpinner` - Loading indicator
- `ErrorAlert` - Error message display
- `ActionChip` - Buy/Sell/Hold action chips
- `ConfidenceProgress` - Confidence level progress bar
- `RiskLevelBadge` - Economic risk level badge
- `OutlookChip` - Market outlook chip (Bullish/Bearish/Neutral)

### `/layout`
Core layout and routing components
- `Layout` - Main app layout with navigation
- `ProtectedRoute` - Authentication wrapper for protected pages
- `ErrorBoundary` - Error boundary component

### `/analysis`
Trading analysis related components
- `AnalysisDisplay` - Main analysis results display
- `AIModelSelector` - AI model selection dropdown
- `TradeSetupCard` - Trade setup information card
- `SnapshotCard` - Chart snapshot card
- `LinkToJournalButton` - Button to link analysis to journal trade

### `/dashboard`
Dashboard page components
- `LayoutsTable` - Table of user's trading view layouts
- `RecentAnalyses` - Recent analysis results list

### `/dialogs`
Modal dialog components
- `AddLayoutDialog` - Dialog to add new layout
- `EditLayoutDialog` - Dialog to edit layout
- `DeleteConfirmationDialog` - Generic delete confirmation
- `ViewSnapshotsDialog` - View layout snapshots
- `AnalyzeWithModelDialog` - Select AI model for analysis
- `DashboardSettingsDialog` - Dashboard settings
- `JobLogsDialog` - View automation job logs

### `/economic`
Economic calendar and events
- `EconomicContextPanel` - Economic context information panel
- `EconomicEventsList` - List of economic events
- `EconomicEventCard` - Individual event card

### `/automation`
Automation and notifications
- `TelegramSetupDialog` - Setup Telegram notifications
- `AutomationSettingsDialog` - Configure automation schedules

### `/subscription`
Subscription and billing
- `SubscriptionStatus` - Current subscription status
- `UpgradePrompt` - Upgrade to premium prompt

### `/journal`
Trading journal components (trades, statistics, charts)
- Dialogs: `AddTradeDialog`, `CloseTradeDialog`, `TradeDetailsDialog`, `JournalSettingsDialog`, `OnboardingDialog`
- Tables: `TradeLogTable`, `MonthlyAnalysisTable`
- Statistics: `JournalStats`, `StatisticsTab`
- Charts: `EquityCurveChart`, `WinLossChart`, `PLDistributionChart`, `DisciplineChart`, etc.

### `/profile`
User profile and settings
- `ProfileLayout` - Profile page layout
- `ProfileSettings` - Profile information editor
- `AvatarUpload` - Avatar upload component
- `ChangePassword` - Password change form
- `SecuritySettings` - Security preferences
- `NotificationSettings` - Notification preferences
- `NotificationsPanel` - Notifications list
- `LoginHistoryTable` - Login history table
- `TradingViewSessionSettings` - TradingView session configuration

## Usage

Import components from their respective subdirectories:

```typescript
// Import from subdirectory
import { LoadingSpinner, ErrorAlert } from '@/components/common';
import { LayoutsTable } from '@/components/dashboard';
import { AddLayoutDialog } from '@/components/dialogs';

// Or import from main index (re-exports all)
import { LoadingSpinner, LayoutsTable, AddLayoutDialog } from '@/components';
```

## Adding New Components

1. Identify the appropriate subdirectory for your component
2. Create the component file in that subdirectory
3. Add an export to the subdirectory's `index.ts`
4. The component will automatically be available via the main `@/components` import
