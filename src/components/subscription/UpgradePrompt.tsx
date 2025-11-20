/**
 * UpgradePrompt Component
 * Displays when user hits subscription limits
 */

"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import axios from "axios";
import { SUBSCRIPTION_TIERS } from "@/lib/stripe";
import { getLogger } from "@/lib/logging";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  limitType: "layout" | "snapshot" | "analysis";
  currentTier: string;
}

export default function UpgradePrompt({
  open,
  onClose,
  limitType,
  currentTier,
}: UpgradePromptProps) {
  const logger = getLogger();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: "pro" | "enterprise") => {
    try {
      setLoading(tier);

      // Create checkout session
      const response = await axios.post("/api/create-checkout-session", {
        tier,
      });

      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      logger.error("Error creating checkout session", { error: error instanceof Error ? error.message : String(error), tier });
      alert("Failed to start checkout. Please try again.");
      setLoading(null);
    }
  };

  const limitMessages = {
    layout: "You've reached your monthly layout limit",
    snapshot: "You've reached your monthly snapshot limit",
    analysis: "You've reached your monthly analysis limit",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h5" component="div" fontWeight={600}>
            Upgrade Your Plan
          </Typography>
          <Button
            onClick={onClose}
            sx={{ minWidth: "auto", p: 1 }}
            color="inherit"
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {limitMessages[limitType]}. Upgrade to continue using the platform.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* Pro Plan */}
          <Card
            variant="outlined"
            sx={{
              flex: 1,
              position: "relative",
              border: currentTier === "pro" ? "2px solid #667eea" : undefined,
            }}
          >
            {currentTier === "pro" && (
              <Chip
                label="Current Plan"
                size="small"
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  bgcolor: "#667eea",
                  color: "white",
                }}
              />
            )}

            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {SUBSCRIPTION_TIERS.pro.name}
              </Typography>

              <Box sx={{ my: 2 }}>
                <Typography variant="h3" fontWeight={700}>
                  ${SUBSCRIPTION_TIERS.pro.price}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  per month
                </Typography>
              </Box>

              <List dense>
                {SUBSCRIPTION_TIERS.pro.features.map((feature, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>

              <Button
                variant={currentTier === "free" ? "contained" : "outlined"}
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => handleUpgrade("pro")}
                disabled={
                  currentTier === "pro" ||
                  currentTier === "enterprise" ||
                  loading !== null
                }
              >
                {loading === "pro" ? (
                  <CircularProgress size={24} />
                ) : currentTier === "pro" ? (
                  "Current Plan"
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card
            variant="outlined"
            sx={{
              flex: 1,
              position: "relative",
              border:
                currentTier === "enterprise" ? "2px solid #667eea" : undefined,
            }}
          >
            {currentTier === "enterprise" && (
              <Chip
                label="Current Plan"
                size="small"
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  bgcolor: "#667eea",
                  color: "white",
                }}
              />
            )}

            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography variant="h6" fontWeight={600}>
                  {SUBSCRIPTION_TIERS.enterprise.name}
                </Typography>
                <Chip label="Best Value" size="small" color="primary" />
              </Box>

              <Box sx={{ my: 2 }}>
                <Typography variant="h3" fontWeight={700}>
                  ${SUBSCRIPTION_TIERS.enterprise.price}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  per month
                </Typography>
              </Box>

              <List dense>
                {SUBSCRIPTION_TIERS.enterprise.features.map(
                  (feature, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  )
                )}
              </List>

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => handleUpgrade("enterprise")}
                disabled={currentTier === "enterprise" || loading !== null}
              >
                {loading === "enterprise" ? (
                  <CircularProgress size={24} />
                ) : currentTier === "enterprise" ? (
                  "Current Plan"
                ) : (
                  "Upgrade to Enterprise"
                )}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
}
