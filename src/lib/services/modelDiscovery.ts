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
    // Claude doesn't have a list models endpoint, so we'll try common models
    // and return the ones that work
    const modelsToTry = [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];

    // For now, return all known models - we'll validate on actual use
    return modelsToTry.map(id => ({
      id,
      name: `Claude ${id.includes('opus') ? 'Opus' : id.includes('sonnet') ? 'Sonnet' : 'Haiku'} ${id.includes('3-5') ? '3.5' : '3'}`,
      provider: "claude" as const,
      supportsVision: true,
    }));
  } catch (error) {
    logger.error("Failed to fetch Claude models", { error });
    return [];
  }
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
            .filter((model: any) =>
              model.supportedGenerationMethods?.includes("generateContent") &&
              (model.name.includes("vision") || model.name.includes("1.5") || model.name.includes("gemini-pro"))
            )
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
      { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro", provider: "gemini", supportsVision: true },
      { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash", provider: "gemini", supportsVision: true },
      { id: "gemini-pro-vision", name: "Gemini Pro Vision", provider: "gemini", supportsVision: true },
    ];
  } catch (error) {
    logger.error("Failed to fetch Gemini models", { error });
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
        .filter((model: any) =>
          model.id.includes("gpt-4") &&
          (model.id.includes("vision") || model.id.includes("4o") || model.id.includes("4-turbo"))
        )
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
    logger.error("Failed to fetch OpenAI models", { error });
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
    logger.error("Failed to discover models", { error });
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
