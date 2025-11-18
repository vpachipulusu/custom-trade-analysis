"use client";

import React, { useEffect, useState } from "react";
import { Box, Grid, CircularProgress, Alert } from "@mui/material";
import { Trade, JournalSettings } from "@prisma/client";
import { useAuth } from "@/contexts/AuthContext";
import EquityCurveChart from "./EquityCurveChart";
import WinLossChart from "./WinLossChart";
import PLDistributionChart from "./PLDistributionChart";
import MarketPerformanceChart from "./MarketPerformanceChart";
import DisciplineChart from "./DisciplineChart";
import JournalStats from "./JournalStats";

interface StatisticsTabProps {
  refreshTrigger?: number;
}

export default function StatisticsTab({
  refreshTrigger = 0,
}: StatisticsTabProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
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

      // Fetch trades
      const tradesResponse = await fetch("/api/journal/trades?limit=1000", {
        headers,
      });
      if (!tradesResponse.ok) {
        throw new Error("Failed to fetch trades");
      }
      const tradesData = await tradesResponse.json();
      setTrades(tradesData.trades || []);

      // Fetch settings
      const settingsResponse = await fetch("/api/journal/settings", {
        headers,
      });
      if (!settingsResponse.ok) {
        throw new Error("Failed to fetch settings");
      }
      const settingsData = await settingsResponse.json();
      setSettings(settingsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  const startingBalance = settings?.startingBalance?.toNumber() || 0;

  return (
    <Box>
      {/* Top Stats */}
      <Box sx={{ mb: 3 }}>
        <JournalStats refreshTrigger={refreshTrigger} />
      </Box>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Equity Curve - Full Width */}
        <Grid item xs={12}>
          <EquityCurveChart trades={trades} startingBalance={startingBalance} />
        </Grid>

        {/* Win/Loss and P/L Distribution */}
        <Grid item xs={12} md={6}>
          <WinLossChart trades={trades} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PLDistributionChart trades={trades} />
        </Grid>

        {/* Market Performance - Full Width */}
        <Grid item xs={12}>
          <MarketPerformanceChart trades={trades} />
        </Grid>

        {/* Discipline Chart - Full Width */}
        <Grid item xs={12}>
          <DisciplineChart trades={trades} />
        </Grid>
      </Grid>
    </Box>
  );
}
