"use client";

import { Grid, Typography, Paper, Box } from "@mui/material";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LayoutsTable from "@/components/LayoutsTable";
import RecentAnalyses from "@/components/RecentAnalyses";
import { useLayouts } from "@/hooks/useLayouts";
import { useAnalyses } from "@/hooks/useAnalyses";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorAlert from "@/components/ErrorAlert";

export default function DashboardPage() {
  const {
    data: layouts,
    isLoading: layoutsLoading,
    error: layoutsError,
    refetch: refetchLayouts,
  } = useLayouts();
  const {
    data: analysesData,
    isLoading: analysesLoading,
    error: analysesError,
  } = useAnalyses(1, 5);

  return (
    <ProtectedRoute>
      <Layout>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your TradingView chart layouts and AI analyses
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Layouts Section */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Chart Layouts
              </Typography>
              {layoutsError && (
                <ErrorAlert message="Failed to load layouts" severity="error" />
              )}
              {layoutsLoading ? (
                <LoadingSpinner message="Loading layouts..." />
              ) : (
                <LayoutsTable
                  layouts={layouts || []}
                  onRefresh={refetchLayouts}
                />
              )}
            </Paper>
          </Grid>

          {/* Recent Analyses Section */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Analyses
              </Typography>
              {analysesError && (
                <ErrorAlert
                  message="Failed to load analyses"
                  severity="error"
                />
              )}
              {analysesLoading ? (
                <LoadingSpinner message="Loading analyses..." />
              ) : (
                <RecentAnalyses analyses={analysesData?.analyses || []} />
              )}
            </Paper>
          </Grid>
        </Grid>
      </Layout>
    </ProtectedRoute>
  );
}
