"use client";

import React from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Paper, Typography, Box } from "@mui/material";
import { Trade } from "@prisma/client";
import { useJournal } from "@/contexts/JournalContext";
import { getCurrencySymbol } from "@/lib/utils/currency";

interface DisciplineChartProps {
  trades: Trade[];
}

interface DataPoint {
  date: string;
  disciplineRating: number | null;
  pl: number;
  fullDate: Date;
}

export default function DisciplineChart({ trades }: DisciplineChartProps) {
  const { currency } = useJournal();
  const symbol = getCurrencySymbol(currency);

  const closedTrades = trades
    .filter((t) => t.status === "closed" && t.closedPositionPL !== null)
    .sort((a, b) => {
      const dateA = new Date(`${a.exitDate || a.date}T${a.exitTime || a.time}`);
      const dateB = new Date(`${b.exitDate || b.date}T${b.exitTime || b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

  // Helper to safely convert Decimal to number
  const toNum = (val: any) =>
    typeof val === "number" ? val : val?.toNumber?.() || 0;

  // Build data points
  const data: DataPoint[] = closedTrades.map((trade) => ({
    date: new Date(trade.exitDate || trade.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    disciplineRating: trade.disciplineRating,
    pl: toNum(trade.closedPositionPL),
    fullDate: new Date(trade.exitDate || trade.date),
  }));

  // Calculate correlation
  const tradesWithRating = data.filter((d) => d.disciplineRating !== null);
  const avgDiscipline =
    tradesWithRating.length > 0
      ? tradesWithRating.reduce(
          (sum, d) => sum + (d.disciplineRating || 0),
          0
        ) / tradesWithRating.length
      : 0;

  // Calculate average P/L for different discipline levels
  const highDisciplineTrades = data.filter(
    (d) => (d.disciplineRating || 0) >= 8
  );
  const lowDisciplineTrades = data.filter(
    (d) => (d.disciplineRating || 0) < 5 && d.disciplineRating !== null
  );

  const avgPLHighDiscipline =
    highDisciplineTrades.length > 0
      ? highDisciplineTrades.reduce((sum, d) => sum + d.pl, 0) /
        highDisciplineTrades.length
      : 0;

  const avgPLLowDiscipline =
    lowDisciplineTrades.length > 0
      ? lowDisciplineTrades.reduce((sum, d) => sum + d.pl, 0) /
        lowDisciplineTrades.length
      : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: "1px solid #ccc" }}>
          <Typography variant="body2" fontWeight="bold">
            {data.date}
          </Typography>
          {data.disciplineRating !== null && (
            <Typography variant="body2" color="primary">
              Discipline: {data.disciplineRating}/10
            </Typography>
          )}
          <Typography
            variant="body2"
            color={data.pl >= 0 ? "success.main" : "error.main"}
          >
            P/L: {data.pl >= 0 ? "+" : ""}
            {symbol}
            {data.pl.toFixed(2)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  const getDisciplineColor = (rating: number | null) => {
    if (rating === null) return "#9e9e9e";
    if (rating >= 8) return "#4caf50"; // High discipline - green
    if (rating >= 5) return "#ff9800"; // Medium discipline - orange
    return "#f44336"; // Low discipline - red
  };

  if (closedTrades.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Discipline vs Performance
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No closed trades yet. Your discipline tracking will appear here once
          you close trades.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Discipline vs Performance
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Track how your discipline ratings correlate with trade outcomes
      </Typography>

      <Box sx={{ width: "100%", height: 400, mt: 2 }}>
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              label={{
                value: "Discipline (1-10)",
                angle: -90,
                position: "insideLeft",
              }}
              domain={[0, 10]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${symbol}${value}`}
              label={{
                value: `P/L (${symbol})`,
                angle: 90,
                position: "insideRight",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Average discipline reference line */}
            {tradesWithRating.length > 0 && (
              <ReferenceLine
                yAxisId="left"
                y={avgDiscipline}
                stroke="#666"
                strokeDasharray="3 3"
                label={{
                  value: `Avg: ${avgDiscipline.toFixed(1)}`,
                  position: "insideTopRight",
                  fontSize: 10,
                }}
              />
            )}

            {/* Zero P/L line */}
            <ReferenceLine
              yAxisId="right"
              y={0}
              stroke="#666"
              strokeWidth={1}
            />

            {/* P/L bars */}
            <Bar
              yAxisId="right"
              dataKey="pl"
              fill="#2196f3"
              fillOpacity={0.6}
              name="P/L"
            >
              {data.map((entry, index) => (
                <rect
                  key={`bar-${index}`}
                  fill={entry.pl >= 0 ? "#4caf50" : "#f44336"}
                  fillOpacity={0.4}
                />
              ))}
            </Bar>

            {/* Discipline line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="disciplineRating"
              stroke="#ff9800"
              strokeWidth={2}
              dot={{ fill: "#ff9800", r: 4 }}
              name="Discipline Rating"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Insights */}
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
          <Typography variant="h5" fontWeight="bold">
            {avgDiscipline.toFixed(1)}/10
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Avg Discipline
          </Typography>
        </Box>

        {highDisciplineTrades.length > 0 && (
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={avgPLHighDiscipline >= 0 ? "success.main" : "error.main"}
            >
              {avgPLHighDiscipline >= 0 ? "+" : ""}$
              {avgPLHighDiscipline.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg P/L (High Discipline ≥8)
            </Typography>
          </Box>
        )}

        {lowDisciplineTrades.length > 0 && (
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={avgPLLowDiscipline >= 0 ? "success.main" : "error.main"}
            >
              {avgPLLowDiscipline >= 0 ? "+" : ""}$
              {avgPLLowDiscipline.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg P/L (Low Discipline {"<"}5)
            </Typography>
          </Box>
        )}
      </Box>

      {/* Discipline rating legend */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{ width: 12, height: 12, bgcolor: "#4caf50", borderRadius: 1 }}
          />
          <Typography variant="caption">High (8-10)</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{ width: 12, height: 12, bgcolor: "#ff9800", borderRadius: 1 }}
          />
          <Typography variant="caption">Medium (5-7)</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{ width: 12, height: 12, bgcolor: "#f44336", borderRadius: 1 }}
          />
          <Typography variant="caption">Low ({"<"}5)</Typography>
        </Box>
      </Box>
    </Paper>
  );
}
