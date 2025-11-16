import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

/**
 * Get or create a user by Firebase UID
 */
export async function getOrCreateUser(
  firebaseUid: string,
  email: string
): Promise<User> {
  let user = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseUid,
        email,
      },
    });
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Get user by Firebase UID
 */
export async function getUserByFirebaseUid(
  firebaseUid: string
): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { firebaseUid },
  });
}

/**
 * Update user data
 */
export async function updateUser(
  userId: string,
  data: Partial<Omit<User, "id" | "createdAt">>
): Promise<User> {
  return await prisma.user.update({
    where: { id: userId },
    data,
  });
}
