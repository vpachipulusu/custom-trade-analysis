"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BookIcon from "@mui/icons-material/Book";
import BarChartIcon from "@mui/icons-material/BarChart";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import TimelineIcon from "@mui/icons-material/Timeline";

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (startingBalance: number) => void;
}

const steps = ["Welcome", "Setup", "Get Started"];

export default function OnboardingDialog({
  open,
  onClose,
  onComplete,
}: OnboardingDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [startingBalance, setStartingBalance] = useState("10000");
  const [error, setError] = useState("");

  const handleNext = () => {
    if (activeStep === 1) {
      // Validate starting balance
      const balance = parseFloat(startingBalance);
      if (isNaN(balance) || balance <= 0) {
        setError("Please enter a valid starting balance");
        return;
      }
      setError("");
    }

    if (activeStep === steps.length - 1) {
      handleComplete();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    const balance = parseFloat(startingBalance);
    onComplete(balance);
    onClose();
  };

  const handleSkip = () => {
    onComplete(10000); // Default balance
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <BookIcon sx={{ fontSize: 80, color: "primary.main" }} />
            </Box>
            <Typography
              variant="h5"
              gutterBottom
              align="center"
              fontWeight="bold"
            >
              Welcome to Your Trading Journal!
            </Typography>
            <Typography
              variant="body1"
              paragraph
              align="center"
              color="text.secondary"
            >
              Track every trade, analyze your performance, and become a more
              disciplined trader.
            </Typography>

            <List sx={{ mt: 3 }}>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Comprehensive Trade Logging"
                  secondary="Record all trade details including entry, exit, P/L, and more"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <BarChartIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Performance Analytics"
                  secondary="Track win rate, ROI, discipline ratings, and monthly statistics"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TimelineIcon color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary="Visual Charts"
                  secondary="Equity curve, P/L distribution, market performance, and more"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <UploadFileIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Excel Import/Export"
                  secondary="Seamlessly export your data or import existing trades"
                />
              </ListItem>
            </List>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              Setup Your Trading Account
            </Typography>
            <Typography variant="body2" paragraph color="text.secondary">
              Enter your starting account balance. This will be used to track
              your account growth and calculate returns.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Starting Balance"
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="10000"
              helperText="Enter your initial account balance in your trading currency"
              sx={{ mt: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
            />

            <Alert severity="info" sx={{ mt: 3 }}>
              Don't worry, you can change this later in the journal settings.
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              You're All Set!
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Your trading journal is ready to use. Here's what you can do next:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary">
                    1
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Add Your First Trade"
                  secondary="Click the 'Add Trade' button to log your trades manually"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary">
                    2
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Import Existing Trades"
                  secondary="Have existing trades? Use Excel import to bulk upload them"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary">
                    3
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Link AI Analyses"
                  secondary="Connect your chart analyses to trade entries for complete tracking"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary">
                    4
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="Review Statistics"
                  secondary="Check the Statistics tab to see your performance metrics and charts"
                />
              </ListItem>
            </List>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2" fontWeight="bold">
                Pro Tip: Rate your discipline after each trade to identify
                patterns in your trading behavior!
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stepper activeStep={activeStep} sx={{ pt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent>{renderStepContent(activeStep)}</DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: "space-between" }}>
        <Button onClick={handleSkip} color="inherit">
          Skip
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
          <Button variant="contained" onClick={handleNext}>
            {activeStep === steps.length - 1 ? "Get Started" : "Next"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
