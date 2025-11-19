"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Box,
  Divider,
  CircularProgress,
} from "@mui/material";
import { NotificationsActive } from "@mui/icons-material";
import { useSettings, useUpdateSettings } from "@/hooks/useSecurity";

export default function NotificationSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    notificationFrequency: "instant",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        marketingEmails: settings.marketingEmails,
        notificationFrequency: settings.notificationFrequency,
      });
    }
  }, [settings]);

  const handleToggle = async (field: keyof typeof formData) => {
    if (typeof formData[field] !== "boolean") return;

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
          setSuccess("Notification settings updated");
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

  const handleFrequencyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      notificationFrequency: value,
    }));

    updateSettings.mutate(
      { notificationFrequency: value },
      {
        onSuccess: () => {
          setSuccess("Notification frequency updated");
        },
        onError: (error: any) => {
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

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <NotificationsActive color="primary" />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Notification Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control how and when you receive notifications
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Notification Toggles */}
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={formData.emailNotifications}
                onChange={() => handleToggle("emailNotifications")}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Email Notifications</Typography>
                <Typography variant="caption" color="text.secondary">
                  Receive notifications via email
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.pushNotifications}
                onChange={() => handleToggle("pushNotifications")}
                color="primary"
                disabled
              />
            }
            label={
              <Box>
                <Typography variant="body1">Push Notifications</Typography>
                <Typography variant="caption" color="text.secondary">
                  Browser push notifications (Coming Soon)
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.marketingEmails}
                onChange={() => handleToggle("marketingEmails")}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Marketing Emails</Typography>
                <Typography variant="caption" color="text.secondary">
                  Receive product updates and offers
                </Typography>
              </Box>
            }
          />
        </FormGroup>

        <Divider sx={{ my: 3 }} />

        {/* Notification Frequency */}
        <FormControl fullWidth>
          <InputLabel>Notification Frequency</InputLabel>
          <Select
            value={formData.notificationFrequency}
            label="Notification Frequency"
            onChange={(e) => handleFrequencyChange(e.target.value)}
          >
            <MenuItem value="instant">
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Instant
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Get notified immediately
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="daily">
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Daily Digest
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Once per day summary
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="weekly">
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Weekly Digest
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Once per week summary
                </Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

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
