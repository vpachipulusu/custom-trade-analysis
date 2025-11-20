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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "@/contexts/AuthContext";
import { JournalProvider } from "@/contexts/JournalContext";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="bold">
              Trading Journal
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" onClick={() => setSettingsOpen(true)}>
                Settings
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddTradeOpen(true)}
              >
                Add Trade
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="journal tabs"
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
