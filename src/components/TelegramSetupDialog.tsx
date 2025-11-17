"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface TelegramConfig {
  chatId: string;
  username?: string;
  isActive: boolean;
  includeChart: boolean;
  includeEconomic: boolean;
  notifyOnHold: boolean;
}

interface TelegramSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: TelegramConfig) => Promise<void>;
  onTest: (chatId: string) => Promise<boolean>;
  existingConfig?: TelegramConfig | null;
}

export default function TelegramSetupDialog({
  open,
  onClose,
  onSave,
  onTest,
  existingConfig,
}: TelegramSetupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const [config, setConfig] = useState<TelegramConfig>({
    chatId: "",
    username: "",
    isActive: true,
    includeChart: true,
    includeEconomic: true,
    notifyOnHold: false,
  });

  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig);
      setActiveStep(2); // Skip to settings if already configured
    }
  }, [existingConfig]);

  const handleTest = async () => {
    if (!config.chatId) {
      setError("Please enter your Chat ID");
      return;
    }

    setTesting(true);
    setError(null);
    try {
      const success = await onTest(config.chatId);
      if (success) {
        setTestSuccess(true);
        setActiveStep(2); // Move to settings step
      } else {
        setError("Failed to send test message. Please check your Chat ID.");
      }
    } catch (err: any) {
      setError(err.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave(config);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save Telegram settings");
    } finally {
      setLoading(false);
    }
  };

  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YourTradingBot";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Telegram Setup</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {testSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
            ✅ Test message sent successfully! Check your Telegram.
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1: Start Bot */}
          <Step>
            <StepLabel>Start the Telegram Bot</StepLabel>
            <StepContent>
              <Typography variant="body2" paragraph>
                1. Open Telegram and search for <strong>@{botUsername}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                2. Click <strong>START</strong> or send <code>/start</code>
              </Typography>
              <Typography variant="body2" paragraph>
                3. The bot will reply with your Chat ID
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={() => setActiveStep(1)}>
                  Next
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 2: Enter Chat ID */}
          <Step>
            <StepLabel>Enter Your Chat ID</StepLabel>
            <StepContent>
              <TextField
                fullWidth
                label="Chat ID"
                value={config.chatId}
                onChange={(e) =>
                  setConfig({ ...config, chatId: e.target.value })
                }
                placeholder="123456789"
                helperText="Copy the Chat ID from the bot's reply"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Telegram Username (Optional)"
                value={config.username}
                onChange={(e) =>
                  setConfig({ ...config, username: e.target.value })
                }
                placeholder="@username"
                sx={{ mb: 2 }}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleTest}
                  disabled={testing || !config.chatId}
                  startIcon={testing && <CircularProgress size={16} />}
                >
                  Test Connection
                </Button>
                <Button onClick={() => setActiveStep(0)} sx={{ ml: 1 }}>
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 3: Configure Settings */}
          <Step>
            <StepLabel>Alert Settings</StepLabel>
            <StepContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.isActive}
                    onChange={(e) =>
                      setConfig({ ...config, isActive: e.target.checked })
                    }
                  />
                }
                label="Enable Telegram alerts"
              />

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.includeChart}
                      onChange={(e) =>
                        setConfig({ ...config, includeChart: e.target.checked })
                      }
                    />
                  }
                  label="Include chart images"
                />
              </Box>

              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.includeEconomic}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          includeEconomic: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Include economic context"
                />
              </Box>

              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.notifyOnHold}
                      onChange={(e) =>
                        setConfig({ ...config, notifyOnHold: e.target.checked })
                      }
                    />
                  }
                  label="Send HOLD signals"
                />
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 These are global settings. You can override them per layout
                  in the automation settings.
                </Typography>
              </Alert>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !config.chatId}
          startIcon={loading && <CircularProgress size={16} />}
        >
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
}
