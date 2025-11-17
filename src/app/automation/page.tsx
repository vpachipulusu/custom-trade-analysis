"use client";

import { useState } from "react";
import {
  Grid,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorAlert from "@/components/ErrorAlert";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TelegramIcon from "@mui/icons-material/Telegram";
import AddIcon from "@mui/icons-material/Add";
import TelegramSetupDialog from "@/components/TelegramSetupDialog";
import AutomationSettingsDialog from "@/components/AutomationSettingsDialog";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLayouts } from "@/hooks/useLayouts";

interface AutomationSchedule {
  id: string;
  layoutId: string;
  enabled: boolean;
  frequency: string;
  sendToTelegram: boolean;
  onlyOnSignalChange: boolean;
  minConfidence: number;
  sendOnHold: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  layout: {
    id: string;
    layoutId: string | null;
    symbol: string | null;
    interval: string | null;
  };
}

interface TelegramConfig {
  id: string;
  chatId: string;
  username?: string;
  isActive: boolean;
  includeChart: boolean;
  includeEconomic: boolean;
  notifyOnHold: boolean;
}

export default function AutomationPage() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: layouts } = useLayouts();

  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [layoutSelectDialogOpen, setLayoutSelectDialogOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] =
    useState<AutomationSchedule | null>(null);

  // Fetch automation schedules
  const {
    data: schedules,
    isLoading: schedulesLoading,
    error: schedulesError,
  } = useQuery({
    queryKey: ["automation-schedules"],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get("/api/automation", {
        headers: { Authorization: token },
      });
      return response.data as AutomationSchedule[];
    },
  });

  // Fetch Telegram config
  const { data: telegramConfig, isLoading: telegramLoading } = useQuery({
    queryKey: ["telegram-config"],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get("/api/telegram", {
        headers: { Authorization: token },
      });
      return response.data as TelegramConfig | null;
    },
  });

  // Save Telegram config
  const saveTelegramConfig = useMutation({
    mutationFn: async (config: Partial<TelegramConfig>) => {
      const token = await getAuthToken();
      const response = await axios.post("/api/telegram", config, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-config"] });
      setTelegramDialogOpen(false);
    },
  });

  // Test Telegram connection
  const testTelegram = async (chatId: string): Promise<boolean> => {
    try {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/telegram/test",
        { chatId },
        { headers: { Authorization: token } }
      );
      return response.data.success;
    } catch (error) {
      return false;
    }
  };

  // Save automation schedule
  const saveAutomation = useMutation({
    mutationFn: async (data: any) => {
      const token = await getAuthToken();
      const response = await axios.post("/api/automation", data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-schedules"] });
      setAutomationDialogOpen(false);
      setSelectedLayout(null);
      setEditingSchedule(null);
    },
  });

  // Delete automation schedule
  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      await axios.delete(`/api/automation/${id}`, {
        headers: { Authorization: token },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-schedules"] });
    },
  });

  // Trigger automation manually
  const triggerAutomation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/automation/trigger",
        {},
        { headers: { Authorization: token } }
      );
      return response.data;
    },
  });

  const handleEditAutomation = (schedule: AutomationSchedule) => {
    const layout = layouts?.find((l) => l.id === schedule.layoutId);
    setSelectedLayout(layout || null);
    setEditingSchedule(schedule);
    setAutomationDialogOpen(true);
  };

  const handleAddAutomation = () => {
    // Show layout selection dialog
    setLayoutSelectDialogOpen(true);
  };

  const handleLayoutSelected = (layout: any) => {
    setSelectedLayout(layout);
    setLayoutSelectDialogOpen(false);
    setAutomationDialogOpen(true);
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      "15m": "Every 15 minutes",
      "1h": "Every hour",
      "4h": "Every 4 hours",
      "1d": "Daily",
      "1w": "Weekly",
    };
    return labels[freq] || freq;
  };

  return (
    <ProtectedRoute>
      <Layout>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Automation & Alerts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure automated chart analysis and Telegram notifications
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Telegram Configuration */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Telegram Bot</Typography>
                <Button
                  variant={telegramConfig ? "outlined" : "contained"}
                  startIcon={<TelegramIcon />}
                  onClick={() => setTelegramDialogOpen(true)}
                  disabled={telegramLoading}
                >
                  {telegramConfig ? "Reconfigure" : "Setup"}
                </Button>
              </Box>

              {telegramConfig ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✅ Telegram is configured and active
                  </Alert>
                  <Typography variant="body2" gutterBottom>
                    <strong>Chat ID:</strong> {telegramConfig.chatId}
                  </Typography>
                  {telegramConfig.username && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Username:</strong> @{telegramConfig.username}
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    <strong>Include Charts:</strong>{" "}
                    {telegramConfig.includeChart ? "Yes" : "No"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Include Economic Context:</strong>{" "}
                    {telegramConfig.includeEconomic ? "Yes" : "No"}
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  Configure your Telegram bot to receive automated trading
                  alerts. You'll need a bot token and chat ID.
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddAutomation}
                  disabled={!layouts || layouts.length === 0}
                >
                  Add New Automation
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => triggerAutomation.mutate()}
                  disabled={triggerAutomation.isPending}
                >
                  Trigger All Jobs Now
                </Button>
                {triggerAutomation.isSuccess && (
                  <Alert severity="success">
                    Automation jobs triggered successfully!
                  </Alert>
                )}
                {triggerAutomation.isError && (
                  <Alert severity="error">
                    Failed to trigger automation jobs
                  </Alert>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Automation Schedules */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Active Automations
              </Typography>

              {schedulesError && (
                <ErrorAlert
                  message="Failed to load automation schedules"
                  severity="error"
                />
              )}

              {schedulesLoading ? (
                <LoadingSpinner message="Loading automation schedules..." />
              ) : schedules && schedules.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Layout</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Run</TableCell>
                        <TableCell>Next Run</TableCell>
                        <TableCell>Filters</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>
                            {schedule.layout.symbol} {schedule.layout.interval}
                          </TableCell>
                          <TableCell>
                            {getFrequencyLabel(schedule.frequency)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={schedule.enabled ? "Enabled" : "Disabled"}
                              color={schedule.enabled ? "success" : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {schedule.lastRunAt
                              ? new Date(schedule.lastRunAt).toLocaleString()
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            {schedule.nextRunAt
                              ? new Date(schedule.nextRunAt).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              {schedule.onlyOnSignalChange && (
                                <Chip label="Signal Change" size="small" />
                              )}
                              {schedule.minConfidence > 0 && (
                                <Chip
                                  label={`Min ${schedule.minConfidence}%`}
                                  size="small"
                                />
                              )}
                              {!schedule.sendOnHold && (
                                <Chip label="No HOLD" size="small" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEditAutomation(schedule)}
                            >
                              <SettingsIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() =>
                                deleteAutomation.mutate(schedule.id)
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No automation schedules configured yet. Add your first
                  automation to get started!
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Dialogs */}
        <TelegramSetupDialog
          open={telegramDialogOpen}
          onClose={() => setTelegramDialogOpen(false)}
          onSave={async (config) => {
            saveTelegramConfig.mutate(config);
          }}
          onTest={testTelegram}
          existingConfig={telegramConfig}
        />

        {/* Layout Selection Dialog */}
        <Dialog
          open={layoutSelectDialogOpen}
          onClose={() => setLayoutSelectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Layout to Automate</DialogTitle>
          <DialogContent>
            <List>
              {layouts
                ?.filter(
                  (layout) => !schedules?.some((s) => s.layoutId === layout.id)
                )
                .map((layout) => (
                  <ListItemButton
                    key={layout.id}
                    onClick={() => handleLayoutSelected(layout)}
                  >
                    <ListItemText
                      primary={`${layout.symbol} ${layout.interval}`}
                      secondary={`Layout ID: ${layout.layoutId || "N/A"}`}
                    />
                  </ListItemButton>
                ))}
            </List>
            {layouts?.filter(
              (layout) => !schedules?.some((s) => s.layoutId === layout.id)
            ).length === 0 && (
              <Alert severity="info">
                All layouts already have automation configured.
              </Alert>
            )}
          </DialogContent>
        </Dialog>

        <AutomationSettingsDialog
          open={automationDialogOpen}
          onClose={() => {
            setAutomationDialogOpen(false);
            setSelectedLayout(null);
            setEditingSchedule(null);
          }}
          layout={selectedLayout}
          onSave={async (settings) => {
            saveAutomation.mutate({
              layoutId: selectedLayout?.id,
              ...settings,
            });
          }}
          existingSettings={
            editingSchedule
              ? {
                  enabled: editingSchedule.enabled,
                  frequency: editingSchedule.frequency,
                  sendToTelegram: editingSchedule.sendToTelegram,
                  onlyOnSignalChange: editingSchedule.onlyOnSignalChange,
                  minConfidence: editingSchedule.minConfidence,
                  sendOnHold: editingSchedule.sendOnHold,
                }
              : null
          }
        />
      </Layout>
    </ProtectedRoute>
  );
}
