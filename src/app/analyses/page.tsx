"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ProtectedRoute, Layout } from "@/components/layout";
import { LoadingSpinner, ErrorAlert, ActionChip, ConfidenceProgress, RiskLevelBadge } from "@/components/common";
import { useAnalyses } from "@/hooks/useAnalyses";

export default function AnalysesPage() {
  const router = useRouter();
  const { data, isLoading, error } = useAnalyses(1, 100); // Get analyses with max allowed limit
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Extract analyses array from response
  const analyses = data?.analyses || [];

  // Filter analyses
  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesAction = actionFilter === "all" || analysis.action === actionFilter;
    const matchesSearch =
      !searchQuery ||
      analysis.snapshot.layout.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.reasons.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <ProtectedRoute>
      <Layout>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            All Analyses
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View all your chart analyses
          </Typography>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by symbol or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={actionFilter}
                label="Action"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="all">All Actions</MenuItem>
                <MenuItem value="BUY">BUY</MenuItem>
                <MenuItem value="SELL">SELL</MenuItem>
                <MenuItem value="HOLD">HOLD</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Content */}
        {error && (
          <ErrorAlert message="Failed to load analyses" severity="error" />
        )}

        {isLoading ? (
          <LoadingSpinner message="Loading analyses..." />
        ) : filteredAnalyses && filteredAnalyses.length > 0 ? (
          <Grid container spacing={2}>
            {filteredAnalyses.map((analysis) => (
              <Grid item xs={12} sm={6} md={4} key={analysis.id}>
                <Card sx={{ height: "100%" }}>
                  <CardActionArea
                    onClick={() => router.push(`/analysis/${analysis.id}`)}
                    sx={{ height: "100%" }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                          <Typography variant="subtitle1" component="div" fontWeight="bold">
                            {analysis.snapshot.layout.symbol || "Chart"}
                          </Typography>
                          {analysis.snapshot.layout.interval && (
                            <Chip label={analysis.snapshot.layout.interval} size="small" variant="outlined" />
                          )}
                        </Box>
                        <ActionChip action={analysis.action} size="small" />
                      </Box>

                      {analysis.economicContext && (
                        <Box sx={{ mb: 1 }}>
                          <RiskLevelBadge
                            riskLevel={analysis.economicContext.immediateRisk as "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME"}
                            size="small"
                          />
                        </Box>
                      )}

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 1, display: "block" }}
                      >
                        {format(new Date(analysis.createdAt), "MMM dd, yyyy HH:mm")}
                      </Typography>

                      {analysis.aiModelName && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mb: 1, display: "block" }}
                        >
                          AI Model: {analysis.aiModelName}
                        </Typography>
                      )}

                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Confidence
                        </Typography>
                        <ConfidenceProgress confidence={analysis.confidence} />
                      </Box>

                      <Chip
                        label={analysis.timeframe}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "capitalize" }}
                      />

                      {analysis.reasons && analysis.reasons.length > 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {analysis.reasons[0]}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || actionFilter !== "all"
                ? "No analyses found matching your filters."
                : "No analyses yet. Generate a snapshot and analyze it to see results here."}
            </Typography>
          </Box>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
