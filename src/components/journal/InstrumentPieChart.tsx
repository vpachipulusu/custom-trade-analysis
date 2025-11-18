"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Paper, Typography, Box } from "@mui/material";
import { Trade } from "@prisma/client";

interface InstrumentPieChartProps {
  trades: Trade[];
}

interface InstrumentData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: any; // Add index signature for recharts compatibility
}

const COLORS = [
  "#2196f3",
  "#4caf50",
  "#ff9800",
  "#f44336",
  "#9c27b0",
  "#00bcd4",
  "#ffeb3b",
  "#e91e63",
  "#3f51b5",
  "#8bc34a",
];

export default function InstrumentPieChart({
  trades,
}: InstrumentPieChartProps) {
  const closedTrades = trades.filter((t) => t.status === "closed");

  // Group trades by instrument
  const instrumentMap = new Map<string, number>();

  closedTrades.forEach((trade) => {
    const instrument = trade.market || "Unknown";
    instrumentMap.set(instrument, (instrumentMap.get(instrument) || 0) + 1);
  });

  const totalTrades = closedTrades.length;

  // Convert to array and calculate percentages
  const data: InstrumentData[] = Array.from(instrumentMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      percentage: totalTrades > 0 ? (value / totalTrades) * 100 : 0,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: "1px solid #ccc" }}>
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2" color="primary">
            {data.value} trades ({data.percentage.toFixed(1)}%)
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (closedTrades.length === 0) {
    return (
      <Paper sx={{ p: 3, height: "100%" }}>
        <Typography variant="h6" gutterBottom>
          Instrument Distribution
        </Typography>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight="300px"
        >
          <Typography variant="body2" color="text.secondary">
            No closed trades to display
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Instrument Distribution
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Trade count by instrument ({totalTrades} total trades)
      </Typography>

      <Box sx={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) =>
                props.percentage > 5
                  ? `${props.name} ${props.percentage.toFixed(0)}%`
                  : ""
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) =>
                `${value} (${entry.payload.value} trades)`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
