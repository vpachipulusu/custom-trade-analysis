import { useState, useEffect } from "react";
import { Alert, AlertTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface ErrorAlertProps {
  message: string;
  title?: string;
  severity?: "error" | "warning" | "info" | "success";
  dismissible?: boolean;
  autoDismiss?: number; // milliseconds
  onClose?: () => void;
}

export default function ErrorAlert({
  message,
  title,
  severity = "error",
  dismissible = true,
  autoDismiss,
  onClose,
}: ErrorAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onClose]);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Alert
      severity={severity}
      action={
        dismissible && (
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleClose}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        )
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );
}
