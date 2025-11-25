"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useAuth } from "@/contexts/AuthContext";
import { JournalProvider } from "@/contexts/JournalContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/layout';
import JournalStats from "@/components/journal/JournalStats";
import TradeLogTable from "@/components/journal/TradeLogTable";
import MonthlyAnalysisTable from "@/components/journal/MonthlyAnalysisTable";
import AddTradeDialog from "@/components/journal/AddTradeDialog";
import JournalSettingsDialog from "@/components/journal/JournalSettingsDialog";
import StatisticsTab from "@/components/journal/StatisticsTab";
import OnboardingDialog from "@/components/journal/OnboardingDialog";
import { getLogger } from "@/lib/logging";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`journal-tabpanel-${index}`}
      aria-labelledby={`journal-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function JournalPage() {
  const logger = getLogger();
  const theme = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const [linkedAnalysisId, setLinkedAnalysisId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      checkFirstTime();

      // Check if we need to open add trade dialog for analysis linking
      const linkAnalysisId = searchParams.get("linkAnalysis");
      if (linkAnalysisId) {
        setLinkedAnalysisId(linkAnalysisId);
        setAddTradeOpen(true);
      }
    }
  }, [user, authLoading, router, searchParams]);

  const checkFirstTime = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/journal/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) {
        // No settings exist - first time user
        setOnboardingOpen(true);
      }
      setLoading(false);
    } catch (err) {
      logger.error("Error checking first time", { error: err instanceof Error ? err.message : String(err) });
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async (startingBalance: number) => {
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/journal/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startingBalance }),
      });

      if (response.ok) {
        setOnboardingOpen(false);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      logger.error("Error saving starting balance", { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTradeAdded = () => {
    setAddTradeOpen(false);
    setLinkedAnalysisId(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleAddTradeClose = () => {
    setAddTradeOpen(false);
    setLinkedAnalysisId(null);
  };

  const handleSettingsSaved = () => {
    setSettingsOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
          >
            <CircularProgress />
          </Box>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <JournalProvider>
        <Layout>
          {/* Modern Header */}
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
              borderRadius: 2,
              p: 2.5,
              mb: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              {/* Title Section with Icon */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <AccountBalanceWalletIcon sx={{ fontSize: 24, color: "white" }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Trading Journal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Track, analyze, and optimize your trading performance
                  </Typography>
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsOpen(true)}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                      transform: "translateY(-2px)",
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  Settings
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddTradeOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.5)}`,
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  Add Trade
                </Button>
              </Box>
            </Box>
          </Paper>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Modern Tabs with Enhanced Styling */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="journal tabs"
                sx={{
                  px: 2,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    minHeight: 56,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      color: theme.palette.primary.main,
                    },
                  },
                  "& .Mui-selected": {
                    color: `${theme.palette.primary.main} !important`,
                  },
                  "& .MuiTabs-indicator": {
                    height: 3,
                    borderRadius: "3px 3px 0 0",
                  },
                }}
              >
                <Tab label="Trade Log" />
                <Tab label="Statistics" />
                <Tab label="Month Analysis" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <TradeLogTable
                refreshTrigger={refreshTrigger}
                onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <StatisticsTab refreshTrigger={refreshTrigger} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <MonthlyAnalysisTable refreshTrigger={refreshTrigger} />
            </TabPanel>
          </Paper>

          <AddTradeDialog
            open={addTradeOpen}
            onClose={handleAddTradeClose}
            onTradeAdded={handleTradeAdded}
            linkedAnalysisId={linkedAnalysisId}
          />

          <JournalSettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onSaved={handleSettingsSaved}
          />

          <OnboardingDialog
            open={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            onComplete={handleOnboardingComplete}
          />
        </Layout>
      </JournalProvider>
    </ProtectedRoute>
  );
}
