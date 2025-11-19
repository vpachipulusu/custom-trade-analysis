"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Alert,
  Snackbar,
  Box,
  Divider,
  CircularProgress,
} from "@mui/material";
import { Shield } from "@mui/icons-material";
import { useSettings, useUpdateSettings } from "@/hooks/useSecurity";

export default function SecuritySettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState({
    twoFactorEnabled: false,
    securityAlerts: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        twoFactorEnabled: settings.twoFactorEnabled,
        securityAlerts: settings.securityAlerts,
      });
    }
  }, [settings]);

  const handleToggle = async (field: keyof typeof formData) => {
    const newValue = !formData[field];

    // Optimistic update
    setFormData((prev) => ({
      ...prev,
      [field]: newValue,
    }));

    // Update on server
    updateSettings.mutate(
      { [field]: newValue },
      {
        onSuccess: () => {
          setSuccess("Security settings updated successfully");
        },
        onError: (error: any) => {
          // Revert on error
          setFormData((prev) => ({
            ...prev,
            [field]: !newValue,
          }));
          setError(
            error.response?.data?.error || "Failed to update settings"
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const lastPasswordChange = settings?.lastPasswordChange
    ? new Date(settings.lastPasswordChange).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Shield color="primary" />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Security Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your account security settings
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Last Password Change */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Last Password Change
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {lastPasswordChange}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Security Settings */}
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={formData.securityAlerts}
                onChange={() => handleToggle("securityAlerts")}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Security Alerts</Typography>
                <Typography variant="caption" color="text.secondary">
                  Get notified about important security events
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.twoFactorEnabled}
                onChange={() => handleToggle("twoFactorEnabled")}
                color="primary"
                disabled
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  Two-Factor Authentication
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Add an extra layer of security (Coming Soon)
                </Typography>
              </Box>
            }
          />
        </FormGroup>

        {formData.twoFactorEnabled && (
          <Alert severity="info" sx={{ mt: 3 }}>
            Two-factor authentication setup will be available in a future update.
          </Alert>
        )}

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
