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
      {/* Compact Account Summary & Key Metrics */}
      <Grid container spacing={2}>
        {/* Main Account Summary Card */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Starting Balance
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(settings.startingBalance)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Current Balance
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="primary.main"
                    >
                      {formatCurrency(settings.currentBalance)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Total P/L
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color={closedPL >= 0 ? "success.main" : "error.main"}
                    >
                      {closedPL >= 0 ? "+" : ""}
                      {formatCurrency(closedPL)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      ROI
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
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

        {/* Trading Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Trading Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Total Trades
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.totalTrades}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Win Rate
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={
                      stats.winRate >= 50 ? "success.main" : "warning.main"
                    }
                  >
                    {formatPercent(stats.winRate)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Wins
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {stats.winningTrades}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Losses
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="error.main"
                  >
                    {stats.losingTrades}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Break-Even
                  </Typography>
                  <Typography
                    variant="body1"
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

        {/* P/L Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                P/L Analysis
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Win
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatCurrency(stats.averageWin)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Loss
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="error.main"
                  >
                    {formatCurrency(stats.averageLoss)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Largest Win
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatCurrency(stats.largestWin)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Largest Loss
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    color="error.main"
                  >
                    {formatCurrency(stats.largestLoss)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Avg P/L Per Trade
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={
                      stats.averagePLPerTrade >= 0
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {stats.averagePLPerTrade >= 0 ? "+" : ""}
                    {formatCurrency(stats.averagePLPerTrade)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Risk Management
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Risk/Trade
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatPercent(stats.avgRisk)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Reward/Trade
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatPercent(stats.avgReward)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Risk:Reward Ratio
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {stats.avgRRRatio}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Costs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Trading Costs
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Costs
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(stats.totalCosts)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
