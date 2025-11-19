"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Collapse,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Save, ExpandMore, ExpandLess, InfoOutlined } from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export default function TradingViewSessionSettings() {
  const { getAuthToken } = useAuth();
  const [sessionId, setSessionId] = useState("");
  const [sessionIdSign, setSessionIdSign] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!sessionId || !sessionIdSign) {
      setError("Both Session ID and Session ID Sign are required");
      return;
    }

    try {
      setLoading(true);
      const token = await getAuthToken();
      await axios.patch(
        "/api/profile/tradingview-session",
        { sessionId, sessionIdSign },
        { headers: { Authorization: token } }
      );

      setSuccess("TradingView session credentials updated successfully!");
      setSessionId("");
      setSessionIdSign("");
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to update TradingView session"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        TradingView Session Credentials
        <IconButton
          size="small"
          onClick={() => setShowInstructions(!showInstructions)}
          sx={{ ml: 1 }}
        >
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Required for generating chart snapshots. These credentials are shared across all your layouts.
      </Typography>

      <Collapse in={showInstructions}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            📋 How to get your TradingView session credentials:
          </Typography>
          <Typography variant="body2" component="div" sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
            1. Go to <strong>tradingview.com</strong> (make sure you're logged in)
            <br />
            2. Open browser DevTools (press <strong>F12</strong>)
            <br />
            3. Go to <strong>Application</strong> tab → <strong>Cookies</strong> → <strong>tradingview.com</strong>
            <br />
            4. Find <strong>"sessionid"</strong> → copy its value → paste below
            <br />
            5. Find <strong>"sessionid_sign"</strong> → copy its value → paste below
            <br />
            <br />
            💡 <em>Tip: Update these credentials here when your TradingView session expires, and all your layouts will automatically use the new session!</em>
          </Typography>
        </Alert>
      </Collapse>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            fullWidth
            label="Session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Paste your TradingView sessionid cookie value"
            type="password"
            required
          />

          <TextField
            fullWidth
            label="Session ID Sign"
            value={sessionIdSign}
            onChange={(e) => setSessionIdSign(e.target.value)}
            placeholder="Paste your TradingView sessionid_sign cookie value"
            type="password"
            required
          />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
            disabled={loading}
            sx={{ alignSelf: "flex-start" }}
          >
            {loading ? "Updating..." : "Update Session Credentials"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
