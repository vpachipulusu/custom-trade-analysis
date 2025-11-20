/**
 * SubscriptionStatus Component
 * Displays current subscription tier and usage
 */

"use client";

import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  Grid,
} from "@mui/material";
import UpgradeIcon from "@mui/icons-material/Upgrade";
import { useState } from "react";
import UpgradePrompt from "./UpgradePrompt";

interface UsageStat {
  label: string;
  current: number;
  limit: number;
  type: "layout" | "snapshot" | "analysis";
}

interface SubscriptionStatusProps {
  tier: string;
  usage: {
    layouts: number;
    snapshots: number;
    analyses: number;
  };
  limits: {
    layoutsPerMonth: number;
    snapshotsPerMonth: number;
    analysesPerMonth: number;
  };
}

export default function SubscriptionStatus({
  tier,
  usage,
  limits,
}: SubscriptionStatusProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitType, setLimitType] = useState<
    "layout" | "snapshot" | "analysis"
  >("layout");

  const handleUpgradeClick = (type: "layout" | "snapshot" | "analysis") => {
    setLimitType(type);
    setUpgradeOpen(true);
  };

  const stats: UsageStat[] = [
    {
      label: "Layouts",
      current: usage.layouts,
      limit: limits.layoutsPerMonth,
      type: "layout",
    },
    {
      label: "Snapshots",
      current: usage.snapshots,
      limit: limits.snapshotsPerMonth,
      type: "snapshot",
    },
    {
      label: "Analyses",
      current: usage.analyses,
      limit: limits.analysesPerMonth,
      type: "analysis",
    },
  ];

  const getUsagePercent = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return (current / limit) * 100;
  };

  const getUsageColor = (percent: number): "success" | "warning" | "error" => {
    if (percent < 70) return "success";
    if (percent < 90) return "warning";
    return "error";
  };

  const formatLimit = (limit: number): string => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  const tierColors: Record<string, string> = {
    free: "#9e9e9e",
    pro: "#667eea",
    enterprise: "#764ba2",
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Subscription
            </Typography>
            <Chip
              label={tier.toUpperCase()}
              sx={{
                bgcolor: tierColors[tier] || tierColors.free,
                color: "white",
                fontWeight: 600,
              }}
            />
          </Box>

          <Grid container spacing={2}>
            {stats.map((stat) => {
              const percent = getUsagePercent(stat.current, stat.limit);
              const color = getUsageColor(percent);
              const isUnlimited = stat.limit === -1;

              return (
                <Grid item xs={12} key={stat.label}>
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {stat.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.current} / {formatLimit(stat.limit)}
                      </Typography>
                    </Box>

                    {!isUnlimited && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(percent, 100)}
                        color={color}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    )}

                    {isUnlimited && (
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: "success.light",
                          opacity: 0.3,
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {tier === "free" && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<UpgradeIcon />}
              sx={{ mt: 2 }}
              onClick={() => handleUpgradeClick("layout")}
            >
              Upgrade Plan
            </Button>
          )}
        </CardContent>
      </Card>

      <UpgradePrompt
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        limitType={limitType}
        currentTier={tier}
      />
    </>
  );
}
