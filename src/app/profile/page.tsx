"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Button,
} from "@mui/material";
import {
  Email,
  LocationOn,
  Phone,
  Language,
  CalendarToday,
  CheckCircle,
  Edit,
  Security,
  NotificationsActive,
} from "@mui/icons-material";
import { useProfile } from "@/hooks/useProfile";
import { ProtectedRoute } from '@/components/layout';
import ProfileLayout from "@/components/profile/ProfileLayout";

function ProfileOverview() {
  const { data: profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Alert severity="error">
        Failed to load profile. Please try again later.
      </Alert>
    );
  }

  const getInitials = () => {
    if (profile.displayName) {
      return profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.email[0].toUpperCase();
  };

  const getSubscriptionColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "pro":
        return "primary";
      case "enterprise":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "canceled":
        return "error";
      case "past_due":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 4,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white"
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Avatar
                  src={profile.photoURL || undefined}
                  alt={profile.displayName || profile.email}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: "2.5rem",
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    border: "4px solid rgba(255, 255, 255, 0.3)",
                    boxShadow: 3,
                  }}
                >
                  {!profile.photoURL && getInitials()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {profile.displayName || "Welcome!"}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                    {profile.email}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={profile.subscriptionTier.toUpperCase()}
                      sx={{
                        bgcolor: "rgba(255, 255, 255, 0.25)",
                        color: "white",
                        fontWeight: "bold",
                        backdropFilter: "blur(10px)"
                      }}
                      size="medium"
                    />
                    <Chip
                      label={profile.subscriptionStatus.toUpperCase()}
                      sx={{
                        bgcolor: profile.subscriptionStatus === "active"
                          ? "rgba(76, 175, 80, 0.9)"
                          : "rgba(255, 255, 255, 0.25)",
                        color: "white",
                        fontWeight: "bold"
                      }}
                      size="medium"
                      icon={profile.subscriptionStatus === "active" ? <CheckCircle sx={{ color: "white !important" }} /> : undefined}
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: "100%" }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {profile.bio && (
                <Box sx={{ mb: 3, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    "{profile.bio}"
                  </Typography>
                </Box>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Email color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2">{profile.email}</Typography>
                    </Box>
                  </Box>
                </Grid>

                {profile.phoneNumber && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Phone color="action" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body2">{profile.phoneNumber}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {profile.location && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LocationOn color="action" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Location
                        </Typography>
                        <Typography variant="body2">{profile.location}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {profile.website && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Language color="action" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Website
                        </Typography>
                        <Typography
                          variant="body2"
                          component="a"
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "primary.main", textDecoration: "none" }}
                        >
                          {profile.website}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Stats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Account Stats
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <CalendarToday color="action" fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Member Since
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <CalendarToday color="action" fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Last Login
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {profile.lastLoginAt
                      ? new Date(profile.lastLoginAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Edit />}
                  href="/profile/settings"
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: 2,
                    textTransform: "none",
                    py: 1.5
                  }}
                >
                  Edit Profile Settings
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Security />}
                  href="/profile/security"
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: 2,
                    textTransform: "none",
                    py: 1.5
                  }}
                >
                  Security & Password
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<NotificationsActive />}
                  href="/profile/notifications"
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: 2,
                    textTransform: "none",
                    py: 1.5
                  }}
                >
                  Notifications
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileLayout>
        <ProfileOverview />
      </ProfileLayout>
    </ProtectedRoute>
  );
}
