"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Box,
  Divider,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import AvatarUpload from "./AvatarUpload";
import TradingViewSessionSettings from "./TradingViewSessionSettings";

export default function ProfileSettings() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    phoneNumber: "",
    location: "",
    website: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        phoneNumber: profile.phoneNumber || "",
        location: profile.location || "",
        website: profile.website || "",
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateProfile.mutate(formData, {
      onSuccess: () => {
        setSuccess("Profile updated successfully!");
      },
      onError: (error: any) => {
        setError(
          error.response?.data?.error || "Failed to update profile"
        );
      },
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Alert severity="error">Failed to load profile data</Alert>
    );
  }

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Profile Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your personal information and preferences
        </Typography>

        <Divider sx={{ mb: 4 }} />

        {/* Avatar Section */}
        <Box sx={{ mb: 4 }}>
          <AvatarUpload
            currentPhotoURL={profile.photoURL}
            displayName={profile.displayName}
            email={profile.email}
          />
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Email (Read-only) */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                value={profile.email}
                disabled
                helperText="Email cannot be changed"
              />
            </Grid>

            {/* Display Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Display Name"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </Grid>

            {/* Phone Number */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="London, UK"
              />
            </Grid>

            {/* Website */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
                type="url"
              />
            </Grid>

            {/* Bio */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="Tell us about yourself..."
              />
            </Grid>

            {/* TradingView Session */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <TradingViewSessionSettings />
            </Grid>

            {/* Account Info */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Member Since"
                value={new Date(profile.createdAt).toLocaleDateString()}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Login"
                value={
                  profile.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString()
                    : "Never"
                }
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Subscription Tier"
                value={profile.subscriptionTier.toUpperCase()}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Subscription Status"
                value={profile.subscriptionStatus.toUpperCase()}
                disabled
              />
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={updateProfile.isPending ? <CircularProgress size={20} color="inherit" /> : <Save />}
                disabled={updateProfile.isPending}
                sx={{ mt: 2 }}
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </Grid>
          </Grid>
        </form>

        {/* Success/Error Notifications */}
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
      </CardContent>
    </Card>
  );
}
