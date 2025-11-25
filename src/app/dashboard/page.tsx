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
        {/* Modern Header with Gradient Background */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            borderRadius: 3,
            p: 4,
            mb: 4,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              }}
            >
              <DashboardIcon sx={{ fontSize: 32, color: "white" }} />
            </Box>
            <Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.02em",
                }}
              >
                Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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
