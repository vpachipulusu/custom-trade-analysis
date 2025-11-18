"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Paper,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Trade } from "@prisma/client";
import { useJournal } from "@/contexts/JournalContext";
import { getCurrencySymbol } from "@/lib/utils/currency";

interface WinLossChartProps {
  trades: Trade[];
}

type ViewMode = "count" | "amount";

export default function WinLossChart({ trades }: WinLossChartProps) {
  const { currency } = useJournal();
  const [viewMode, setViewMode] = React.useState<ViewMode>("count");

  const closedTrades = trades.filter(
    (t) => t.status === "closed" && t.closedPositionPL !== null
  );

  // Helper to safely convert Decimal to number
  const toNum = (val: any) =>
    typeof val === "number" ? val : val?.toNumber?.() || 0;

  // Calculate statistics
  const wins = closedTrades.filter((t) => toNum(t.closedPositionPL) > 0);
  const losses = closedTrades.filter((t) => toNum(t.closedPositionPL) < 0);
  const breakeven = closedTrades.filter((t) => toNum(t.closedPositionPL) === 0);

  const totalWinAmount = wins.reduce(
    (sum, t) => sum + toNum(t.closedPositionPL),
    0
  );
  const totalLossAmount = Math.abs(
    losses.reduce((sum, t) => sum + toNum(t.closedPositionPL), 0)
  );

  const data =
    viewMode === "count"
      ? [
          { name: "Wins", value: wins.length, color: "#4caf50" },
          { name: "Losses", value: losses.length, color: "#f44336" },
          { name: "Break-Even", value: breakeven.length, color: "#ff9800" },
        ]
      : [
          { name: "Total Wins", value: totalWinAmount, color: "#4caf50" },
          { name: "Total Losses", value: totalLossAmount, color: "#f44336" },
        ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: "1px solid #ccc" }}>
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2" color="primary">
            {viewMode === "count"
              ? `${data.value} trades`
              : `${getCurrencySymbol(currency)}${data.value.toFixed(2)}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (closedTrades.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Win/Loss Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No closed trades yet. Your win/loss distribution will appear here once
          you close trades.
        </Typography>
      </Paper>
    );
  }

  const winRate =
    closedTrades.length > 0
      ? ((wins.length / closedTrades.length) * 100).toFixed(1)
      : "0.0";

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Win/Loss Distribution</Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="count">Count</ToggleButton>
          <ToggleButton value="amount">Amount</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                viewMode === "count"
                  ? value.toString()
                  : `${getCurrencySymbol(currency)}${value}`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Summary statistics */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" color="success.main" fontWeight="bold">
            {wins.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Wins
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" color="error.main" fontWeight="bold">
            {losses.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Losses
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" color="warning.main" fontWeight="bold">
            {breakeven.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Break-Even
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" color="primary" fontWeight="bold">
            {winRate}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Win Rate
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
