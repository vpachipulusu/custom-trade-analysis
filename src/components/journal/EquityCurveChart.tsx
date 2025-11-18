"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Scatter,
} from "recharts";
import { Paper, Typography, Box } from "@mui/material";
import { Trade } from "@prisma/client";
import { useJournal } from "@/contexts/JournalContext";
import { getCurrencySymbol } from "@/lib/utils/currency";

interface EquityCurveChartProps {
  trades: Trade[];
  startingBalance: number;
}

interface DataPoint {
  date: string;
  balance: number;
  tradeType?: "win" | "loss" | "breakeven";
  pl?: number;
  peak?: number;
  drawdown?: number;
}

export default function EquityCurveChart({
  trades,
  startingBalance,
}: EquityCurveChartProps) {
  const { currency } = useJournal();
  const symbol = getCurrencySymbol(currency);

  // Helper to safely convert Decimal/string to number
  const toNum = (val: any) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseFloat(val) || 0;
    if (val.toNumber) return val.toNumber();
    return 0;
  };

  // Sort trades by date and time
  const sortedTrades = [...trades]
    .filter(
      (t) =>
        t.status === "closed" &&
        t.closedPositionPL !== null &&
        t.closedPositionPL !== undefined
    )
    .sort((a, b) => {
      const dateA = new Date(`${a.exitDate || a.date}T${a.exitTime || a.time}`);
      const dateB = new Date(`${b.exitDate || b.date}T${b.exitTime || b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

  // Build data points
  const data: DataPoint[] = [];
  let runningBalance = startingBalance;
  let peakBalance = startingBalance;

  // Add starting point
  data.push({
    date: "Start",
    balance: startingBalance,
    peak: startingBalance,
    drawdown: 0,
  });

  sortedTrades.forEach((trade) => {
    const pl = toNum(trade.closedPositionPL);
    runningBalance += pl;

    // Track peak for drawdown calculation
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }

    const drawdown = peakBalance - runningBalance;

    const tradeType: "win" | "loss" | "breakeven" =
      pl > 0 ? "win" : pl < 0 ? "loss" : "breakeven";

    data.push({
      date: new Date(trade.exitDate || trade.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      balance: runningBalance,
      tradeType,
      pl,
      peak: peakBalance,
      drawdown,
    });
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: "1px solid #ccc" }}>
          <Typography variant="body2" fontWeight="bold">
            {data.date}
          </Typography>
          <Typography variant="body2" color="primary">
            Balance: {symbol}
            {data.balance.toFixed(2)}
          </Typography>
          {data.pl !== undefined && (
            <Typography
              variant="body2"
              color={data.pl >= 0 ? "success.main" : "error.main"}
            >
              Trade P/L: {data.pl >= 0 ? "+" : ""}
              {symbol}
              {data.pl.toFixed(2)}
            </Typography>
          )}
          {data.drawdown > 0 && (
            <Typography variant="body2" color="warning.main">
              Drawdown: -{symbol}
              {data.drawdown.toFixed(2)}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.tradeType) return null;

    const colors: Record<"win" | "loss" | "breakeven", string> = {
      win: "#4caf50",
      loss: "#f44336",
      breakeven: "#ff9800",
    };

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={colors[payload.tradeType as "win" | "loss" | "breakeven"]}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  };

  if (data.length <= 1) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Equity Curve
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No closed trades yet. Your equity curve will appear here once you
          close trades.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Equity Curve
      </Typography>
      <Box sx={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${symbol}${value.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Drawdown area (filled) */}
            <Area
              type="monotone"
              dataKey="drawdown"
              fill="#ffccbc"
              stroke="none"
              fillOpacity={0.3}
              name="Drawdown"
            />

            {/* Peak balance line */}
            <Line
              type="monotone"
              dataKey="peak"
              stroke="#90a4ae"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Peak"
            />

            {/* Main equity curve */}
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#2196f3"
              strokeWidth={2}
              dot={<CustomDot />}
              name="Account Balance"
            />

            {/* Starting balance reference line */}
            <ReferenceLine
              y={startingBalance}
              stroke="#9e9e9e"
              strokeDasharray="3 3"
              label={{
                value: "Start",
                position: "insideTopRight",
                fontSize: 10,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Legend explanation */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: "#4caf50",
              border: "1px solid #fff",
            }}
          />
          <Typography variant="caption">Winning Trade</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: "#f44336",
              border: "1px solid #fff",
            }}
          />
          <Typography variant="caption">Losing Trade</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: "#ff9800",
              border: "1px solid #fff",
            }}
          />
          <Typography variant="caption">Break-Even Trade</Typography>
        </Box>
      </Box>
    </Paper>
  );
}
