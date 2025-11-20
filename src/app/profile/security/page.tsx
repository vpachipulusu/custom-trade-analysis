"use client";

import React from "react";
import { Box, Typography, Grid } from "@mui/material";
import { ProtectedRoute } from '@/components/layout';
import ProfileLayout from "@/components/profile/ProfileLayout";
import ChangePassword from "@/components/profile/ChangePassword";
import SecuritySettings from "@/components/profile/SecuritySettings";
import LoginHistoryTable from "@/components/profile/LoginHistoryTable";

function SecurityPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Security & Password
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your password, security settings, and login activity
      </Typography>

      <Grid container spacing={3}>
        {/* Change Password */}
        <Grid item xs={12} lg={6}>
          <ChangePassword />
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} lg={6}>
          <SecuritySettings />
        </Grid>

        {/* Login History */}
        <Grid item xs={12}>
          <LoginHistoryTable />
        </Grid>
      </Grid>
    </Box>
  );
}

export default function SecurityPageWrapper() {
  return (
    <ProtectedRoute>
      <ProfileLayout>
        <SecurityPage />
      </ProfileLayout>
    </ProtectedRoute>
  );
}
