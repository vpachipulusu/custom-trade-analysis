"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Slider,
  Typography,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onTradeAdded: () => void;
}

const emotionalStates = [
  "Calm and Focused",
  "Confident",
  "Anxious",
  "Fearful",
  "Excited",
  "Frustrated",
  "Impatient",
  "Uncertain",
];

export default function AddTradeDialog({ open, onClose, onTradeAdded }: Props) {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  // Form state
  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<Date | null>(new Date());
  const [direction, setDirection] = useState("Long");
  const [market, setMarket] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [tradeCosts, setTradeCosts] = useState("0");
  const [tradeNotes, setTradeNotes] = useState("");
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [emotionalState, setEmotionalState] = useState("");
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");

  const steps = ["Basic Info", "Entry Details", "Trade Management"];

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setActiveStep(0);
      setError(null);
      setDate(new Date());
      setTime(new Date());
      setDirection("Long");
      setMarket("");
      setEntryPrice("");
      setPositionSize("");
      setStopLossPrice("");
      setTakeProfitPrice("");
      setTradeCosts("0");
      setTradeNotes("");
      setDisciplineRating(5);
      setEmotionalState("");
      setStrategy("");
      setSetup("");

      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/journal/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // Convert Decimal to string
        setAccountBalance(String(data.currentBalance || ""));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const calculateRiskReward = () => {
    if (!entryPrice || !stopLossPrice || !takeProfitPrice || !positionSize)
      return null;

    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLossPrice);
    const target = parseFloat(takeProfitPrice);
    const size = parseFloat(positionSize);

    const risk = Math.abs(entry - stop) * size;
    const reward = Math.abs(target - entry) * size;

    if (risk === 0) return null;

    const ratio = reward / risk;
    return `1:${ratio.toFixed(2)}`;
  };

  const handleNext = () => {
    // Validate step before moving forward
    if (activeStep === 0) {
      // Step 1: Basic Info validation
      if (!date || !time || !market) {
        setError("Please fill in all required fields in this step");
        return;
      }
    } else if (activeStep === 1) {
      // Step 2: Entry Details validation
      if (!entryPrice || !accountBalance || !positionSize) {
        setError("Please fill in all required fields in this step");
        return;
      }
    }

    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = [];
    if (!date) missingFields.push("Date");
    if (!time) missingFields.push("Time");
    if (!market) missingFields.push("Market");
    if (!entryPrice) missingFields.push("Entry Price");
    if (!accountBalance) missingFields.push("Account Balance");
    if (!positionSize) missingFields.push("Position Size");

    if (missingFields.length > 0) {
      setError(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timeStr = time.toTimeString().split(" ")[0].substring(0, 5);
      const riskReward = calculateRiskReward();

      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/journal/trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: date.toISOString(),
          time: timeStr,
          direction,
          market,
          entryPrice: parseFloat(entryPrice),
          accountBalance: parseFloat(accountBalance),
          positionSize: parseFloat(positionSize),
          stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
          takeProfitPrice: takeProfitPrice
            ? parseFloat(takeProfitPrice)
            : undefined,
          tradeCosts: parseFloat(tradeCosts),
          riskRewardRatio: riskReward,
          tradeNotes,
          disciplineRating,
          emotionalState,
          strategy,
          setup,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create trade");
      }

      onTradeAdded();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    setDate(new Date());
    setTime(new Date());
    setDirection("Long");
    setMarket("");
    setEntryPrice("");
    setPositionSize("");
    setStopLossPrice("");
    setTakeProfitPrice("");
    setTradeCosts("0");
    setTradeNotes("");
    setDisciplineRating(5);
    setEmotionalState("");
    setStrategy("");
    setSetup("");
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date *"
                  value={date}
                  onChange={(newValue) => setDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Time *"
                  value={time}
                  onChange={(newValue) => setTime(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Direction *</FormLabel>
                <RadioGroup
                  row
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <FormControlLabel
                    value="Long"
                    control={<Radio />}
                    label="Long"
                  />
                  <FormControlLabel
                    value="Short"
                    control={<Radio />}
                    label="Short"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Market / Symbol *"
                value={market}
                onChange={(e) => setMarket(e.target.value.toUpperCase())}
                placeholder="e.g. GBPUSD, BTC, AAPL"
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Entry Price *"
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                inputProps={{ step: "0.00001" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account Balance *"
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                inputProps={{ step: "0.01" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position Size *"
                type="number"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                inputProps={{ step: "0.0001" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Trade Costs"
                type="number"
                value={tradeCosts}
                onChange={(e) => setTradeCosts(e.target.value)}
                inputProps={{ step: "0.01" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stop Loss Price"
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                inputProps={{ step: "0.00001" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Take Profit Price"
                type="number"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                inputProps={{ step: "0.00001" }}
              />
            </Grid>
            {calculateRiskReward() && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Risk:Reward Ratio: {calculateRiskReward()}
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Trade Notes"
                multiline
                rows={4}
                value={tradeNotes}
                onChange={(e) => setTradeNotes(e.target.value)}
                placeholder="Entry reasoning, setup details, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Discipline Rating (1-10)</Typography>
              <Slider
                value={disciplineRating}
                onChange={(e, newValue) =>
                  setDisciplineRating(newValue as number)
                }
                min={1}
                max={10}
                marks
                valueLabelDisplay="on"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Emotional State</InputLabel>
                <Select
                  value={emotionalState}
                  label="Emotional State"
                  onChange={(e) => setEmotionalState(e.target.value)}
                >
                  {emotionalStates.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. Breakout, Trend Following"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Setup"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                placeholder="e.g. Double Bottom, Flag Pattern"
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Trade</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? "Creating..." : "Create Trade"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
