"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Slider,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Layout } from "@/hooks/useLayouts";

interface AutomationSettings {
  enabled: boolean;
  frequency: string;
  sendToTelegram: boolean;
  onlyOnSignalChange: boolean;
  minConfidence: number;
  sendOnHold: boolean;
}

interface AutomationSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  layout: Layout | null;
  onSave: (settings: AutomationSettings) => Promise<void>;
  existingSettings?: AutomationSettings | null;
}

export default function AutomationSettingsDialog({
  open,
  onClose,
  layout,
  onSave,
  existingSettings,
}: AutomationSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AutomationSettings>({
    enabled: false,
    frequency: "1h",
    sendToTelegram: true,
    onlyOnSignalChange: false,
    minConfidence: 50,
    sendOnHold: false,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings(existingSettings);
    }
  }, [existingSettings]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave(settings);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save automation settings");
    } finally {
      setLoading(false);
    }
  };

  const frequencies = [
    { value: "15m", label: "Every 15 minutes" },
    { value: "1h", label: "Every hour" },
    { value: "4h", label: "Every 4 hours" },
    { value: "1d", label: "Daily" },
    { value: "1w", label: "Weekly" },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Automation Settings
        {layout && (
          <Typography variant="body2" color="text.secondary">
            {layout.symbol} {layout.interval}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Enable/Disable Automation */}
        <FormControlLabel
          control={
            <Switch
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
            />
          }
          label="Enable Automation"
        />

        <Box sx={{ mt: 3 }}>
          <FormControl fullWidth>
            <FormLabel>Analysis Frequency</FormLabel>
            <Select
              value={settings.frequency}
              onChange={(e) =>
                setSettings({ ...settings, frequency: e.target.value })
              }
              disabled={!settings.enabled}
            >
              {frequencies.map((freq) => (
                <MenuItem key={freq.value} value={freq.value}>
                  {freq.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Telegram Alerts */}
        <Typography variant="h6" gutterBottom>
          Telegram Alerts
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.sendToTelegram}
              onChange={(e) =>
                setSettings({ ...settings, sendToTelegram: e.target.checked })
              }
              disabled={!settings.enabled}
            />
          }
          label="Send alerts to Telegram"
        />

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.onlyOnSignalChange}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    onlyOnSignalChange: e.target.checked,
                  })
                }
                disabled={!settings.enabled || !settings.sendToTelegram}
              />
            }
            label="Only notify on signal change (BUY → SELL, etc.)"
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.sendOnHold}
                onChange={(e) =>
                  setSettings({ ...settings, sendOnHold: e.target.checked })
                }
                disabled={!settings.enabled || !settings.sendToTelegram}
              />
            }
            label="Send HOLD signals"
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <FormLabel>Minimum Confidence: {settings.minConfidence}%</FormLabel>
          <Slider
            value={settings.minConfidence}
            onChange={(_, value) =>
              setSettings({ ...settings, minConfidence: value as number })
            }
            min={0}
            max={100}
            step={5}
            marks={[
              { value: 0, label: "0%" },
              { value: 50, label: "50%" },
              { value: 100, label: "100%" },
            ]}
            disabled={!settings.enabled || !settings.sendToTelegram}
          />
          <Typography variant="caption" color="text.secondary">
            Only send alerts if confidence is above this threshold
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            💡 The system will automatically capture chart snapshots and analyze
            them at the specified frequency. Telegram alerts will be sent based
            on your filter settings.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
