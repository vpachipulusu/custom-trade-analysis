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

interface InstrumentPerformanceChartProps {
  trades: Trade[];
}

type ViewMode = "pl" | "winrate" | "count";

interface InstrumentStats {
  instrument: string;
  totalPL: number;
  tradeCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPL: number;
}

export default function InstrumentPerformanceChart({
  trades,
}: InstrumentPerformanceChartProps) {
  const { currency } = useJournal();
  const symbol = getCurrencySymbol(currency);
  const [viewMode, setViewMode] = React.useState<ViewMode>("pl");

  const closedTrades = trades.filter(
    (t) => t.status === "closed" && t.closedPositionPL !== null
  );

  // Helper to safely convert Decimal to number
  const toNum = (val: any) =>
    typeof val === "number" ? val : val?.toNumber?.() || 0;

  // Group trades by instrument
  const instrumentMap = new Map<string, InstrumentStats>();

  closedTrades.forEach((trade) => {
    const instrument = trade.market;
    const pl = toNum(trade.closedPositionPL);

    if (!instrumentMap.has(instrument)) {
      instrumentMap.set(instrument, {
        instrument,
        totalPL: 0,
        tradeCount: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgPL: 0,
      });
    }

    const stats = instrumentMap.get(instrument)!;
    stats.totalPL += pl;
    stats.tradeCount++;

    if (pl > 0) stats.wins++;
    else if (pl < 0) stats.losses++;
  });

  // Calculate derived metrics
  instrumentMap.forEach((stats) => {
    stats.winRate =
      stats.tradeCount > 0 ? (stats.wins / stats.tradeCount) * 100 : 0;
    stats.avgPL = stats.tradeCount > 0 ? stats.totalPL / stats.tradeCount : 0;
  });

  // Convert to array and sort by total P/L (descending)
  const data = Array.from(instrumentMap.values())
    .sort((a, b) => b.totalPL - a.totalPL)
    .slice(0, 10); // Top 10 instruments

  const getDataKey = () => {
    switch (viewMode) {
      case "pl":
        return "totalPL";
      case "winrate":
        return "winRate";
      case "count":
        return "tradeCount";
    }
  };

  const getYAxisFormatter = (value: number) => {
    switch (viewMode) {
      case "pl":
        return `${symbol}${value.toFixed(0)}`;
      case "winrate":
        return `${value.toFixed(0)}%`;
      case "count":
        return value.toString();
    }
  };

  const getBarColor = (value: number, mode: ViewMode) => {
    if (mode === "pl") {
      return value >= 0 ? "#4caf50" : "#f44336";
    }
    if (mode === "winrate") {
      if (value >= 60) return "#4caf50";
      if (value >= 40) return "#ff9800";
      return "#f44336";
    }
    return "#2196f3";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: InstrumentStats = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: "1px solid #ccc" }}>
          <Typography variant="body2" fontWeight="bold">
            {data.instrument}
          </Typography>
          <Typography
            variant="body2"
            color={data.totalPL >= 0 ? "success.main" : "error.main"}
          >
            Total P/L: {data.totalPL >= 0 ? "+" : ""}
            {symbol}
            {data.totalPL.toFixed(2)}
          </Typography>
          <Typography variant="body2">Trades: {data.tradeCount}</Typography>
          <Typography variant="body2">
            Win Rate: {data.winRate.toFixed(1)}%
          </Typography>
          <Typography variant="body2">
            Avg P/L: {data.avgPL >= 0 ? "+" : ""}
            {symbol}
            {data.avgPL.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.wins}W / {data.losses}L
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
          Performance by Instrument
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No closed trades yet. Your performance by instrument will appear here once
          you close trades.
        </Typography>
      </Paper>
    );
  }

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
        <Typography variant="h6">Performance by Instrument</Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="pl">P/L</ToggleButton>
          <ToggleButton value="winrate">Win Rate</ToggleButton>
          <ToggleButton value="count">Count</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Top {data.length} most traded instruments
      </Typography>

      <Box sx={{ width: "100%", height: 400, mt: 2 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="instrument"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={getYAxisFormatter} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={getDataKey()} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(
                    viewMode === "pl"
                      ? entry.totalPL
                      : viewMode === "winrate"
                      ? entry.winRate
                      : entry.tradeCount,
                    viewMode
                  )}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Summary stats */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" fontWeight="bold" color="success.main">
            {data.filter((m) => m.totalPL > 0).length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Profitable Instruments
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" fontWeight="bold" color="error.main">
            {data.filter((m) => m.totalPL < 0).length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Losing Instruments
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" fontWeight="bold">
            {data.length > 0 ? data[0].instrument : "N/A"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Best Instrument
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
