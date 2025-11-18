"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  Divider,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

interface Trade {
  id: string;
  direction: string;
  market: string;
  entryPrice: string;
  positionSize: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  tradeCosts: string;
  accountBalance: string;
}

interface Props {
  open: boolean;
  trade: Trade;
  onClose: () => void;
  onTradeClosed: () => void;
}

export default function CloseTradeDialog({
  open,
  trade,
  onClose,
  onTradeClosed,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitDate, setExitDate] = useState<Date | null>(new Date());
  const [exitTime, setExitTime] = useState<Date | null>(new Date());
  const [actualExitPrice, setActualExitPrice] = useState("");

  const calculatePL = () => {
    if (!actualExitPrice) return null;

    const entryPrice = parseFloat(trade.entryPrice);
    const exitPrice = parseFloat(actualExitPrice);
    const positionSize = parseFloat(trade.positionSize);
    const tradeCosts = parseFloat(trade.tradeCosts);

    let pl: number;
    if (trade.direction === "Long") {
      pl = (exitPrice - entryPrice) * positionSize - tradeCosts;
    } else {
      pl = (entryPrice - exitPrice) * positionSize - tradeCosts;
    }

    const accountBalance = parseFloat(trade.accountBalance);
    const changePercent = (pl / accountBalance) * 100;

    return { pl, changePercent };
  };

  const handleSubmit = async () => {
    if (!exitDate || !exitTime || !actualExitPrice) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timeStr = exitTime.toTimeString().split(" ")[0].substring(0, 5);

      const res = await fetch(`/api/journal/trades/${trade.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualExitPrice: parseFloat(actualExitPrice),
          exitDate: exitDate.toISOString(),
          exitTime: timeStr,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to close trade");
      }

      onTradeClosed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close trade");
    } finally {
      setLoading(false);
    }
  };

  const plResult = calculatePL();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Close Trade</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Trade Summary */}
          <Box
            sx={{ mb: 3, p: 2, bgcolor: "background.default", borderRadius: 1 }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Trade Summary
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2">Market:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  {trade.market}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">Direction:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  {trade.direction}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">Entry Price:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  {parseFloat(trade.entryPrice).toFixed(5)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">Position Size:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  {parseFloat(trade.positionSize).toFixed(4)}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Exit Date *"
                  value={exitDate}
                  onChange={(newValue) => setExitDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Exit Time *"
                  value={exitTime}
                  onChange={(newValue) => setExitTime(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Exit Price *"
                type="number"
                value={actualExitPrice}
                onChange={(e) => setActualExitPrice(e.target.value)}
                inputProps={{ step: "0.00001" }}
              />
            </Grid>
          </Grid>

          {plResult && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: plResult.pl >= 0 ? "success.light" : "error.light",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="h6"
                align="center"
                sx={{ color: plResult.pl >= 0 ? "success.dark" : "error.dark" }}
              >
                P/L: £{plResult.pl.toFixed(2)}
              </Typography>
              <Typography
                variant="body2"
                align="center"
                sx={{ color: plResult.pl >= 0 ? "success.dark" : "error.dark" }}
              >
                Account Change: {plResult.changePercent.toFixed(2)}%
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !actualExitPrice}
        >
          {loading ? "Closing..." : "Close Trade"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
