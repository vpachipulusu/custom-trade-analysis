import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import { format } from "date-fns";
import { Analysis } from "@/hooks/useAnalyses";
import ActionChip from "./ActionChip";
import ConfidenceProgress from "./ConfidenceProgress";
import RiskLevelBadge from "./RiskLevelBadge";

interface RecentAnalysesProps {
  analyses: Analysis[];
}

export default function RecentAnalyses({ analyses }: RecentAnalysesProps) {
  const router = useRouter();

  if (analyses.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No analyses yet. Generate a snapshot and analyze it to see results
          here.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {analyses.map((analysis) => (
        <Card key={analysis.id} sx={{ cursor: "pointer" }}>
          <CardActionArea
            onClick={() => router.push(`/analysis/${analysis.id}`)}
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
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography variant="subtitle2" component="div">
                    {analysis.snapshot.layout.symbol || "Chart Analysis"}
                  </Typography>
                  {analysis.economicContext && (
                    <RiskLevelBadge
                      riskLevel={analysis.economicContext.immediateRisk}
                      size="small"
                    />
                  )}
                </Box>
                <ActionChip action={analysis.action} size="small" />
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                {format(new Date(analysis.createdAt), "MMM dd, yyyy HH:mm")}
              </Typography>

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
            </CardContent>
          </CardActionArea>
        </Card>
      ))}

      {analyses.length >= 5 && (
        <Box sx={{ textAlign: "center", pt: 2 }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: "pointer" }}
            onClick={() => router.push("/analyses")}
          >
            View all analyses →
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
