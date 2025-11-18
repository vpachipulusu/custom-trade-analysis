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
    const symbol =
      settings?.currency === "USD"
        ? "$"
        : settings?.currency === "EUR"
        ? "€"
        : "£";
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

  return (
    <Box>
      {/* Account Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AccountBalanceWalletIcon
                  sx={{ mr: 1, color: "primary.main" }}
                />
                <Typography variant="subtitle2" color="text.secondary">
                  Starting Balance
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(settings.startingBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                {closedPL >= 0 ? (
                  <TrendingUpIcon sx={{ mr: 1, color: "success.main" }} />
                ) : (
                  <TrendingDownIcon sx={{ mr: 1, color: "error.main" }} />
                )}
                <Typography variant="subtitle2" color="text.secondary">
                  Closed Position P/L
                </Typography>
              </Box>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={closedPL >= 0 ? "success.main" : "error.main"}
              >
                {formatCurrency(closedPL)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AccountBalanceWalletIcon
                  sx={{ mr: 1, color: "primary.main" }}
                />
                <Typography variant="subtitle2" color="text.secondary">
                  Current Balance
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(settings.currentBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Trading Statistics */}
      <Grid container spacing={3}>
        {/* Trade Counts */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Total Trades
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Winning Trades
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.winningTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Losing Trades
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.losingTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Break Even
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="text.secondary">
                {stats.breakEvenTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Win Rate */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Win Rate
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatPercent(stats.winRate)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(stats.winRate, 100)}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* P/L Metrics */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Average Win
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(stats.averageWin)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Average Loss
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                {formatCurrency(stats.averageLoss)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Average P/L Per Trade
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                color={
                  stats.averagePLPerTrade >= 0 ? "success.main" : "error.main"
                }
              >
                {formatCurrency(stats.averagePLPerTrade)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Largest Win/Loss */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Largest Win
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(stats.largestWin)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Largest Loss
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                {formatCurrency(stats.largestLoss)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Costs and ROI */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Total Trade Costs
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(stats.totalCosts)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Return On Investment
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                color={stats.roi >= 0 ? "success.main" : "error.main"}
              >
                {formatPercent(stats.roi)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk/Reward */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Avg Risk Per Trade
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatPercent(stats.avgRisk)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Avg Reward Per Trade
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatPercent(stats.avgReward)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Avg Risk:Reward Ratio
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {stats.avgRRRatio}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
