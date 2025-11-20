import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  Alert,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { getLogger } from "@/lib/logging";

interface DashboardSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentSettings?: {
    defaultAiModel?: string;
    sessionid?: string;
    sessionidSign?: string;
  };
  onSave: () => void;
}

const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Faster, Less Accurate)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

export default function DashboardSettingsDialog({
  open,
  onClose,
  currentSettings,
  onSave,
}: DashboardSettingsDialogProps) {
  const logger = getLogger();
  const { getAuthToken } = useAuth();
  const [defaultAiModel, setDefaultAiModel] = useState(
    currentSettings?.defaultAiModel || "gpt-4o"
  );
  const [sessionid, setSessionid] = useState(currentSettings?.sessionid || "");
  const [sessionidSign, setSessionidSign] = useState(
    currentSettings?.sessionidSign || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when currentSettings prop changes
  useEffect(() => {
    if (currentSettings) {
      setDefaultAiModel(currentSettings.defaultAiModel || "gpt-4o");
      setSessionid(currentSettings.sessionid || "");
      setSessionidSign(currentSettings.sessionidSign || "");
    }
  }, [currentSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = await getAuthToken();

      // Save settings to user preferences
      await axios.post(
        "/api/user/settings",
        {
          defaultAiModel,
          sessionid,
          sessionidSign,
        },
        {
          headers: { Authorization: token },
        }
      );

      logger.info("Dashboard settings saved", { defaultAiModel });
      onSave();
      onClose();
    } catch (err) {
      logger.error("Failed to save settings", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Dashboard Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* AI Model Selection */}
          <Typography variant="h6" gutterBottom>
            AI Analysis Settings
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Default AI Model</InputLabel>
            <Select
              value={defaultAiModel}
              label="Default AI Model"
              onChange={(e) => setDefaultAiModel(e.target.value)}
            >
              {AI_MODELS.map((model) => (
                <MenuItem key={model.value} value={model.value}>
                  {model.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* TradingView Session Settings */}
          <Typography variant="h6" gutterBottom>
            TradingView Session
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These cookies are required to take snapshots of private TradingView
            charts. You can find them in your browser's developer tools when
            logged into TradingView.
          </Typography>

          <TextField
            fullWidth
            label="Session ID"
            value={sessionid}
            onChange={(e) => setSessionid(e.target.value)}
            placeholder="Your TradingView sessionid cookie"
            sx={{ mb: 2 }}
            helperText="Find this in browser DevTools → Application → Cookies → tradingview.com"
          />

          <TextField
            fullWidth
            label="Session ID Sign"
            value={sessionidSign}
            onChange={(e) => setSessionidSign(e.target.value)}
            placeholder="Your TradingView sessionid_sign cookie"
            helperText="Find this in browser DevTools → Application → Cookies → tradingview.com"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
