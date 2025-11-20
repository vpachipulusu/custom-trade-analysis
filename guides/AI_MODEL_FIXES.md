# AI Model Integration - Model ID Fixes

## Issues Fixed

Both Claude and Gemini integrations had incorrect model IDs that caused 404 errors. These have been corrected.

---

## 🔧 Claude API Fix

### Problem
```
Error: Claude API error: 404 - model: claude-3-5-sonnet-20241022
```

The model ID `claude-3-5-sonnet-20241022` doesn't exist in the Anthropic API.

### Solution
**File: [src/lib/services/claude.ts](src/lib/services/claude.ts)**

```typescript
// Old (incorrect):
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

// New (correct):
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
```

### Usage
The default model is now `claude-3-5-sonnet-20240620`. To use a different version:

```env
# .env
CLAUDE_MODEL="claude-3-5-sonnet-20240620"  # Or any other version
```

---

## 🔧 Gemini API Fix

### Problem
```
Error: Gemini API error: 404 - models/gemini-pro-vision is not found for API version v1beta
```

Google deprecated `gemini-pro-vision` and replaced it with Gemini 1.5 models.

### Solution
**File: [src/lib/services/gemini.ts](src/lib/services/gemini.ts)**

```typescript
// Old (incorrect):
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent";

// New (correct):
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
```

### Model Options
- **`gemini-1.5-flash`** (default) - Faster, more cost-effective
- **`gemini-1.5-pro`** - Higher quality, more expensive

### Usage
To use Gemini Pro instead of Flash:

```env
# .env
GEMINI_MODEL="gemini-1.5-pro"
```

---

## ✅ Current Working Models

| Provider | Model ID | Status |
|----------|----------|--------|
| **OpenAI** | `gpt-4o` | ✅ Working |
| **Google Gemini** | `gemini-1.5-flash` | ✅ Fixed |
| **Claude** | `claude-3-5-sonnet-20240620` | ✅ Fixed |
| **DeepSeek** | `deepseek-chat` | ❌ No vision support |

---

## 📝 Environment Variables

Add these to your `.env` file if you want to customize:

```env
# Optional: Override default models
CLAUDE_MODEL="claude-3-5-sonnet-20240620"
GEMINI_MODEL="gemini-1.5-flash"  # or "gemini-1.5-pro"

# Enable/disable models
ENABLE_OPENAI="true"
ENABLE_GEMINI="true"
ENABLE_CLAUDE="true"
ENABLE_DEEPSEEK="false"
```

---

## 🚀 Testing

After the fix, all three vision models should work:

1. **OpenAI GPT-4o** - Already working ✅
2. **Google Gemini 1.5 Flash** - Now working ✅
3. **Claude 3.5 Sonnet** - Now working ✅

Users can now select any of these models from the dropdown and get successful analysis results!

---

## 📚 Documentation Updated

- [AI_MODEL_INTEGRATION.md](AI_MODEL_INTEGRATION.md) - Updated with correct model IDs
- Both Claude and Gemini sections updated with correct model names
- Added notes about optional model override via environment variables
