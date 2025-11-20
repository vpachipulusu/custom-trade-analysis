# AI Model Integration - User Selection System

## Overview

The system now supports **4 AI models** with user-selectable model preference:

1. **OpenAI GPT-4o** - Advanced vision model ✅
2. **Google Gemini Pro Vision** - Multimodal AI ✅
3. **Claude 3.5 Sonnet** - Latest Anthropic model ✅
4. **DeepSeek Chat** - Text-only (no vision yet) ⚠️

## ✅ Completed Implementation

### 1. Service Modules Created

- [src/lib/services/openai.ts](src/lib/services/openai.ts) - OpenAI GPT-4o
- [src/lib/services/gemini.ts](src/lib/services/gemini.ts) - Google Gemini Pro Vision
- [src/lib/services/claude.ts](src/lib/services/claude.ts) - Claude 3.5 Sonnet
- [src/lib/services/deepseek.ts](src/lib/services/deepseek.ts) - DeepSeek (text placeholder)

### 2. Unified AI Service

[src/lib/services/aiService.ts](src/lib/services/aiService.ts):
- Model selection via parameter
- `analyzeChart(imageUrl, model?)` - Uses specified or default model
- `analyzeMultipleLayouts(layouts, model?)` - Multi-timeframe analysis
- `analyzeEconomicImpact(params, model?)` - Economic impact
- `getEnabledModels()` - Returns list of enabled models
- `getDefaultModel()` - Returns first enabled model

### 3. Environment Configuration

Added to [.env](.env:21-32):
```env
# AI Model API Keys
OPENAI_KEY="your-key"
GEMINI_KEY=""
CLAUDE_KEY=""
DEEPSEEK_KEY=""

# AI Model Configuration
ENABLE_OPENAI="true"
ENABLE_GEMINI="true"
ENABLE_CLAUDE="true"
ENABLE_DEEPSEEK="false"
```

## 🎯 New User Flow

### Current Implementation:
1. User generates analysis
2. System uses **first enabled model** as default
3. Analysis stored with single result

### Recommended Next Steps:

#### Option A: UI Dropdown (Recommended)
Add model selector dropdown to analysis page:
- Show dropdown with enabled models before "Generate Analysis" button
- User selects preferred model
- API receives model parameter
- Single analysis result displayed

#### Option B: User Preferences
Store user's default model preference in database:
- Add `preferredAiModel` field to User or UserSettings table
- User sets preference in settings page
- System uses preference as default
- Can override per-analysis if needed

## 📝 API Configuration

### Get Enabled Models

```typescript
import { getEnabledModels } from "@/lib/services/aiService";

const models = getEnabledModels();
// Returns: [
//   { id: "openai", name: "OpenAI GPT-4o", description: "...", enabled: true },
//   { id: "gemini", name: "Google Gemini Pro Vision", description: "...", enabled: true },
//   ...
// ]
```

### Use Specific Model

```typescript
import { analyzeChart } from "@/lib/services/aiService";

// Use specific model
const result = await analyzeChart(imageUrl, "gemini");

// Use default model
const result = await analyzeChart(imageUrl);
```

## 🔑 API Keys Required

### OpenAI
- Get from: https://platform.openai.com/api-keys
- Model: `gpt-4o` (vision capable)
- Format: `sk-proj-...`

### Google Gemini
- Get from: https://makersuite.google.com/app/apikey
- Model: `gemini-1.5-pro-latest` (default, latest stable)
- Alternatives: `gemini-1.5-flash-latest` (faster), `gemini-1.5-pro`, `gemini-1.5-flash`
- Format: `AIza...`
- Optional: Set `GEMINI_MODEL` and `GEMINI_API_VERSION` env vars
- **Note**: Gemini 1.5 models require `v1` API (not `v1beta`)

### Claude (Anthropic)
- Get from: https://console.anthropic.com/settings/keys
- Model: `claude-3-5-sonnet-20240620` (default)
- Format: `sk-ant-...`
- Optional: Set `CLAUDE_MODEL` env var to use a different model version

### DeepSeek
- Get from: https://platform.deepseek.com
- Model: `deepseek-chat`
- Format: `sk-...`
- **Note**: No vision support yet

## 🏗️ Database Schema

### Current Schema
Analysis table already has:
- `action`, `confidence`, `timeframe`, `reasons`, `tradeSetup` - Primary fields
- `openaiAnalysis`, `deepseekAnalysis` - Legacy dual AI fields (can be repurposed)

### Recommended Addition for Model Tracking

```prisma
model Analysis {
  // ... existing fields ...

  // Add these fields:
  aiModel          String?   // "openai" | "gemini" | "claude" | "deepseek"
  aiModelName      String?   // "OpenAI GPT-4o" | "Google Gemini Pro Vision" | etc
}

// For user preferences:
model UserSettings {
  // ... existing fields ...

  // Add this:
  preferredAiModel String? @default("openai") // User's default AI model
}
```

## 🎨 UI Components Needed

### 1. Model Selection Dropdown

```typescript
// components/AIModelSelector.tsx
import { getEnabledModels } from "@/lib/services/aiService";

export function AIModelSelector({ value, onChange }) {
  const models = getEnabledModels();

  return (
    <Select value={value} onChange={onChange}>
      {models.map(model => (
        <MenuItem key={model.id} value={model.id}>
          <Box>
            <Typography>{model.name}</Typography>
            <Typography variant="caption">{model.description}</Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}
```

### 2. Display Model Badge

Show which model was used in analysis:

```typescript
<Chip
  icon={<SmartToyIcon />}
  label={analysis.aiModelName || "OpenAI GPT-4o"}
  color="primary"
/>
```

## 📊 Current Status by Model

| Model | Vision Support | Status | Recommendation |
|-------|---------------|--------|----------------|
| OpenAI GPT-4o | ✅ Yes | Fully working | **Recommended default** |
| Google Gemini | ✅ Yes | Implemented | Requires API key & testing |
| Claude 3.5 | ✅ Yes | Implemented | Requires API key & testing |
| DeepSeek | ❌ No | Placeholder only | Keep disabled |

## 🚀 Quick Start

### 1. Add API Keys

Get API keys from providers and add to `.env`:

```env
OPENAI_KEY="sk-proj-your-key"
GEMINI_KEY="AIza-your-key"
CLAUDE_KEY="sk-ant-your-key"
```

### 2. Enable Models

```env
ENABLE_OPENAI="true"
ENABLE_GEMINI="true"
ENABLE_CLAUDE="true"
ENABLE_DEEPSEEK="false"
```

### 3. Test Each Model

```bash
# The system will use OpenAI by default
npm run dev

# To test specific models, you'll need to:
# 1. Add model selector UI component
# 2. Pass model parameter to API
# OR temporarily set only one model as enabled
```

## 🔄 Migration Path

### From Dual AI (OpenAI + DeepSeek) to Multi-Model Selection:

1. **Database** (optional):
   ```sql
   ALTER TABLE "Analysis" ADD COLUMN "aiModel" TEXT;
   ALTER TABLE "Analysis" ADD COLUMN "aiModelName" TEXT;
   ALTER TABLE "UserSettings" ADD COLUMN "preferredAiModel" TEXT DEFAULT 'openai';
   ```

2. **API Route** ([src/app/api/analyze/route.ts](src/app/api/analyze/route.ts)):
   - Accept `model` parameter from request body
   - Pass to `aiService.analyzeChart(imageUrl, model)`
   - Store model info in database

3. **UI** (Dashboard/Analysis pages):
   - Add model selector dropdown
   - Show selected model in analysis results
   - Allow users to set default in settings

## 💡 Recommendations

### For Production:

1. **Start with OpenAI** - It's the most tested and reliable
2. **Add Gemini** - Good alternative with competitive pricing
3. **Add Claude** - Excellent quality, good for comparison
4. **Skip DeepSeek** - Until vision API is released

### For Model Selection:

**Option 1: Per-Analysis Selection** (Quick to implement)
- Add dropdown above "Generate Analysis" button
- User selects model each time
- No database changes needed

**Option 2: User Preference** (Better UX)
- Add to user settings
- Remember user's choice
- Allow override per-analysis
- Requires database migration

## 📦 Dependencies

All models use existing dependencies:
- `axios` - HTTP requests
- Vision models require image conversion to base64

No additional npm packages needed!

## 🎯 Next Steps

1. ✅ Service modules created
2. ✅ Environment configuration updated
3. ⏳ Add model selector UI component
4. ⏳ Update API route to accept model parameter
5. ⏳ Update database schema (optional)
6. ⏳ Add user settings for default model (optional)
7. ⏳ Update AnalysisDisplay to show model badge
8. ⏳ Test each model with actual API keys

---

*Implementation completed through service layer. UI and database updates pending user preference.*
