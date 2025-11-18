"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Divider,
  Rating,
  Paper,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { format } from "date-fns";
import Image from "next/image";
import { useJournal } from "@/contexts/JournalContext";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils/currency";

interface Trade {
  id: string;
  date: string;
  time: string;
  direction: string;
  market: string;
  entryPrice: string;
  accountBalance: string;
  positionSize: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  actualExitPrice?: string;
  exitDate?: string;
  exitTime?: string;
  tradeCosts: string;
  riskRewardRatio?: string;
  closedPositionPL?: string;
  accountChangePercent?: string;
  tradeScreenshot?: string;
  tradeNotes?: string;
  disciplineRating?: number;
  emotionalState?: string;
  strategy?: string;
  setup?: string;
  status: string;
  analysis?: any;
}

interface Props {
  open: boolean;
  trade: Trade;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function TradeDetailsDialog({ open, trade, onClose }: Props) {
  const { currency } = useJournal();

  const formatCurrency = (value: string | undefined) => {
    return formatCurrencyUtil(value, currency);
  };

  const formatPrice = (value: string | undefined) => {
    if (!value) return "N/A";
    return parseFloat(value).toFixed(5);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                bgcolor:
                  trade.direction === "Long" ? "success.main" : "error.main",
                color: "white",
                p: 1.5,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
              }}
            >
              {trade.direction === "Long" ? (
                <TrendingUpIcon fontSize="large" />
              ) : (
                <TrendingDownIcon fontSize="large" />
              )}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {trade.market}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(trade.date), "MMMM dd, yyyy")} at {trade.time}
              </Typography>
            </Box>
          </Stack>
          <Chip
            label={trade.status.toUpperCase()}
            color={trade.status === "open" ? "warning" : "success"}
            sx={{ fontWeight: "bold", px: 2 }}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* P/L Summary Card - Only for closed trades */}
          {trade.status === "closed" && (
            <Card
              sx={{
                mb: 3,
                background:
                  trade.closedPositionPL &&
                  parseFloat(trade.closedPositionPL) >= 0
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
              }}
            >
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Profit/Loss
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {formatCurrency(trade.closedPositionPL)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Account Change
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {trade.accountChangePercent
                        ? `${parseFloat(trade.accountChangePercent).toFixed(
                            2
                          )}%`
                        : "N/A"}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Main Trade Information */}
          <Grid container spacing={3}>
            {/* Entry Information Card */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ShowChartIcon color="primary" />
                  Entry Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Entry Price
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatPrice(trade.entryPrice)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Position Size
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {parseFloat(trade.positionSize).toFixed(4)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Account Balance
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(trade.accountBalance)}
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Stop Loss
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatPrice(trade.stopLossPrice)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Take Profit
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatPrice(trade.takeProfitPrice)}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Risk:Reward Ratio
                    </Typography>
                    <Chip
                      label={trade.riskRewardRatio || "N/A"}
                      color="primary"
                      variant="outlined"
                      sx={{ mt: 0.5, fontWeight: "bold" }}
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Exit Information Card */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <AccountBalanceIcon color="secondary" />
                  {trade.status === "closed" ? "Exit Details" : "Trade Status"}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {trade.status === "closed" ? (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Exit Date & Time
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          icon={<CalendarTodayIcon />}
                          label={
                            trade.exitDate
                              ? format(new Date(trade.exitDate), "dd/MM/yyyy")
                              : "N/A"
                          }
                          size="small"
                        />
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={trade.exitTime || "N/A"}
                          size="small"
                        />
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Exit Price
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {formatPrice(trade.actualExitPrice)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Trade Costs
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="error">
                        {formatCurrency(trade.tradeCosts)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Net Profit/Loss
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color={
                          trade.closedPositionPL &&
                          parseFloat(trade.closedPositionPL) >= 0
                            ? "success.main"
                            : "error.main"
                        }
                      >
                        {formatCurrency(trade.closedPositionPL)}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 4,
                    }}
                  >
                    <Typography variant="h6" color="warning.main" gutterBottom>
                      Trade Still Open
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Exit details will be available once the trade is closed.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Trade Analysis Card */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Trade Analysis & Psychology
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={3}>
                  {trade.strategy && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Strategy
                      </Typography>
                      <Chip
                        label={trade.strategy}
                        color="primary"
                        sx={{ fontWeight: "medium" }}
                      />
                    </Grid>
                  )}
                  {trade.setup && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Setup
                      </Typography>
                      <Chip
                        label={trade.setup}
                        color="secondary"
                        sx={{ fontWeight: "medium" }}
                      />
                    </Grid>
                  )}
                  {trade.emotionalState && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Emotional State
                      </Typography>
                      <Chip
                        label={trade.emotionalState}
                        variant="outlined"
                        sx={{ fontWeight: "medium" }}
                      />
                    </Grid>
                  )}
                  {trade.disciplineRating && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Discipline Rating
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating
                          value={trade.disciplineRating}
                          max={10}
                          readOnly
                          size="small"
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {trade.disciplineRating}/10
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {trade.tradeNotes && (
                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Trade Notes
                      </Typography>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "background.default",
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {trade.tradeNotes}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>

            {/* Chart Screenshot */}
            {trade.tradeScreenshot && (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Chart Screenshot
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box
                    sx={{
                      mt: 2,
                      textAlign: "center",
                      bgcolor: "background.default",
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Image
                      src={trade.tradeScreenshot}
                      alt="Trade Screenshot"
                      width={800}
                      height={500}
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: 8,
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Linked Analysis */}
            {trade.analysis && (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Linked Analysis
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "primary.main",
                      color: "white",
                      borderRadius: 2,
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Action
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {trade.analysis.action}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Confidence
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {trade.analysis.confidence}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined" size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
