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
  Alert,
  CircularProgress,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils/currency";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function JournalSettingsDialog({
  open,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [startingBalance, setStartingBalance] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [timezone, setTimezone] = useState("UTC");
  const [defaultPositionSize, setDefaultPositionSize] = useState("");
  const [defaultRiskPercent, setDefaultRiskPercent] = useState("");

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/journal/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch settings");

      const data = await res.json();
      const settings = data.settings;

      setStartingBalance(settings.startingBalance);
      setCurrentBalance(settings.currentBalance);
      setCurrency(settings.currency);
      setTimezone(settings.timezone);
      setDefaultPositionSize(settings.defaultPositionSize || "");
      setDefaultRiskPercent(settings.defaultRiskPercent || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updates: any = {
        currency,
        timezone,
      };

      if (startingBalance !== "") {
        updates.startingBalance = parseFloat(startingBalance);
      }

      if (defaultPositionSize !== "") {
        updates.defaultPositionSize = parseFloat(defaultPositionSize);
      }

      if (defaultRiskPercent !== "") {
        updates.defaultRiskPercent = parseFloat(defaultRiskPercent);
      }

      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/journal/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllData = async () => {
    if (
      !confirm(
        "⚠️ WARNING: This will permanently delete ALL your trading journal data including all trades, statistics, and monthly reports. Your settings (starting balance, currency, etc.) will be preserved, and your balance will be reset to your starting balance. This action CANNOT be undone. Are you absolutely sure you want to continue?"
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/journal/debug", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clear data");
      }

      setSuccess("All journal data has been cleared successfully!");

      // Wait a moment to show the success message, then reload
      setTimeout(() => {
        onSaved();
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear data");
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedData = async () => {
    if (
      !confirm(
        "This will create 30+ realistic sample trades spanning 3 months to test statistics and charts. This should only be used on a fresh account or after clearing all data. Continue?"
      )
    ) {
      return;
    }

    setSeeding(true);
    setError("");

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/journal/debug", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to seed data");
      }

      const result = await res.json();
      setSuccess(
        `Successfully created ${
          result.stats.totalTrades
        } trades! Final balance: ${formatCurrency(
          result.stats.finalBalance,
          currency
        )}`
      );

      // Wait a moment to show the success message, then reload
      setTimeout(() => {
        onSaved();
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed data");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Journal Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Starting Balance"
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    inputProps={{ step: "0.01" }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Current Balance"
                    type="number"
                    value={currentBalance}
                    disabled
                    helperText="Automatically calculated from trades"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={currency}
                      label="Currency"
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <MenuItem value="GBP">GBP (£)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                      <MenuItem value="JPY">JPY (¥)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={timezone}
                      label="Timezone"
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="America/New_York">New York</MenuItem>
                      <MenuItem value="Europe/London">London</MenuItem>
                      <MenuItem value="Europe/Paris">Paris</MenuItem>
                      <MenuItem value="Asia/Tokyo">Tokyo</MenuItem>
                      <MenuItem value="Asia/Shanghai">Shanghai</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Default Position Size"
                    type="number"
                    value={defaultPositionSize}
                    onChange={(e) => setDefaultPositionSize(e.target.value)}
                    inputProps={{ step: "0.01" }}
                    helperText="Optional"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Default Risk %"
                    type="number"
                    value={defaultRiskPercent}
                    onChange={(e) => setDefaultRiskPercent(e.target.value)}
                    inputProps={{ step: "0.1", min: "0", max: "100" }}
                    helperText="Optional (0-100)"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={handleSeedData}
            color="success"
            disabled={loading || deleting || saving || seeding}
            startIcon={<AddIcon />}
          >
            {seeding ? "Seeding..." : "Seed Data"}
          </Button>
          <Button
            onClick={handleClearAllData}
            color="error"
            disabled={loading || deleting || saving || seeding}
            startIcon={<DeleteIcon />}
          >
            {deleting ? "Clearing..." : "Clear All Data"}
          </Button>
        </Box>
        <Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || saving || deleting || seeding}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
