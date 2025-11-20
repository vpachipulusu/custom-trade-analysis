import axios from "axios";
import { getLogger } from "../logging";

export interface AvailableModel {
  id: string;
  name: string;
  provider: "openai" | "gemini" | "claude";
  supportsVision: boolean;
}

/**
 * Fetch available Claude models
 */
async function getClaudeModels(): Promise<AvailableModel[]> {
  const logger = getLogger();

  if (!process.env.CLAUDE_KEY) {
    return [];
  }

  try {
    // Fetch models from Claude API
    const response = await axios.get(
      "https://api.anthropic.com/v1/models",
      {
        headers: {
          "x-api-key": process.env.CLAUDE_KEY,
          "anthropic-version": "2023-06-01",
        },
        timeout: 5000,
      }
    );

    if (response.data?.data) {
      const visionModels = response.data.data
        .filter((model: any) => {
          // Only include Claude 3+ models which support vision
          return model.id.includes("claude-3");
        })
        .map((model: any) => ({
          id: model.id,
          name: model.display_name || formatClaudeName(model.id),
          provider: "claude" as const,
          supportsVision: true,
        }));

      if (visionModels.length > 0) {
        logger.info(`Found ${visionModels.length} Claude models`);
        return visionModels;
      }
    }

    // Fallback to known models if API call fails or returns no models
    logger.warn("Could not fetch Claude models from API, using defaults");
    return [
      { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "claude", supportsVision: true },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "claude", supportsVision: true },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "claude", supportsVision: true },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "claude", supportsVision: true },
    ];
  } catch (error) {
    logger.error("Failed to fetch Claude models", { error: error instanceof Error ? error.message : String(error) });
    // Return default models as fallback
    return [
      { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "claude", supportsVision: true },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "claude", supportsVision: true },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "claude", supportsVision: true },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "claude", supportsVision: true },
    ];
  }
}

/**
 * Format Claude model ID into a friendly name
 */
function formatClaudeName(id: string): string {
  if (id.includes("opus")) return `Claude ${id.includes("3-5") ? "3.5" : "3"} Opus`;
  if (id.includes("sonnet")) return `Claude ${id.includes("3-5") ? "3.5" : "3"} Sonnet`;
  if (id.includes("haiku")) return `Claude ${id.includes("3-5") ? "3.5" : "3"} Haiku`;
  return id;
}

/**
 * Fetch available Gemini models
 */
async function getGeminiModels(): Promise<AvailableModel[]> {
  const logger = getLogger();

  if (!process.env.GEMINI_KEY) {
    return [];
  }

  try {
    // Try both API versions
    const apiVersions = ["v1", "v1beta"];

    for (const version of apiVersions) {
      try {
        const response = await axios.get(
          `https://generativelanguage.googleapis.com/${version}/models?key=${process.env.GEMINI_KEY}`,
          { timeout: 5000 }
        );

        if (response.data?.models) {
          const visionModels = response.data.models
            .filter((model: any) => {
              const modelName = model.name.replace("models/", "");
              return (
                model.supportedGenerationMethods?.includes("generateContent") &&
                // Only include Gemini 2.x and 3.x models which support vision
                (modelName.includes("gemini-2.") || modelName.includes("gemini-3"))
              );
            })
            .map((model: any) => ({
              id: model.name.replace("models/", ""),
              name: model.displayName || model.name.replace("models/", ""),
              provider: "gemini" as const,
              supportsVision: true,
              apiVersion: version,
            }));

          if (visionModels.length > 0) {
            logger.info(`Found ${visionModels.length} Gemini models on ${version} API`);
            return visionModels;
          }
        }
      } catch (err) {
        // Try next version
        continue;
      }
    }

    // Fallback to known models if API call fails
    logger.warn("Could not fetch Gemini models from API, using defaults");
    return [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "gemini", supportsVision: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini", supportsVision: true },
    ];
  } catch (error) {
    logger.error("Failed to fetch Gemini models", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Fetch available OpenAI models
 */
async function getOpenAIModels(): Promise<AvailableModel[]> {
  const logger = getLogger();

  if (!process.env.OPENAI_KEY) {
    return [];
  }

  try {
    const response = await axios.get(
      "https://api.openai.com/v1/models",
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        },
        timeout: 5000,
      }
    );

    if (response.data?.data) {
      const visionModels = response.data.data
        .filter((model: any) => {
          const id = model.id.toLowerCase();
          // Include GPT-4 vision models and ChatGPT-4o models
          return (
            (id.includes("gpt-4") || id.includes("chatgpt-4")) &&
            (id.includes("vision") || id.includes("4o") || id.includes("4-turbo"))
          );
        })
        .map((model: any) => ({
          id: model.id,
          name: model.id.toUpperCase().replace(/-/g, " "),
          provider: "openai" as const,
          supportsVision: true,
        }));

      if (visionModels.length > 0) {
        return visionModels;
      }
    }

    // Fallback to known models
    return [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", supportsVision: true },
    ];
  } catch (error) {
    logger.error("Failed to fetch OpenAI models", { error: error instanceof Error ? error.message : String(error) });
    // Return default models as fallback
    return [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true },
    ];
  }
}

/**
 * Get all available models from all providers
 */
export async function getAllAvailableModels(): Promise<AvailableModel[]> {
  const logger = getLogger();

  try {
    const [openaiModels, geminiModels, claudeModels] = await Promise.all([
      getOpenAIModels(),
      getGeminiModels(),
      getClaudeModels(),
    ]);

    const allModels = [...openaiModels, ...geminiModels, ...claudeModels];

    logger.info("Discovered available models", {
      openai: openaiModels.length,
      gemini: geminiModels.length,
      claude: claudeModels.length,
      total: allModels.length,
    });

    return allModels;
  } catch (error) {
    logger.error("Failed to discover models", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Cache for available models (valid for 1 hour)
 */
let modelsCache: { models: AvailableModel[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getCachedAvailableModels(): Promise<AvailableModel[]> {
  const now = Date.now();

  if (modelsCache && (now - modelsCache.timestamp) < CACHE_DURATION) {
    return modelsCache.models;
  }

  const models = await getAllAvailableModels();
  modelsCache = { models, timestamp: now };

  return models;
}
