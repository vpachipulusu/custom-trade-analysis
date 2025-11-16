import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";

interface DeleteConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteConfirmationDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel",
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon color="warning" />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="outlined">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
