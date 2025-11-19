import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Layout, useUpdateLayout, UpdateLayoutData } from "@/hooks/useLayouts";
import { getLogger } from "@/lib/logging";

interface EditLayoutDialogProps {
  open: boolean;
  layout: Layout;
  onClose: () => void;
  onSuccess: () => void;
}

const INTERVALS = [
  { value: "1", label: "1 minute" },
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "D", label: "Daily" },
  { value: "W", label: "Weekly" },
  { value: "M", label: "Monthly" },
];

export default function EditLayoutDialog({
  open,
  layout,
  onClose,
  onSuccess,
}: EditLayoutDialogProps) {
  const logger = getLogger();
  const [formData, setFormData] = useState<UpdateLayoutData>({
    layoutId: layout.layoutId || "",
    symbol: layout.symbol || "",
    interval: layout.interval || "60",
  });
  const [error, setError] = useState("");

  const updateLayout = useUpdateLayout();

  useEffect(() => {
    setFormData({
      layoutId: layout.layoutId || "",
      symbol: layout.symbol || "",
      interval: layout.interval || "60",
    });
  }, [layout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.layoutId && (!formData.symbol || !formData.interval)) {
      setError("Either Layout ID OR both Symbol and Interval are required");
      return;
    }

    try {
      const dataToSubmit: UpdateLayoutData = {
        layoutId: formData.layoutId || undefined,
        symbol: formData.symbol || undefined,
        interval: formData.interval || undefined,
      };

      logger.debug("Submitting layout update", {
        layoutId: layout.id,
      });

      await updateLayout.mutateAsync({ id: layout.id, data: dataToSubmit });
      logger.info("Layout update successful", { layoutId: layout.id });
      handleClose();
      onSuccess();
    } catch (err: any) {
      logger.error("Layout update error", { error: err, layoutId: layout.id });
      setError(err.response?.data?.error || "Failed to update layout");
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Layout</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Layout ID (Optional)"
            fullWidth
            margin="normal"
            value={formData.layoutId}
            onChange={(e) =>
              setFormData({ ...formData, layoutId: e.target.value })
            }
            helperText="Your TradingView layout ID"
          />

          <Box sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              — OR —
            </Typography>
          </Box>

          <TextField
            label="Symbol"
            fullWidth
            margin="normal"
            value={formData.symbol}
            onChange={(e) =>
              setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
            }
            placeholder="BINANCE:BTCUSDT"
            helperText="Exchange:Symbol format"
          />

          <TextField
            select
            label="Interval"
            fullWidth
            margin="normal"
            value={formData.interval}
            onChange={(e) =>
              setFormData({ ...formData, interval: e.target.value })
            }
          >
            {INTERVALS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            Note: TradingView session credentials are now managed globally in your Profile settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={updateLayout.isPending}
          >
            {updateLayout.isPending ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
