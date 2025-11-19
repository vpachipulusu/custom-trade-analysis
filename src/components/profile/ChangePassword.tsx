"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  InputAdornment,
  IconButton,
  LinearProgress,
  Alert,
  Snackbar,
  Box,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { useChangePassword } from "@/hooks/useSecurity";

export default function ChangePassword() {
  const changePassword = useChangePassword();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleShowPassword = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/\d/.test(password)) strength += 15;
    if (/[@$!%*?&]/.test(password)) strength += 20;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const getStrengthColor = () => {
    if (passwordStrength < 40) return "error";
    if (passwordStrength < 70) return "warning";
    return "success";
  };

  const getStrengthText = () => {
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 70) return "Medium";
    return "Strong";
  };

  const passwordRequirements = [
    { label: "At least 8 characters", met: formData.newPassword.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.newPassword) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(formData.newPassword) },
    { label: "Contains number", met: /\d/.test(formData.newPassword) },
    { label: "Contains special character", met: /[@$!%*?&]/.test(formData.newPassword) },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password strength
    if (passwordStrength < 70) {
      setError("Password is too weak. Please meet all requirements.");
      return;
    }

    changePassword.mutate(formData, {
      onSuccess: () => {
        setSuccess("Password changed successfully!");
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      },
      onError: (error: any) => {
        setError(
          error.message || "Failed to change password. Please try again."
        );
      },
    });
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Lock color="primary" />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your password to keep your account secure
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Current Password */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                type={showPasswords.current ? "text" : "password"}
                label="Current Password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => toggleShowPassword("current")}
                        edge="end"
                      >
                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* New Password */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                type={showPasswords.new ? "text" : "password"}
                label="New Password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => toggleShowPassword("new")}
                        edge="end"
                      >
                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Password Strength:
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      color={`${getStrengthColor()}.main`}
                    >
                      {getStrengthText()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    color={getStrengthColor()}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}
            </Grid>

            {/* Confirm New Password */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                type={showPasswords.confirm ? "text" : "password"}
                label="Confirm New Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={
                  formData.confirmPassword !== "" &&
                  formData.newPassword !== formData.confirmPassword
                }
                helperText={
                  formData.confirmPassword !== "" &&
                  formData.newPassword !== formData.confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => toggleShowPassword("confirm")}
                        edge="end"
                      >
                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Password Requirements */}
            {formData.newPassword && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Password Requirements:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {passwordRequirements.map((req, index) => (
                    <Box
                      key={index}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      {req.met ? (
                        <CheckCircle sx={{ fontSize: 16, color: "success.main" }} />
                      ) : (
                        <Cancel sx={{ fontSize: 16, color: "text.disabled" }} />
                      )}
                      <Typography
                        variant="caption"
                        color={req.met ? "success.main" : "text.secondary"}
                      >
                        {req.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={changePassword.isPending}
                sx={{ mt: 2 }}
              >
                {changePassword.isPending ? "Changing Password..." : "Change Password"}
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
