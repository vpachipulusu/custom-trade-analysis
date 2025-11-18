"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useAuth } from "@/contexts/AuthContext";
import { useJournal } from "@/contexts/JournalContext";
import { getCurrencySymbol } from "@/lib/utils/currency";

interface StatsData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPL: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalCosts: number;
  averagePLPerTrade: number;
  roi: number;
  avgRisk: number;
  avgReward: number;
  avgRRRatio: string;
}

interface JournalSettings {
  startingBalance: number;
  currentBalance: number;
  currency: string;
}

interface Props {
  refreshTrigger?: number;
}

export default function JournalStats({ refreshTrigger }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [settings, setSettings] = useState<JournalSettings | null>(null);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, settingsRes] = await Promise.all([
        fetch("/api/journal/stats?type=alltime", { headers }),
        fetch("/api/journal/settings", { headers }),
      ]);

      if (!statsRes.ok || !settingsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();

      setStats(statsData.stats);
      setSettings({
        startingBalance: parseFloat(settingsData.settings.startingBalance),
        currentBalance: parseFloat(settingsData.settings.currentBalance),
        currency: settingsData.settings.currency,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    const symbol = getCurrencySymbol(settings?.currency || "GBP");
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!stats || !settings) {
    return (
      <Alert severity="info">
        No statistics available yet. Start trading to see your stats!
      </Alert>
    );
  }

  const closedPL = settings.currentBalance - settings.startingBalance;
  const roi =
    settings.startingBalance > 0
      ? (closedPL / settings.startingBalance) * 100
      : 0;

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Account Overview - Prominent Display */}
        <Grid item xs={12}>
          <Card
            elevation={2}
            sx={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              borderLeft: "4px solid #667eea",
            }}
          >
            <CardContent sx={{ py: 3 }}>
              <Typography
                variant="h6"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 3, color: "text.primary" }}
              >
                Account Overview
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontWeight: 500,
                      }}
                    >
                      Starting Balance
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ mt: 1, color: "text.primary" }}
                    >
                      {formatCurrency(settings.startingBalance)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontWeight: 500,
                      }}
                    >
                      Current Balance
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ mt: 1, color: "primary.main" }}
                    >
                      {formatCurrency(settings.currentBalance)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontWeight: 500,
                      }}
                    >
                      Total P/L
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ mt: 1 }}
                      color={closedPL >= 0 ? "success.main" : "error.main"}
                    >
                      {closedPL >= 0 ? "+" : ""}
                      {formatCurrency(closedPL)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontWeight: 500,
                      }}
                    >
                      ROI
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ mt: 1 }}
                      color={roi >= 0 ? "success.main" : "error.main"}
                    >
                      {roi >= 0 ? "+" : ""}
                      {roi.toFixed(2)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Trading Performance */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="600">
                  Trading Performance
                </Typography>
              </Box>
              <Box mb={3}>
                <Typography variant="h3" fontWeight="bold">
                  {stats.totalTrades}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Trades
                </Typography>
              </Box>
              <Box mb={2}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={0.5}
                >
                  <Typography variant="body2" color="text.secondary">
                    Win Rate
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color={
                      stats.winRate >= 50 ? "success.main" : "warning.main"
                    }
                  >
                    {formatPercent(stats.winRate)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(stats.winRate, 100)}
                  color={stats.winRate >= 50 ? "success" : "warning"}
                  sx={{ height: 6, borderRadius: 1 }}
                />
              </Box>
              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Wins
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {stats.winningTrades}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Losses
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error.main">
                    {stats.losingTrades}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    B/E
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="text.secondary"
                  >
                    {stats.breakEvenTrades}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* P/L Analysis */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AccountBalanceWalletIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="600">
                  P/L Analysis
                </Typography>
              </Box>
              <Box mb={3}>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  color={
                    stats.averagePLPerTrade >= 0 ? "success.main" : "error.main"
                  }
                >
                  {stats.averagePLPerTrade >= 0 ? "+" : ""}
                  {formatCurrency(stats.averagePLPerTrade)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg P/L Per Trade
                </Typography>
              </Box>
              <Box
                sx={{
                  mb: 2,
                  pb: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Avg Win
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatCurrency(stats.averageWin)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Avg Loss
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="error.main"
                  >
                    {formatCurrency(stats.averageLoss)}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Largest Win
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatCurrency(stats.largestWin)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Largest Loss
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="error.main"
                  >
                    {formatCurrency(stats.largestLoss)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Management */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingDownIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="600">
                  Risk Management
                </Typography>
              </Box>
              <Box mb={3}>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {stats.avgRRRatio}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Risk:Reward Ratio
                </Typography>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Avg Risk/Trade
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatPercent(stats.avgRisk)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Avg Reward/Trade
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatPercent(stats.avgReward)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trading Costs */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AccountBalanceWalletIcon color="error" />
                <Typography variant="subtitle1" fontWeight="600">
                  Trading Costs
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3" fontWeight="bold" color="error.main">
                  {formatCurrency(stats.totalCosts)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Costs (Fees & Commissions)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
