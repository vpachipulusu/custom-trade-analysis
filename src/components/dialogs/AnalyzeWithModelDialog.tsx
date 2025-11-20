"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { AIModelSelector } from "@/components/analysis";

interface AnalyzeWithModelDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (aiModel: string) => void;
  title?: string;
  description?: string;
}

export default function AnalyzeWithModelDialog({
  open,
  onClose,
  onConfirm,
  title = "Select AI Model",
  description = "Choose which AI model to use for analysis:",
}: AnalyzeWithModelDialogProps) {
  const [selectedModel, setSelectedModel] = useState<string>("");

  const handleConfirm = () => {
    if (selectedModel) {
      onConfirm(selectedModel);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          <AIModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedModel}
        >
          Analyze
        </Button>
      </DialogActions>
    </Dialog>
  );
}
