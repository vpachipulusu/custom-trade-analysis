"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Button, Skeleton, Paper, Typography, Grid, Divider } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import AnalysisDisplay from "@/components/AnalysisDisplay";
import { useAnalysis } from "@/hooks/useAnalyses";
import ErrorAlert from "@/components/ErrorAlert";
import AIModelSelector from "@/components/AIModelSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { getAuthToken } = useAuth();

  const { data: analysis, isLoading, error } = useAnalysis(id);
  const { settings, fetchSettings } = useUserSettings();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  // Fetch user settings on mount - only once
  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      const token = await getAuthToken();
      if (token && mounted) {
        await fetchSettings(token);
      }
    };
    loadSettings();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Initialize selected model: priority is analysis.aiModel, fallback to default from settings
  useEffect(() => {
    if (!initialized && !isLoading) {
      if (analysis?.aiModel) {
        console.log("Setting model from analysis:", analysis.aiModel);
        setSelectedModel(analysis.aiModel);
        setInitialized(true);
      } else if (settings?.defaultAiModel && !isLoading) {
        console.log("Setting model from settings:", settings.defaultAiModel);
        setSelectedModel(settings.defaultAiModel);
        setInitialized(true);
      }
    }
  }, [analysis, settings?.defaultAiModel, initialized, isLoading]);

  return (
    <ProtectedRoute>
      <Layout>
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/dashboard")}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
        </Box>

        {error && (
          <ErrorAlert message="Failed to load analysis" severity="error" />
        )}

        {isLoading ? (
          <Box>
            <Skeleton variant="rectangular" height={400} sx={{ mb: 2 }} />
            <Skeleton variant="text" height={60} />
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={40} />
          </Box>
        ) : analysis ? (
          <AnalysisDisplay analysis={analysis} selectedModel={selectedModel} onModelChange={setSelectedModel} />
        ) : (
          <ErrorAlert message="Analysis not found" severity="error" />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
