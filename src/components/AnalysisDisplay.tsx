import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Grid,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { format } from "date-fns";
import { Analysis } from "@/hooks/useAnalyses";
import ActionChip from "./ActionChip";
import ConfidenceProgress from "./ConfidenceProgress";
import EconomicContextPanel from "./EconomicContextPanel";
import TradeSetupCard from "./TradeSetupCard";
import LinkToJournalButton from "./LinkToJournalButton";
import { useCreateSnapshot } from "@/hooks/useSnapshots";
import { useCreateAnalysis } from "@/hooks/useAnalyses";
import { getLogger } from "@/lib/logging";

interface AnalysisDisplayProps {
  analysis: Analysis;
}

export default function AnalysisDisplay({ analysis }: AnalysisDisplayProps) {
  const logger = getLogger();
  const router = useRouter();
  const createSnapshot = useCreateSnapshot();
  const createAnalysis = useCreateAnalysis();
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const hasEconomicContext = !!analysis.economicContext;
  const isMultiLayout =
    !!analysis.multiLayoutSnapshots && analysis.multiLayoutSnapshots.length > 1;

  // Debug logging
  console.log("Analysis data:", {
    hasMultiLayoutSnapshots: !!analysis.multiLayoutSnapshots,
    snapshotsLength: analysis.multiLayoutSnapshots?.length,
    layoutsAnalyzed: analysis.layoutsAnalyzed,
    intervals: analysis.intervals,
    isMultiLayout,
  });

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const layoutId = analysis.snapshot.layoutId;
      const snapshot = await createSnapshot.mutateAsync(layoutId);
      const newAnalysis = await createAnalysis.mutateAsync(snapshot.id);
      router.push(`/analysis/${newAnalysis.id}`);
    } catch (error) {
      logger.error("Regeneration failed", {
        error: error instanceof Error ? error.message : String(error),
        layoutId: analysis.snapshot.layoutId,
      });
      alert("Failed to regenerate analysis. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card>
      {/* Chart Images Section */}
      {isMultiLayout ? (
        <Box>
          <Box sx={{ p: 2, bgcolor: "primary.main", color: "white" }}>
            <Typography variant="h6">
              Multi-Layout Analysis ({analysis.layoutsAnalyzed} charts)
            </Typography>
            <Typography variant="body2">
              Intervals: {analysis.intervals?.join(", ")}
            </Typography>
          </Box>
          <Grid container>
            {analysis.multiLayoutSnapshots?.map((snapshot, index) => (
              <Grid item xs={12} md={6} key={snapshot.snapshotId}>
                <Box sx={{ position: "relative" }}>
                  <CardMedia
                    component="img"
                    image={snapshot.imageUrl}
                    alt={`Chart ${index + 1} - ${snapshot.interval}`}
                    sx={{
                      maxHeight: 400,
                      objectFit: "contain",
                      backgroundColor: "#f5f5f5",
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  />
                  <Chip
                    label={snapshot.interval}
                    color="primary"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        <CardMedia
          component="img"
          image={analysis.snapshot.imageData || analysis.snapshot.url}
          alt="Chart Analysis"
          sx={{
            maxHeight: 500,
            objectFit: "contain",
            backgroundColor: "#f5f5f5",
          }}
        />
      )}

      {hasEconomicContext && (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab icon={<TrendingUpIcon />} label="Technical Analysis" />
            <Tab icon={<CalendarTodayIcon />} label="Economic Context" />
          </Tabs>
        </Box>
      )}

      <CardContent>
        {activeTab === 0 ? (
          <Grid container spacing={3}>
            {/* Action Section */}
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Recommended Action
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                  <ActionChip action={analysis.action} />
                </Box>
              </Box>
            </Grid>

            {/* Confidence Section */}
            <Grid item xs={12} md={6}>
              <Box sx={{ py: 2 }}>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Confidence Level
                </Typography>
                <ConfidenceProgress confidence={analysis.confidence} />
                <Typography variant="h4" align="center" sx={{ mt: 1 }}>
                  {analysis.confidence}%
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Timeframe */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Timeframe:
                </Typography>
                <Chip
                  label={analysis.timeframe.toUpperCase()}
                  color="primary"
                  sx={{ textTransform: "capitalize" }}
                />
              </Box>
            </Grid>

            {/* Reasons */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Analysis Reasons
              </Typography>
              <List>
                {analysis.reasons.map((reason, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={reason} />
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* Trade Setup */}
            {analysis.tradeSetup && (
              <Grid item xs={12}>
                <TradeSetupCard
                  tradeSetup={analysis.tradeSetup}
                  action={analysis.action}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Metadata */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {analysis.snapshot.layout.symbol && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Symbol:</strong> {analysis.snapshot.layout.symbol}
                  </Typography>
                )}
                {analysis.snapshot.layout.interval && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Interval:</strong>{" "}
                    {analysis.snapshot.layout.interval}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Analyzed:</strong>{" "}
                  {format(new Date(analysis.createdAt), "MMMM dd, yyyy HH:mm")}
                </Typography>
              </Box>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  justifyContent: "center",
                  mt: 2,
                }}
              >
                <LinkToJournalButton
                  analysisId={analysis.id}
                  analysisTitle={`${
                    analysis.snapshot.layout.symbol || "Chart"
                  } - ${analysis.action}`}
                />
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  Generate New Analysis
                </Button>
                <Button
                  variant="contained"
                  onClick={() => router.push("/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ py: 2 }}>
            {analysis.economicContext && (
              <EconomicContextPanel
                economicContext={analysis.economicContext}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
