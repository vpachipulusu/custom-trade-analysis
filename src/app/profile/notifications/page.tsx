"use client";

import React from "react";
import { Box, Typography, Grid } from "@mui/material";
import { ProtectedRoute } from '@/components/layout';
import ProfileLayout from "@/components/profile/ProfileLayout";
import NotificationSettings from "@/components/profile/NotificationSettings";
import NotificationsPanel from "@/components/profile/NotificationsPanel";

function NotificationsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Notifications
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your notification preferences and view recent notifications
      </Typography>

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} lg={5}>
          <NotificationSettings />
        </Grid>

        {/* Notifications Panel */}
        <Grid item xs={12} lg={7}>
          <NotificationsPanel />
        </Grid>
      </Grid>
    </Box>
  );
}

export default function NotificationsPageWrapper() {
  return (
    <ProtectedRoute>
      <ProfileLayout>
        <NotificationsPage />
      </ProfileLayout>
    </ProtectedRoute>
  );
}
