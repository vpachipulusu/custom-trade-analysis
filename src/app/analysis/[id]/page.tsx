"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, Button, Skeleton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import AnalysisDisplay from "@/components/AnalysisDisplay";
import { useAnalysis } from "@/hooks/useAnalyses";
import ErrorAlert from "@/components/ErrorAlert";

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: analysis, isLoading, error } = useAnalysis(id);

  return (
    <ProtectedRoute>
      <Layout>
        <Box sx={{ mb: 3 }}>
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
          <AnalysisDisplay analysis={analysis} />
        ) : (
          <ErrorAlert message="Analysis not found" severity="error" />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
