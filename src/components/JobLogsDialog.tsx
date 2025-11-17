"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Box,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import TelegramIcon from "@mui/icons-material/Telegram";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface JobLog {
  id: string;
  scheduleId: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  status: string;
  action: string | null;
  confidence: number | null;
  previousAction: string | null;
  signalChanged: boolean;
  metMinConfidence: boolean;
  telegramSent: boolean;
  telegramChatId: string | null;
  telegramError: string | null;
  skipReason: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  screenshotPath: string | null;
  analysisId: string | null;
  createdAt: string;
}

interface JobLogsDialogProps {
  open: boolean;
  onClose: () => void;
  scheduleId?: string;
  layoutName?: string;
}

export default function JobLogsDialog({
  open,
  onClose,
  scheduleId,
  layoutName,
}: JobLogsDialogProps) {
  const { getAuthToken } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const {
    data: logs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["automation-logs", scheduleId],
    queryFn: async () => {
      const token = await getAuthToken();
      const url = scheduleId
        ? `/api/automation/logs?scheduleId=${scheduleId}`
        : "/api/automation/logs";
      const response = await axios.get(url, {
        headers: { Authorization: token },
      });
      return response.data as JobLog[];
    },
    enabled: open,
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon color="success" />;
      case "failed":
        return <ErrorIcon color="error" />;
      case "skipped":
        return <SkipNextIcon color="warning" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      case "skipped":
        return "warning";
      default:
        return "default";
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Automation Job Logs {layoutName && `- ${layoutName}`}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            Failed to load logs: {(error as Error).message}
          </Alert>
        )}

        {logs && logs.length === 0 && (
          <Alert severity="info">No automation jobs have run yet.</Alert>
        )}

        {logs && logs.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={50} />
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Signal Changed</TableCell>
                  <TableCell>Telegram</TableCell>
                  <TableCell>Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <>
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(log.id)}
                        >
                          {expandedRows.has(log.id) ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(log.startedAt)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(log.status)}
                          <Chip
                            label={log.status}
                            size="small"
                            color={getStatusColor(log.status) as any}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.action ? (
                          <Chip
                            label={log.action}
                            size="small"
                            color={
                              log.action === "BUY"
                                ? "success"
                                : log.action === "SELL"
                                ? "error"
                                : "default"
                            }
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {log.confidence ? `${log.confidence}%` : "-"}
                      </TableCell>
                      <TableCell>
                        {log.signalChanged ? (
                          <Chip label="Yes" size="small" color="primary" />
                        ) : (
                          <Chip label="No" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {log.telegramSent ? (
                          <Chip
                            icon={<TelegramIcon />}
                            label="Sent"
                            size="small"
                            color="info"
                          />
                        ) : log.telegramError ? (
                          <Chip
                            icon={<ErrorIcon />}
                            label="Failed"
                            size="small"
                            color="error"
                          />
                        ) : (
                          <Chip label="Skipped" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(log.duration)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      >
                        <Collapse
                          in={expandedRows.has(log.id)}
                          timeout="auto"
                          unmountOnExit
                        >
                          <Box p={2} bgcolor="background.default">
                            <Typography variant="subtitle2" gutterBottom>
                              Details
                            </Typography>

                            {log.previousAction && (
                              <Typography variant="body2" gutterBottom>
                                <strong>Previous Action:</strong>{" "}
                                {log.previousAction}
                              </Typography>
                            )}

                            {log.skipReason && (
                              <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                                <strong>Skip Reason:</strong> {log.skipReason}
                              </Alert>
                            )}

                            {log.telegramError && (
                              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                                <strong>Telegram Error:</strong>{" "}
                                {log.telegramError}
                              </Alert>
                            )}

                            {log.errorMessage && (
                              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                                <strong>Error:</strong> {log.errorMessage}
                                {log.errorStack && (
                                  <Box
                                    component="pre"
                                    sx={{
                                      mt: 1,
                                      p: 1,
                                      bgcolor: "background.paper",
                                      overflow: "auto",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {log.errorStack}
                                  </Box>
                                )}
                              </Alert>
                            )}

                            {log.telegramChatId && (
                              <Typography variant="body2" gutterBottom>
                                <strong>Telegram Chat ID:</strong>{" "}
                                {log.telegramChatId}
                              </Typography>
                            )}

                            {log.analysisId && (
                              <Typography variant="body2" gutterBottom>
                                <strong>Analysis ID:</strong> {log.analysisId}
                              </Typography>
                            )}

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Filters: Min Confidence{" "}
                              {log.metMinConfidence ? "✓" : "✗"}
                            </Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
