import { useState } from "react";
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
import { useCreateLayout, CreateLayoutData } from "@/hooks/useLayouts";

interface AddLayoutDialogProps {
  open: boolean;
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

export default function AddLayoutDialog({
  open,
  onClose,
  onSuccess,
}: AddLayoutDialogProps) {
  const [formData, setFormData] = useState<CreateLayoutData>({
    layoutId: "",
    symbol: "",
    interval: "60",
  });
  const [error, setError] = useState("");

  const createLayout = useCreateLayout();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.layoutId && (!formData.symbol || !formData.interval)) {
      setError("Either Layout ID OR both Symbol and Interval are required");
      return;
    }

    try {
      const dataToSubmit: CreateLayoutData = {
        layoutId: formData.layoutId || undefined,
        symbol: formData.symbol || undefined,
        interval: formData.interval || undefined,
      };

      await createLayout.mutateAsync(dataToSubmit);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create layout");
    }
  };

  const handleClose = () => {
    setFormData({
      layoutId: "",
      symbol: "",
      interval: "60",
    });
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Layout</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide either a Layout ID OR Symbol + Interval
          </Typography>

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
            helperText="Exchange:Symbol format (e.g., BINANCE:BTCUSDT)"
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
            disabled={createLayout.isPending}
          >
            {createLayout.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
