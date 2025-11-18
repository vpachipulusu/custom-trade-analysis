"use client";

import { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyStats {
  month: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: string;
  averageWin?: string;
  averageLoss?: string;
  largestWin?: string;
  largestLoss?: string;
  totalTradeCosts: string;
  totalPL: string;
  averagePLPerTrade?: string;
  averageRiskPerTrade?: string;
  averageRewardPerTrade?: string;
  averageRiskRewardRatio?: string;
}

interface Props {
  refreshTrigger?: number;
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function MonthlyAnalysisTable({ refreshTrigger }: Props) {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthlyStats[]>([]);

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    fetchStats();
  }, [year, refreshTrigger]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/journal/stats?type=monthly&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");

      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const getMonthStats = (month: number) => {
    return stats.find((s) => s.month === month);
  };

  const formatCurrency = (value: string | undefined | null) => {
    if (!value) return "-";
    return `£${parseFloat(value).toFixed(2)}`;
  };

  const formatPercent = (value: string | undefined | null) => {
    if (!value) return "-";
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const getCellColor = (value: string | undefined | null) => {
    if (!value) return {};
    const num = parseFloat(value);
    if (num > 0) return { color: "success.main", fontWeight: "bold" };
    if (num < 0) return { color: "error.main", fontWeight: "bold" };
    return {};
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

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Month-on-Month Analysis</Typography>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={year}
            label="Year"
            onChange={(e) => setYear(e.target.value as number)}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>
                Metric
              </TableCell>
              {monthNames.map((month) => (
                <TableCell
                  key={month}
                  align="center"
                  sx={{ fontWeight: "bold", minWidth: 80 }}
                >
                  {month}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Total Trades */}
            <TableRow>
              <TableCell>Total Trades</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell key={index} align="center">
                    {monthStats?.totalTrades || "-"}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Winning Trades */}
            <TableRow
              sx={{
                bgcolor: "success.light",
                bgcolor: "rgba(46, 125, 50, 0.05)",
              }}
            >
              <TableCell>Winning Trades</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell key={index} align="center">
                    {monthStats?.winningTrades || "-"}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Losing Trades */}
            <TableRow sx={{ bgcolor: "rgba(211, 47, 47, 0.05)" }}>
              <TableCell>Losing Trades</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell key={index} align="center">
                    {monthStats?.losingTrades || "-"}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Win Rate */}
            <TableRow>
              <TableCell>Win Rate</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell key={index} align="center">
                    {formatPercent(monthStats?.winRate)}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Average Win */}
            <TableRow>
              <TableCell>Average Win</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell
                    key={index}
                    align="center"
                    sx={getCellColor(monthStats?.averageWin)}
                  >
                    {formatCurrency(monthStats?.averageWin)}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Average Loss */}
            <TableRow>
              <TableCell>Average Loss</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell
                    key={index}
                    align="center"
                    sx={getCellColor(monthStats?.averageLoss)}
                  >
                    {formatCurrency(monthStats?.averageLoss)}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Total P/L */}
            <TableRow sx={{ bgcolor: "background.default" }}>
              <TableCell sx={{ fontWeight: "bold" }}>Total P/L</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell
                    key={index}
                    align="center"
                    sx={{
                      ...getCellColor(monthStats?.totalPL),
                      fontWeight: "bold",
                    }}
                  >
                    {formatCurrency(monthStats?.totalPL)}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Average P/L Per Trade */}
            <TableRow>
              <TableCell>Avg P/L Per Trade</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell
                    key={index}
                    align="center"
                    sx={getCellColor(monthStats?.averagePLPerTrade)}
                  >
                    {formatCurrency(monthStats?.averagePLPerTrade)}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Trade Costs */}
            <TableRow>
              <TableCell>Total Costs</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell key={index} align="center">
                    {formatCurrency(monthStats?.totalTradeCosts)}
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Avg Risk:Reward */}
            <TableRow>
              <TableCell>Avg Risk:Reward</TableCell>
              {monthNames.map((_, index) => {
                const monthStats = getMonthStats(index + 1);
                return (
                  <TableCell key={index} align="center">
                    {monthStats?.averageRiskRewardRatio || "-"}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
