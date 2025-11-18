import { NextResponse } from "next/server";
import { getLogger } from "../logging";

export interface ApiError {
  message: string;
  code?: string;
}

/**
 * Maps various error types to user-friendly messages
 */
export function handleApiError(error: unknown): ApiError {
  const logger = getLogger();
  logger.error("API Error", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  if (error instanceof Error) {
    // Handle specific error types
    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("token")
    ) {
      return {
        message: "Authentication failed. Please login again.",
        code: "AUTH_ERROR",
      };
    }

    if (error.message.includes("not found")) {
      return {
        message: "Resource not found",
        code: "NOT_FOUND",
      };
    }

    if (
      error.message.includes("permission") ||
      error.message.includes("access denied")
    ) {
      return {
        message: "You do not have permission to access this resource",
        code: "FORBIDDEN",
      };
    }

    if (error.message.includes("validation")) {
      return {
        message: error.message,
        code: "VALIDATION_ERROR",
      };
    }

    // Generic error message
    return {
      message: error.message || "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    };
  }

  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  status: number = 500
): NextResponse {
  const apiError = handleApiError(error);
  return NextResponse.json(
    { error: apiError.message, code: apiError.code },
    { status }
  );
}
