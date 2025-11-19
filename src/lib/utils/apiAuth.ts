import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/adminApp";
import { getOrCreateUser } from "@/lib/db/users";
import { getLogger } from "../logging";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  userId: string; // Database user ID
  firebaseUid: string; // Firebase UID (same as uid)
}

/**
 * Authenticates a request by verifying the Firebase token
 * and retrieving/creating the user in the database
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<
  | { user: AuthenticatedUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        error: NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Firebase token
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken.uid || !decodedToken.email) {
      return {
        error: NextResponse.json(
          { error: "Invalid token payload" },
          { status: 401 }
        ),
      };
    }

    // Get or create user in database
    const dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email);

    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        userId: dbUser.id,
        firebaseUid: decodedToken.uid,
      },
    };
  } catch (error) {
    const logger = getLogger();
    logger.error("Authentication error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

/**
 * Verifies that the authenticated user owns the specified resource
 */
export function verifyOwnership(
  userId: string,
  resourceUserId: string
): boolean {
  return userId === resourceUserId;
}
