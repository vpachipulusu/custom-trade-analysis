import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { initializeApp, getApps } from "firebase/app";

// Initialize Firebase Storage (client-side config for server use)
const getFirebaseStorage = () => {
  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    initializeApp(firebaseConfig);
  }
  return getStorage();
};

/**
 * POST /api/profile/avatar
 * Upload user's profile picture
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Firebase Storage
    const storage = getFirebaseStorage();
    const fileExtension = file.name.split(".").pop();
    const fileName = `avatars/${authResult.user.userId}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    // Upload file
    await uploadBytes(storageRef, buffer, {
      contentType: file.type,
    });

    // Get download URL
    const photoURL = await getDownloadURL(storageRef);

    // Update user profile with new avatar URL
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.userId },
      data: { photoURL },
      select: {
        id: true,
        photoURL: true,
      },
    });

    return NextResponse.json({
      message: "Avatar uploaded successfully",
      photoURL: updatedUser.photoURL,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return createErrorResponse(error, 500);
  }
}

/**
 * DELETE /api/profile/avatar
 * Remove user's profile picture
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Get current user to check if they have an avatar
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: { photoURL: true },
    });

    if (!user?.photoURL) {
      return NextResponse.json(
        { error: "No avatar to delete" },
        { status: 404 }
      );
    }

    // Try to delete from Firebase Storage (optional - may fail if URL is external)
    try {
      const storage = getFirebaseStorage();
      const fileName = `avatars/${authResult.user.userId}`;

      // Try common extensions
      for (const ext of ["jpg", "jpeg", "png", "webp"]) {
        try {
          const storageRef = ref(storage, `${fileName}.${ext}`);
          await deleteObject(storageRef);
          break; // If successful, stop trying
        } catch (e) {
          // Continue to next extension
        }
      }
    } catch (error) {
      console.warn("Could not delete from storage:", error);
      // Continue anyway - just remove from database
    }

    // Remove avatar URL from database
    await prisma.user.update({
      where: { id: authResult.user.userId },
      data: { photoURL: null },
    });

    return NextResponse.json({
      message: "Avatar removed successfully",
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
