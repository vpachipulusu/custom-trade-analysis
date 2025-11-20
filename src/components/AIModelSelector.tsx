"use client";

import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Chip,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";

export interface AIModelInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface AIModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function AIModelSelector({
  value,
  onChange,
  disabled = false,
}: AIModelSelectorProps) {
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnabledModels();
  }, []);

  const fetchEnabledModels = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-models");

      if (!response.ok) {
        throw new Error("Failed to fetch AI models");
      }

      const data = await response.json();
      setModels(data.models || []);

      // If no value is set and we have models, set the first one as default
      if (!value && data.models && data.models.length > 0) {
        onChange(data.models[0].id);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching AI models:", err);
      setError("Failed to load AI models");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading AI models...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  if (models.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No AI models available. Please configure at least one model in environment settings.
      </Typography>
    );
  }

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel id="ai-model-select-label">AI Model</InputLabel>
      <Select
        labelId="ai-model-select-label"
        id="ai-model-select"
        value={value}
        label="AI Model"
        onChange={(e) => onChange(e.target.value)}
        startAdornment={
          <SmartToyIcon sx={{ mr: 1, color: "primary.main" }} />
        }
      >
        {models.map((model) => (
          <MenuItem key={model.id} value={model.id}>
            <Box sx={{ py: 0.5 }}>
              <Typography variant="body1" fontWeight={500}>
                {model.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {model.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Standalone component to display which model was used
interface AIModelBadgeProps {
  modelName?: string;
  modelId?: string;
  size?: "small" | "medium";
}

export function AIModelBadge({ modelName, modelId, size = "small" }: AIModelBadgeProps) {
  const displayName = modelName || modelId || "AI Model";

  return (
    <Chip
      icon={<SmartToyIcon />}
      label={displayName}
      color="primary"
      size={size}
      variant="outlined"
    />
  );
}
