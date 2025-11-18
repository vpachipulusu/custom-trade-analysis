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
} from "@mui/material";
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Trade Details</Typography>
          <Chip
            label={trade.status}
            color={trade.status === "open" ? "warning" : "default"}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Basic Info */}
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {format(new Date(trade.date), "dd/MM/yyyy")}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Time
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {trade.time}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Direction
              </Typography>
              <Chip
                label={trade.direction}
                size="small"
                color={trade.direction === "Long" ? "success" : "error"}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Instrument
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {trade.market}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Entry Details */}
          <Typography variant="h6" gutterBottom>
            Entry Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Entry Price
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatPrice(trade.entryPrice)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Position Size
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {parseFloat(trade.positionSize).toFixed(4)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Account Balance
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatCurrency(trade.accountBalance)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Stop Loss
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatPrice(trade.stopLossPrice)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Take Profit
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatPrice(trade.takeProfitPrice)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                R:R Ratio
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {trade.riskRewardRatio || "N/A"}
              </Typography>
            </Grid>
          </Grid>

          {trade.status === "closed" && (
            <>
              <Divider sx={{ my: 2 }} />

              {/* Exit Details */}
              <Typography variant="h6" gutterBottom>
                Exit Details
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Exit Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {trade.exitDate
                      ? format(new Date(trade.exitDate), "dd/MM/yyyy")
                      : "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Exit Time
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {trade.exitTime || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Exit Price
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatPrice(trade.actualExitPrice)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Trade Costs
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(trade.tradeCosts)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Closed P/L
                  </Typography>
                  <Typography
                    variant="h6"
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
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Account Change
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={
                      trade.accountChangePercent &&
                      parseFloat(trade.accountChangePercent) >= 0
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {trade.accountChangePercent
                      ? `${parseFloat(trade.accountChangePercent).toFixed(2)}%`
                      : "N/A"}
                  </Typography>
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Trade Analysis */}
          <Typography variant="h6" gutterBottom>
            Trade Analysis
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {trade.strategy && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Strategy
                </Typography>
                <Chip label={trade.strategy} size="small" />
              </Grid>
            )}
            {trade.setup && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Setup
                </Typography>
                <Chip label={trade.setup} size="small" />
              </Grid>
            )}
            {trade.disciplineRating && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Discipline Rating
                </Typography>
                <Rating value={trade.disciplineRating} max={10} readOnly />
              </Grid>
            )}
            {trade.emotionalState && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Emotional State
                </Typography>
                <Typography variant="body1">{trade.emotionalState}</Typography>
              </Grid>
            )}
            {trade.tradeNotes && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Trade Notes
                </Typography>
                <Box
                  sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {trade.tradeNotes}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          {trade.tradeScreenshot && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Chart Screenshot
              </Typography>
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Image
                  src={trade.tradeScreenshot}
                  alt="Trade Screenshot"
                  width={600}
                  height={400}
                  style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
                />
              </Box>
            </>
          )}

          {trade.analysis && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Linked Analysis
              </Typography>
              <Box
                sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}
              >
                <Typography variant="body2">
                  Action: <strong>{trade.analysis.action}</strong> | Confidence:{" "}
                  <strong>{trade.analysis.confidence}%</strong>
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
