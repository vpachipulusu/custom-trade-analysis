import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  Alert,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { getLogger } from "@/lib/logging";
import AIModelSelector from "./AIModelSelector";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import { useQueryClient } from "@tanstack/react-query";

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

export default function DashboardSettingsDialog({
  open,
  onClose,
  currentSettings,
  onSave,
}: DashboardSettingsDialogProps) {
  const logger = getLogger();
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  const [defaultAiModel, setDefaultAiModel] = useState(
    currentSettings?.defaultAiModel || "gpt-4o"
  );
  const [sessionid, setSessionid] = useState(currentSettings?.sessionid || "");
  const [sessionidSign, setSessionidSign] = useState(
    currentSettings?.sessionidSign || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteAllSnapshotsDialog, setDeleteAllSnapshotsDialog] = useState(false);
  const [deletingSnapshots, setDeletingSnapshots] = useState(false);

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

  const handleDeleteAllSnapshots = async () => {
    try {
      setDeletingSnapshots(true);
      const token = await getAuthToken();
      await axios.delete("/api/snapshots/all", {
        headers: { Authorization: token },
      });
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
      setDeleteAllSnapshotsDialog(false);
      logger.info("All snapshots deleted from all layouts");
    } catch (err) {
      logger.error("Failed to delete all snapshots", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError("Failed to delete snapshots. Please try again.");
    } finally {
      setDeletingSnapshots(false);
    }
  };

  return (
    <>
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select the default AI model to use for all chart analyses.
          </Typography>
          <AIModelSelector
            value={defaultAiModel}
            onChange={setDefaultAiModel}
          />

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

          <Divider sx={{ my: 3 }} />

          {/* Clear All Snapshots */}
          <Typography variant="h6" gutterBottom color="error">
            Danger Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete all snapshots from all layouts. This action cannot be undone.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteAllSnapshotsDialog(true)}
            fullWidth
          >
            Clear All Layout Snapshots
          </Button>
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

    <DeleteConfirmationDialog
      open={deleteAllSnapshotsDialog}
      title="Delete All Snapshots"
      message="Are you sure you want to delete ALL snapshots from ALL layouts? This will also delete all associated analyses. This action cannot be undone."
      onConfirm={handleDeleteAllSnapshots}
      onCancel={() => setDeleteAllSnapshotsDialog(false)}
    />
    </>
  );
}
