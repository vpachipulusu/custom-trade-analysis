/**
 * Validate required environment variables
 */
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'OPENAI_KEY',
    'ENCRYPTION_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    );
  }

  // Validate encryption key length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex encoded).\n' +
      'Generate one with: openssl rand -hex 32'
    );
  }
}
