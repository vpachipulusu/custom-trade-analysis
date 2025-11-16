/**
 * Environment Variable Validation Utility
 * Validates all required environment variables on app startup
 * Throws clear errors if any are missing
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;

  // Firebase Client SDK (public)
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;

  // External APIs
  CHART_IMG_API_KEY: string;
  OPENAI_API_KEY: string;

  // Security
  ENCRYPTION_KEY: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  // Database
  "DATABASE_URL",

  // Firebase Admin SDK
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",

  // Firebase Client SDK
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",

  // External APIs
  "CHART_IMG_API_KEY",
  "OPENAI_API_KEY",

  // Security
  "ENCRYPTION_KEY",
];

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnv(): void {
  const missingVars: string[] = [];
  const invalidVars: { name: string; reason: string }[] = [];

  for (const varName of requiredEnvVars) {
    const value = process.env[varName];

    if (!value || value.trim() === "") {
      missingVars.push(varName);
      continue;
    }

    // Specific validation rules
    switch (varName) {
      case "DATABASE_URL":
        if (
          !value.startsWith("postgresql://") &&
          !value.startsWith("postgres://")
        ) {
          invalidVars.push({
            name: varName,
            reason:
              "Must be a valid PostgreSQL connection string starting with postgresql:// or postgres://",
          });
        }
        break;

      case "FIREBASE_PRIVATE_KEY":
        if (
          !value.includes("BEGIN PRIVATE KEY") ||
          !value.includes("END PRIVATE KEY")
        ) {
          invalidVars.push({
            name: varName,
            reason: "Must be a valid private key with BEGIN and END markers",
          });
        }
        break;

      case "FIREBASE_CLIENT_EMAIL":
        if (
          !value.includes("@") ||
          !value.includes(".iam.gserviceaccount.com")
        ) {
          invalidVars.push({
            name: varName,
            reason: "Must be a valid Firebase service account email",
          });
        }
        break;

      case "ENCRYPTION_KEY":
        // Should be 64 hex characters (32 bytes)
        if (!/^[0-9a-fA-F]{64}$/.test(value)) {
          invalidVars.push({
            name: varName,
            reason: "Must be a 64-character hexadecimal string (32 bytes)",
          });
        }
        break;

      case "OPENAI_API_KEY":
        if (!value.startsWith("sk-")) {
          invalidVars.push({
            name: varName,
            reason: 'Must start with "sk-"',
          });
        }
        break;

      case "NEXT_PUBLIC_FIREBASE_API_KEY":
        if (!value.startsWith("AIza")) {
          invalidVars.push({
            name: varName,
            reason: 'Must start with "AIza"',
          });
        }
        break;

      case "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID":
        if (!/^\d+$/.test(value)) {
          invalidVars.push({
            name: varName,
            reason: "Must be a numeric string",
          });
        }
        break;
    }
  }

  // Report errors
  if (missingVars.length > 0 || invalidVars.length > 0) {
    const errorMessages: string[] = [
      "❌ Environment Variable Validation Failed",
      "",
    ];

    if (missingVars.length > 0) {
      errorMessages.push("Missing required environment variables:");
      missingVars.forEach((varName) => {
        errorMessages.push(`  - ${varName}`);
      });
      errorMessages.push("");
    }

    if (invalidVars.length > 0) {
      errorMessages.push("Invalid environment variables:");
      invalidVars.forEach(({ name, reason }) => {
        errorMessages.push(`  - ${name}: ${reason}`);
      });
      errorMessages.push("");
    }

    errorMessages.push(
      "Please check your .env.local file or deployment environment variables."
    );
    errorMessages.push("See DEPLOYMENT.md for details on required variables.");

    throw new Error(errorMessages.join("\n"));
  }

  console.log("✅ All environment variables validated successfully");
}

/**
 * Gets a typed environment configuration object
 * Only call this after validateEnv() has been called
 */
export function getEnvConfig(): EnvConfig {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID!,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY!,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL!,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    CHART_IMG_API_KEY: process.env.CHART_IMG_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  };
}
