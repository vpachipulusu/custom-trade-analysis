"use client";

import { Grid, Typography, Paper, Box, useTheme, alpha } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { ProtectedRoute } from '@/components/layout';
import { Layout } from '@/components/layout';
import { LayoutsTable } from '@/components/dashboard';
import { RecentAnalyses } from '@/components/dashboard';
import { useLayouts } from "@/hooks/useLayouts";
import { useAnalyses } from "@/hooks/useAnalyses";
import { LoadingSpinner } from '@/components/common';
import { ErrorAlert } from '@/components/common';

export default function DashboardPage() {
  const theme = useTheme();
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
              <DashboardIcon sx={{ fontSize: 24, color: "white" }} />
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
                Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Manage your TradingView chart layouts and AI analyses
              </Typography>
            </Box>
          </Box>
        </Paper>

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
