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
  ReferenceLine,
} from "recharts";
import { Paper, Typography, Box } from "@mui/material";
import { Trade } from "@prisma/client";
import { useJournal } from "@/contexts/JournalContext";
import { getCurrencySymbol } from "@/lib/utils/currency";

interface PLDistributionChartProps {
  trades: Trade[];
}

interface BucketData {
  range: string;
  count: number;
  minValue: number;
  totalPL: number;
}

export default function PLDistributionChart({
  trades,
}: PLDistributionChartProps) {
  const { currency } = useJournal();
  const symbol = getCurrencySymbol(currency);

  const closedTrades = trades.filter(
    (t) =>
      t.status === "closed" &&
      t.closedPositionPL !== null &&
      t.closedPositionPL !== undefined
  );

  // Helper to safely convert Decimal/string to number
  const toNum = (val: any) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseFloat(val) || 0;
    if (val.toNumber) return val.toNumber();
    return 0;
  };

  // Define P/L buckets with dynamic currency symbol
  const buckets: BucketData[] = [
    { range: `< -${symbol}500`, count: 0, minValue: -Infinity, totalPL: 0 },
    {
      range: `-${symbol}500 to -${symbol}250`,
      count: 0,
      minValue: -500,
      totalPL: 0,
    },
    {
      range: `-${symbol}250 to -${symbol}100`,
      count: 0,
      minValue: -250,
      totalPL: 0,
    },
    {
      range: `-${symbol}100 to -${symbol}50`,
      count: 0,
      minValue: -100,
      totalPL: 0,
    },
    {
      range: `-${symbol}50 to ${symbol}0`,
      count: 0,
      minValue: -50,
      totalPL: 0,
    },
    { range: `${symbol}0 to ${symbol}50`, count: 0, minValue: 0, totalPL: 0 },
    {
      range: `${symbol}50 to ${symbol}100`,
      count: 0,
      minValue: 50,
      totalPL: 0,
    },
    {
      range: `${symbol}100 to ${symbol}250`,
      count: 0,
      minValue: 100,
      totalPL: 0,
    },
    {
      range: `${symbol}250 to ${symbol}500`,
      count: 0,
      minValue: 250,
      totalPL: 0,
    },
    { range: `> ${symbol}500`, count: 0, minValue: 500, totalPL: 0 },
  ];

  // Categorize trades into buckets
  closedTrades.forEach((trade) => {
    const pl = toNum(trade.closedPositionPL);

    if (pl < -500) {
      buckets[0].count++;
      buckets[0].totalPL += pl;
    } else if (pl >= -500 && pl < -250) {
      buckets[1].count++;
      buckets[1].totalPL += pl;
    } else if (pl >= -250 && pl < -100) {
      buckets[2].count++;
      buckets[2].totalPL += pl;
    } else if (pl >= -100 && pl < -50) {
      buckets[3].count++;
      buckets[3].totalPL += pl;
    } else if (pl >= -50 && pl < 0) {
      buckets[4].count++;
      buckets[4].totalPL += pl;
    } else if (pl >= 0 && pl < 50) {
      buckets[5].count++;
      buckets[5].totalPL += pl;
    } else if (pl >= 50 && pl < 100) {
      buckets[6].count++;
      buckets[6].totalPL += pl;
    } else if (pl >= 100 && pl < 250) {
      buckets[7].count++;
      buckets[7].totalPL += pl;
    } else if (pl >= 250 && pl < 500) {
      buckets[8].count++;
      buckets[8].totalPL += pl;
    } else {
      buckets[9].count++;
      buckets[9].totalPL += pl;
    }
  });

  const getBarColor = (minValue: number) => {
    if (minValue < 0) return "#f44336"; // Red for losses
    if (minValue === 0) return "#ff9800"; // Orange for break-even area
    return "#4caf50"; // Green for wins
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: "1px solid #ccc" }}>
          <Typography variant="body2" fontWeight="bold">
            {data.range}
          </Typography>
          <Typography variant="body2" color="primary">
            {data.count} trades
          </Typography>
          <Typography
            variant="body2"
            color={data.totalPL >= 0 ? "success.main" : "error.main"}
          >
            Total: {data.totalPL >= 0 ? "+" : ""}${data.totalPL.toFixed(2)}
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
          P/L Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No closed trades yet. Your P/L distribution histogram will appear here
          once you close trades.
        </Typography>
      </Paper>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        P/L Distribution
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Histogram showing how your trade results are distributed across P/L
        ranges
      </Typography>

      <Box sx={{ width: "100%", height: 400, mt: 2 }}>
        <ResponsiveContainer>
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{
                value: "Number of Trades",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={4.5} stroke="#666" strokeDasharray="3 3" />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {buckets.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.minValue)}
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
          <Typography variant="body1" fontWeight="bold">
            {buckets
              .filter((b) => b.minValue < 0)
              .reduce((sum, b) => sum + b.count, 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Losing Trades
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" fontWeight="bold">
            {buckets
              .filter((b) => b.minValue >= 0)
              .reduce((sum, b) => sum + b.count, 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Winning Trades
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" fontWeight="bold">
            {Math.max(...buckets.map((b) => b.count))}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Most Common Bucket
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
