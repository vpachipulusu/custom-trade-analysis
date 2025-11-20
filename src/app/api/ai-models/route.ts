import { NextRequest, NextResponse } from "next/server";
import { getCachedAvailableModels } from "@/lib/services/modelDiscovery";
import { getLogger } from "@/lib/logging";

/**
 * GET /api/ai-models
 * Returns list of actually available AI models from all providers
 * Dynamically discovers models instead of hardcoding them
 */
export async function GET(request: NextRequest) {
  const logger = getLogger();

  try {
    logger.info("Fetching available AI models");

    // Get dynamically discovered models from all providers
    const availableModels = await getCachedAvailableModels();

    // Filter to only vision-capable models
    const visionModels = availableModels.filter(m => m.supportsVision);

    // Format for frontend dropdown
    const formattedModels = visionModels.map(model => ({
      id: `${model.provider}:${model.id}`,
      name: `${model.name} (${model.provider})`,
      provider: model.provider,
      modelId: model.id,
      description: `${model.provider.toUpperCase()} - ${model.name}`,
      enabled: true,
    }));

    logger.info("Available models fetched", {
      total: formattedModels.length,
      providers: [...new Set(formattedModels.map(m => m.provider))],
    });

    return NextResponse.json({
      models: formattedModels,
      count: formattedModels.length,
    });
  } catch (error) {
    logger.error("Error fetching AI models", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to fetch AI models" },
      { status: 500 }
    );
  }
}
