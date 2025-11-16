import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn(
    "ENCRYPTION_KEY must be 64 characters (32 bytes hex). Generate with: openssl rand -hex 32"
  );
}

/**
 * Encrypts text using AES-256-CBC
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  if (!text) return "";

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts text encrypted with AES-256-CBC
 * @param encryptedText - The encrypted string in format: iv:encryptedData
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encryptedData = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}
