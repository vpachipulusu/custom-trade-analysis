"use client";

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  Typography,
} from "@mui/material";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/navigation";

interface LinkToJournalButtonProps {
  analysisId: string;
  analysisTitle?: string;
  disabled?: boolean;
}

export default function LinkToJournalButton({
  analysisId,
  analysisTitle,
  disabled = false,
}: LinkToJournalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const handleClick = () => {
    setOpen(true);
  };

  const handleConfirm = () => {
    // Navigate to journal page with analysis ID in query params
    router.push(`/journal?linkAnalysis=${analysisId}`);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<BookmarkAddIcon />}
        onClick={handleClick}
        disabled={disabled}
        fullWidth
      >
        Log This Trade
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Log Trade in Journal</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Alert severity="info" icon={<BookmarkAddIcon />} sx={{ mb: 2 }}>
              This will create a new trade entry in your journal and link it to
              this analysis.
            </Alert>

            <Typography variant="body2" color="text.secondary">
              You'll be taken to the Trading Journal where you can fill in the
              trade details. The analysis will be automatically linked to the
              trade entry.
            </Typography>

            {analysisTitle && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Analysis:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {analysisTitle}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            startIcon={<CheckCircleIcon />}
          >
            Continue to Journal
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
