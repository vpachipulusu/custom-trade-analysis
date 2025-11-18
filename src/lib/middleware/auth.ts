import { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase/adminApp";
import { prisma } from "@/lib/prisma";
import { getLogger } from "../logging";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  userId: string; // Database user ID
}

/**
 * Authenticates a request by verifying the Firebase token
 * and retrieving the user from the database
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Firebase token
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken.uid || !decodedToken.email) {
      throw new Error("Invalid token payload");
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
        },
      });
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      userId: user.id,
    };
  } catch (error) {
    const logger = getLogger();
    logger.error("Authentication error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error("Unauthorized");
  }
}

/**
 * Verifies that the authenticated user owns the specified resource
 */
export async function verifyOwnership(
  userId: string,
  resourceUserId: string
): Promise<boolean> {
  return userId === resourceUserId;
}
