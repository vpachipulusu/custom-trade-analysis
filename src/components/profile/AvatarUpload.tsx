"use client";

import React, { useState, useRef } from "react";
import {
  Box,
  Avatar,
  IconButton,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { PhotoCamera, Delete } from "@mui/icons-material";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/useProfile";

interface AvatarUploadProps {
  currentPhotoURL: string | null;
  displayName: string | null;
  email: string;
}

export default function AvatarUpload({
  currentPhotoURL,
  displayName,
  email,
}: AvatarUploadProps) {
  const [previewURL, setPreviewURL] = useState<string | null>(
    currentPhotoURL
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size too large. Maximum size is 5MB.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewURL(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadAvatar.mutate(file, {
      onSuccess: (data) => {
        setSuccess("Avatar uploaded successfully!");
        setPreviewURL(data.photoURL);
      },
      onError: (error: any) => {
        setError(
          error.response?.data?.error || "Failed to upload avatar"
        );
        setPreviewURL(currentPhotoURL);
      },
    });
  };

  const handleDelete = () => {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => {
        setSuccess("Avatar removed successfully!");
        setPreviewURL(null);
      },
      onError: (error: any) => {
        setError(
          error.response?.data?.error || "Failed to remove avatar"
        );
      },
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Box sx={{ position: "relative" }}>
        <Avatar
          src={previewURL || undefined}
          alt={displayName || email}
          sx={{
            width: 120,
            height: 120,
            fontSize: "2.5rem",
            bgcolor: "primary.main",
          }}
        >
          {!previewURL && getInitials()}
        </Avatar>

        {(uploadAvatar.isPending || deleteAvatar.isPending) && (
          <CircularProgress
            size={120}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
            }}
          />
        )}

        <IconButton
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            bgcolor: "primary.main",
            color: "white",
            "&:hover": { bgcolor: "primary.dark" },
          }}
          onClick={handleUploadClick}
          disabled={uploadAvatar.isPending || deleteAvatar.isPending}
        >
          <PhotoCamera />
        </IconButton>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {previewURL && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={handleDelete}
          disabled={uploadAvatar.isPending || deleteAvatar.isPending}
          size="small"
        >
          Remove Avatar
        </Button>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
