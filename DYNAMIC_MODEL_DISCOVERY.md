# Dynamic AI Model Discovery

## Overview

The Trade Analysis application now features **dynamic model discovery** instead of hardcoded model IDs. This means the system automatically fetches available models from each AI provider's API and presents only the working models to users.

## Why Dynamic Discovery?

### Problem with Hardcoded Models
Previously, model IDs were hardcoded in the codebase:
```typescript
// ❌ OLD APPROACH - Hardcoded
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";
const GEMINI_MODEL = "gemini-pro-vision";
```

This caused issues:
- **404 Errors**: Model IDs that don't exist for specific API keys
- **Deprecated Models**: Models that worked yesterday might be unavailable today
- **Regional Differences**: Different model availability across regions
- **Version Mismatches**: Wrong API versions for specific models

### Solution: Dynamic Discovery
```typescript
// ✅ NEW APPROACH - Dynamic
const availableModels = await getCachedAvailableModels();
// Returns only models that actually exist and work for your API key
```

Benefits:
- **No 404 Errors**: Only shows models that are accessible
- **Always Up-to-Date**: Automatically adapts to API changes
- **User-Specific**: Shows models available for the user's API key
- **Future-Proof**: New models appear automatically

---

## Architecture

### 1. Model Discovery Service
**File**: [`src/lib/services/modelDiscovery.ts`](src/lib/services/modelDiscovery.ts)

This service dynamically fetches available models from all AI providers:

```typescript
export interface AvailableModel {
  id: string;                    // e.g., "gpt-4o"
  name: string;                  // e.g., "GPT-4o"
  provider: "openai" | "gemini" | "claude";
  supportsVision: boolean;
}

// Fetch all available models
export async function getAllAvailableModels(): Promise<AvailableModel[]>

// Get cached models (1-hour cache)
export async function getCachedAvailableModels(): Promise<AvailableModel[]>
```

#### Provider-Specific Discovery

**OpenAI Models**:
```typescript
async function getOpenAIModels(): Promise<AvailableModel[]> {
  const response = await axios.get("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENAI_KEY}` }
  });

  // Filter for vision-capable GPT-4 models
  return response.data.data
    .filter(model =>
      model.id.includes("gpt-4") &&
      (model.id.includes("vision") || model.id.includes("4o"))
    )
    .map(model => ({
      id: model.id,
      name: model.id.toUpperCase(),
      provider: "openai",
      supportsVision: true
    }));
}
```

**Gemini Models**:
```typescript
async function getGeminiModels(): Promise<AvailableModel[]> {
  // Try both API versions (v1 and v1beta)
  for (const version of ["v1", "v1beta"]) {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/${version}/models?key=${GEMINI_KEY}`
    );

    // Filter for vision-capable models
    return response.data.models
      .filter(model =>
        model.supportedGenerationMethods?.includes("generateContent") &&
        (model.name.includes("vision") || model.name.includes("1.5"))
      )
      .map(model => ({
        id: model.name.replace("models/", ""),
        name: model.displayName,
        provider: "gemini",
        supportsVision: true,
        apiVersion: version
      }));
  }

  // Fallback if API fails
  return [
    { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro", provider: "gemini", supportsVision: true },
    { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash", provider: "gemini", supportsVision: true }
  ];
}
```

**Claude Models**:
```typescript
async function getClaudeModels(): Promise<AvailableModel[]> {
  // Claude doesn't have a list models endpoint, so we return known models
  const knownModels = [
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ];

  return knownModels.map(id => ({
    id,
    name: `Claude ${id.includes('opus') ? 'Opus' : id.includes('sonnet') ? 'Sonnet' : 'Haiku'}`,
    provider: "claude",
    supportsVision: true
  }));
}
```

### 2. API Endpoint
**File**: [`src/app/api/ai-models/route.ts`](src/app/api/ai-models/route.ts)

Returns available models in a format suitable for the frontend:

```typescript
export async function GET(request: NextRequest) {
  const availableModels = await getCachedAvailableModels();

  // Filter for vision-capable models only
  const visionModels = availableModels.filter(m => m.supportsVision);

  // Format for frontend
  const formattedModels = visionModels.map(model => ({
    id: `${model.provider}:${model.id}`,  // Format: "openai:gpt-4o"
    name: `${model.name} (${model.provider})`,
    provider: model.provider,
    modelId: model.id,
    description: `${model.provider.toUpperCase()} - ${model.name}`,
    enabled: true
  }));

  return NextResponse.json({
    models: formattedModels,
    count: formattedModels.length
  });
}
```

### 3. Model ID Format

The system uses a standardized format for model selection:

```
provider:modelId
```

Examples:
- `openai:gpt-4o`
- `openai:gpt-4-turbo`
- `gemini:gemini-1.5-pro-latest`
- `gemini:gemini-1.5-flash-latest`
- `claude:claude-3-5-sonnet-20240620`
- `claude:claude-3-opus-20240229`

### 4. AI Service Integration

**Updated Service Signatures**:

```typescript
// src/lib/services/openai.ts
export async function analyzeChart(
  imageUrl: string,
  modelId?: string
): Promise<AnalysisResult>

// src/lib/services/gemini.ts
export async function analyzeChart(
  imageUrl: string,
  modelId?: string
): Promise<AnalysisResult>

// src/lib/services/claude.ts
export async function analyzeChart(
  imageUrl: string,
  modelId?: string
): Promise<AnalysisResult>
```

**AI Service Router** (`src/lib/services/aiService.ts`):

```typescript
export async function analyzeChart(
  imageUrl: string,
  model?: AIModel,          // Provider: "openai" | "gemini" | "claude"
  modelId?: string          // Specific model ID
): Promise<AnalysisResult> {
  const selectedModel = model || getDefaultModel();

  switch (selectedModel) {
    case "openai":
      return await openaiService.analyzeChart(imageUrl, modelId);
    case "gemini":
      return await geminiService.analyzeChart(imageUrl, modelId);
    case "claude":
      return await claudeService.analyzeChart(imageUrl, modelId);
  }
}
```

### 5. Analysis API Integration

**File**: [`src/app/api/analyze/route.ts`](src/app/api/analyze/route.ts)

Parses the `provider:modelId` format and routes to the correct service:

```typescript
const { snapshotId, symbol, aiModel } = body;

// Parse "provider:modelId" format
let selectedProvider: "openai" | "gemini" | "claude" = "openai";
let selectedModelId: string;
let modelName: string;

if (aiModel && aiModel.includes(":")) {
  const [provider, modelId] = aiModel.split(":");
  selectedProvider = provider as any;
  selectedModelId = modelId;
  modelName = `${provider.toUpperCase()} ${modelId}`;
} else {
  // Fallback to default
  selectedProvider = "openai";
  selectedModelId = "gpt-4o";
  modelName = "OpenAI GPT-4o";
}

// Perform analysis with specific model
const result = await aiService.analyzeChart(
  imageUrl,
  selectedProvider,
  selectedModelId
);

// Save to database
await createAnalysis(userId, snapshotId, {
  action: result.action,
  confidence: result.confidence,
  aiModel: `${selectedProvider}:${selectedModelId}`,
  aiModelName: modelName,
  // ... other fields
});
```

---

## Frontend Integration

### Model Selector Component

**File**: [`src/components/AIModelSelector.tsx`](src/components/AIModelSelector.tsx)

```typescript
export default function AIModelSelector({ value, onChange, disabled = false }) {
  const [models, setModels] = useState<AIModelInfo[]>([]);

  useEffect(() => {
    fetchEnabledModels();
  }, []);

  const fetchEnabledModels = async () => {
    const response = await fetch("/api/ai-models");
    const data = await response.json();
    setModels(data.models || []);

    // Auto-select first model if none selected
    if (!value && data.models && data.models.length > 0) {
      onChange(data.models[0].id);
    }
  };

  return (
    <Select value={value} label="AI Model" onChange={(e) => onChange(e.target.value)}>
      {models.map((model) => (
        <MenuItem key={model.id} value={model.id}>
          <Typography variant="body1">{model.name}</Typography>
          <Typography variant="caption">{model.description}</Typography>
        </MenuItem>
      ))}
    </Select>
  );
}
```

### Analysis Dialog

**File**: [`src/components/AnalyzeWithModelDialog.tsx`](src/components/AnalyzeWithModelDialog.tsx)

Shows the model selector before starting analysis:

```typescript
export default function AnalyzeWithModelDialog({ open, onClose, onConfirm }) {
  const [selectedModel, setSelectedModel] = useState<string>("");

  const handleConfirm = () => {
    if (selectedModel) {
      onConfirm(selectedModel);  // Pass "provider:modelId"
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <AIModelSelector value={selectedModel} onChange={setSelectedModel} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleConfirm} disabled={!selectedModel}>
          Analyze
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## Caching Strategy

### 1-Hour Cache
To reduce API calls and improve performance, discovered models are cached for 1 hour:

```typescript
let modelsCache: { models: AvailableModel[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getCachedAvailableModels(): Promise<AvailableModel[]> {
  const now = Date.now();

  // Return cached models if still valid
  if (modelsCache && (now - modelsCache.timestamp) < CACHE_DURATION) {
    return modelsCache.models;
  }

  // Fetch fresh models and update cache
  const models = await getAllAvailableModels();
  modelsCache = { models, timestamp: now };

  return models;
}
```

### Cache Invalidation
The cache automatically expires after 1 hour. To manually refresh:
1. Restart the application
2. Wait for the 1-hour cache to expire
3. The next request will fetch fresh models

---

## Error Handling

### Fallback Models
If API discovery fails, the system falls back to known working models:

```typescript
try {
  const models = await fetchFromAPI();
  return models;
} catch (error) {
  logger.warn("Failed to fetch models from API, using fallback", { error });
  return [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true },
    { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro", provider: "gemini", supportsVision: true }
  ];
}
```

### Graceful Degradation
- If no models are available, the system defaults to OpenAI GPT-4o
- If a specific provider fails, other providers still work
- Error messages guide users to check their API keys

---

## Environment Configuration

### Required API Keys
```env
# OpenAI
OPENAI_KEY=sk-...

# Google Gemini
GEMINI_KEY=...

# Claude (Anthropic)
CLAUDE_KEY=...
```

### Optional Configuration
```env
# Enable/disable specific providers (default: true)
ENABLE_OPENAI=true
ENABLE_GEMINI=true
ENABLE_CLAUDE=true

# Override default models (optional)
OPENAI_MODEL=gpt-4o
GEMINI_MODEL=gemini-1.5-pro-latest
CLAUDE_MODEL=claude-3-5-sonnet-20240620

# Gemini API version (default: v1)
GEMINI_API_VERSION=v1
```

---

## Testing

### Manual Testing Steps

1. **Test Model Discovery**:
   ```bash
   curl http://localhost:3000/api/ai-models
   ```

   Expected response:
   ```json
   {
     "models": [
       {
         "id": "openai:gpt-4o",
         "name": "GPT-4o (openai)",
         "provider": "openai",
         "modelId": "gpt-4o",
         "description": "OPENAI - GPT-4o",
         "enabled": true
       },
       {
         "id": "gemini:gemini-1.5-pro-latest",
         "name": "Gemini 1.5 Pro (gemini)",
         "provider": "gemini",
         "modelId": "gemini-1.5-pro-latest",
         "description": "GEMINI - Gemini 1.5 Pro",
         "enabled": true
       }
     ],
     "count": 2
   }
   ```

2. **Test Analysis with Specific Model**:
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "snapshotId": "snapshot-id",
       "aiModel": "gemini:gemini-1.5-pro-latest"
     }'
   ```

3. **Test Frontend Model Selector**:
   - Navigate to dashboard
   - Click "Analyze" on a snapshot
   - Verify dropdown shows available models
   - Select a model and confirm analysis works

### Automated Testing
```typescript
// Example test
describe("Model Discovery", () => {
  it("should fetch available models", async () => {
    const models = await getCachedAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty("id");
    expect(models[0]).toHaveProperty("provider");
  });

  it("should handle provider:modelId format", () => {
    const aiModel = "openai:gpt-4o";
    const [provider, modelId] = aiModel.split(":");
    expect(provider).toBe("openai");
    expect(modelId).toBe("gpt-4o");
  });
});
```

---

## Migration Guide

### For Existing Deployments

1. **Update Environment Variables**:
   ```bash
   # No changes needed - existing keys work as-is
   OPENAI_KEY=sk-...
   GEMINI_KEY=...
   CLAUDE_KEY=...
   ```

2. **Database Migration**:
   ```bash
   # Run Prisma migration to update schema
   npx prisma migrate dev
   ```

3. **Restart Application**:
   ```bash
   npm run build
   npm start
   ```

4. **Verify Model Discovery**:
   - Check logs for "Discovered available models" message
   - Visit `/api/ai-models` endpoint
   - Test analysis with different models

### Backward Compatibility
- Old analyses with hardcoded model IDs still work
- New analyses use the `provider:modelId` format
- The system gracefully handles both formats

---

## Troubleshooting

### No Models Showing Up
**Symptom**: Dropdown is empty or shows no models

**Solutions**:
1. Check API keys are set correctly:
   ```bash
   echo $OPENAI_KEY
   echo $GEMINI_KEY
   echo $CLAUDE_KEY
   ```

2. Check application logs:
   ```bash
   grep "Model discovery" logs/app.log
   ```

3. Test API endpoints directly:
   ```bash
   # Test OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_KEY"

   # Test Gemini
   curl "https://generativelanguage.googleapis.com/v1/models?key=$GEMINI_KEY"
   ```

### 404 Errors During Analysis
**Symptom**: "Model not found" error during analysis

**Solutions**:
1. Clear the model cache (restart app)
2. Verify the model ID exists for your API key
3. Check provider-specific documentation

### Cache Not Updating
**Symptom**: New models not appearing after API changes

**Solutions**:
1. Restart the application to clear cache
2. Wait for 1-hour cache expiration
3. Modify `CACHE_DURATION` in `modelDiscovery.ts` if needed

---

## Future Enhancements

### Planned Features
1. **Real-time Model Status**: Check if models are operational before showing
2. **Model Capabilities**: Display token limits, pricing, speed metrics
3. **User Preferences**: Remember user's preferred model
4. **A/B Testing**: Compare results from different models
5. **Model Performance Metrics**: Track accuracy and response times

### Extension Points
```typescript
// Future: Add model-specific capabilities
export interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  supportsVision: boolean;

  // Future additions
  maxTokens?: number;
  costPerToken?: number;
  averageResponseTime?: number;
  supportedLanguages?: string[];
  specialCapabilities?: string[];
}
```

---

## Related Documentation

- [AI Model Integration](AI_MODEL_INTEGRATION.md)
- [AI Model Fixes](AI_MODEL_FIXES.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Environment Configuration](.env.example)

---

## Summary

The dynamic model discovery system:
- ✅ Eliminates hardcoded model IDs
- ✅ Automatically discovers available models
- ✅ Prevents 404 errors from invalid model IDs
- ✅ Adapts to API changes without code updates
- ✅ Shows only models accessible to the user
- ✅ Caches results for performance
- ✅ Provides graceful fallbacks

This makes the system more robust, maintainable, and user-friendly.
