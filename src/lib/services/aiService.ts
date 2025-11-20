import * as openaiService from "./openai";
import * as deepseekService from "./deepseek";
import * as geminiService from "./gemini";
import * as claudeService from "./claude";
import { AnalysisResult, EconomicImpactResult } from "./openai";
import { EconomicEvent } from "./economicCalendar";
import { getLogger } from "../logging";

export type AIModel = "openai" | "deepseek" | "gemini" | "claude";

export interface AIModelInfo {
  id: AIModel;
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * Get configuration for which AI models are enabled
 */
export function getEnabledModels(): AIModelInfo[] {
  const models: AIModelInfo[] = [
    {
      id: "openai",
      name: "OpenAI GPT-4o",
      description: "Advanced vision model with high accuracy",
      enabled: process.env.ENABLE_OPENAI !== "false" && !!process.env.OPENAI_KEY,
    },
    {
      id: "gemini",
      name: "Google Gemini Pro Vision",
      description: "Google's multimodal AI with vision capabilities",
      enabled: process.env.ENABLE_GEMINI !== "false" && !!process.env.GEMINI_KEY,
    },
    {
      id: "claude",
      name: "Claude 3.5 Sonnet",
      description: "Anthropic's latest model with vision support",
      enabled: process.env.ENABLE_CLAUDE !== "false" && !!process.env.CLAUDE_KEY,
    },
    {
      id: "deepseek",
      name: "DeepSeek Chat",
      description: "Text-only model (no vision support yet)",
      enabled: process.env.ENABLE_DEEPSEEK !== "false" && !!process.env.DEEPSEEK_KEY,
    },
  ];

  return models.filter((m) => m.enabled);
}

/**
 * Get the default AI model (first enabled model)
 */
export function getDefaultModel(): AIModel {
  const enabled = getEnabledModels();
  if (enabled.length === 0) {
    throw new Error("No AI models are enabled. Please configure at least one model.");
  }
  return enabled[0].id;
}

/**
 * Analyze a single chart with specified AI model
 * @param imageUrl - URL of the chart image to analyze
 * @param model - AI model provider (e.g., "openai", "gemini", "claude")
 * @param modelId - Specific model ID to use (e.g., "gpt-4o", "gemini-1.5-pro-latest")
 */
export async function analyzeChart(
  imageUrl: string,
  model?: AIModel,
  modelId?: string
): Promise<AnalysisResult> {
  const logger = getLogger();
  const selectedModel = model || getDefaultModel();

  logger.info("Starting AI analysis", {
    model: selectedModel,
    modelId,
    hasImageUrl: !!imageUrl,
  });

  try {
    let result: AnalysisResult;

    switch (selectedModel) {
      case "openai":
        result = await openaiService.analyzeChart(imageUrl, modelId);
        break;
      case "gemini":
        result = await geminiService.analyzeChart(imageUrl, modelId);
        break;
      case "claude":
        result = await claudeService.analyzeChart(imageUrl, modelId);
        break;
      case "deepseek":
        result = await deepseekService.analyzeChart(imageUrl);
        break;
      default:
        throw new Error(`Unsupported AI model: ${selectedModel}`);
    }

    logger.info("AI analysis completed successfully", {
      model: selectedModel,
      modelId,
      action: result.action,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("AI analysis failed", {
      model: selectedModel,
      modelId,
      error: errorMessage,
    });
    throw new Error(`${selectedModel.toUpperCase()} analysis failed: ${errorMessage}`);
  }
}

/**
 * Analyze multiple layouts with specified AI model
 * @param layouts - Array of chart layouts to analyze
 * @param model - AI model provider (e.g., "openai", "gemini", "claude")
 * @param modelId - Specific model ID to use (e.g., "gpt-4o", "gemini-1.5-pro-latest")
 */
export async function analyzeMultipleLayouts(
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>,
  model?: AIModel,
  modelId?: string
): Promise<AnalysisResult> {
  const logger = getLogger();
  const selectedModel = model || getDefaultModel();

  logger.info("Starting AI multi-layout analysis", {
    model: selectedModel,
    modelId,
    layoutCount: layouts.length,
  });

  try {
    let result: AnalysisResult;

    switch (selectedModel) {
      case "openai":
        result = await openaiService.analyzeMultipleLayouts(layouts, modelId);
        break;
      case "gemini":
        result = await geminiService.analyzeMultipleLayouts(layouts, modelId);
        break;
      case "claude":
        result = await claudeService.analyzeMultipleLayouts(layouts, modelId);
        break;
      case "deepseek":
        result = await deepseekService.analyzeMultipleLayouts(layouts);
        break;
      default:
        throw new Error(`Unsupported AI model: ${selectedModel}`);
    }

    logger.info("AI multi-layout analysis completed successfully", {
      model: selectedModel,
      modelId,
      action: result.action,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("AI multi-layout analysis failed", {
      model: selectedModel,
      modelId,
      error: errorMessage,
    });
    throw new Error(`${selectedModel.toUpperCase()} multi-layout analysis failed: ${errorMessage}`);
  }
}

/**
 * Analyze economic impact with specified AI model
 */
export async function analyzeEconomicImpact(
  params: {
    symbol: string;
    action: "BUY" | "SELL" | "HOLD";
    confidence: number;
    upcomingEvents: EconomicEvent[];
    weeklyEvents: EconomicEvent[];
  },
  model?: AIModel
): Promise<EconomicImpactResult> {
  const logger = getLogger();
  const selectedModel = model || getDefaultModel();

  logger.info("Starting AI economic impact analysis", {
    model: selectedModel,
    symbol: params.symbol,
  });

  try {
    let result: EconomicImpactResult;

    switch (selectedModel) {
      case "openai":
        result = await openaiService.analyzeEconomicImpact(params);
        break;
      case "gemini":
        result = await geminiService.analyzeEconomicImpact(params);
        break;
      case "claude":
        result = await claudeService.analyzeEconomicImpact(params);
        break;
      case "deepseek":
        result = await deepseekService.analyzeEconomicImpact(params);
        break;
      default:
        throw new Error(`Unsupported AI model: ${selectedModel}`);
    }

    logger.info("AI economic impact analysis completed successfully", {
      model: selectedModel,
      immediateRisk: result.immediateRisk,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("AI economic impact analysis failed", {
      model: selectedModel,
      error: errorMessage,
    });
    throw new Error(`${selectedModel.toUpperCase()} economic analysis failed: ${errorMessage}`);
  }
}
