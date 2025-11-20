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
import { Analysis, AnalysisResult } from "@/hooks/useAnalyses";
import ActionChip from "./ActionChip";
import ConfidenceProgress from "./ConfidenceProgress";
import EconomicContextPanel from "./EconomicContextPanel";
import TradeSetupCard from "./TradeSetupCard";
import LinkToJournalButton from "./LinkToJournalButton";
import { useCreateSnapshot } from "@/hooks/useSnapshots";
import { useCreateAnalysis } from "@/hooks/useAnalyses";
import { getLogger } from "@/lib/logging";
import WarningIcon from "@mui/icons-material/Warning";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { AIModelBadge } from "./AIModelSelector";

interface AnalysisDisplayProps {
  analysis: Analysis;
}

// Helper component to render an individual AI analysis
interface AIAnalysisContentProps {
  analysisData: AnalysisResult;
  providerName?: string;
  analysis: Analysis;
}

function AIAnalysisContent({ analysisData, providerName, analysis }: AIAnalysisContentProps) {
  return (
    <Grid container spacing={3}>
      {/* AI Model Badge */}
      <Grid item xs={12}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {analysis.aiModelName ? (
            <AIModelBadge modelName={analysis.aiModelName} modelId={analysis.aiModel} size="medium" />
          ) : providerName ? (
            <Chip
              icon={<SmartToyIcon />}
              label={`${providerName} Analysis`}
              color="primary"
              variant="outlined"
            />
          ) : null}
        </Box>
      </Grid>

      {/* Action Section */}
      <Grid item xs={12} md={6}>
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="h6" gutterBottom color="text.secondary">
            Recommended Action
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <ActionChip action={analysisData.action} />
          </Box>
        </Box>
      </Grid>

      {/* Confidence Section */}
      <Grid item xs={12} md={6}>
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" gutterBottom color="text.secondary">
            Confidence Level
          </Typography>
          <ConfidenceProgress confidence={analysisData.confidence} />
          <Typography variant="h4" align="center" sx={{ mt: 1 }}>
            {analysisData.confidence}%
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
            label={analysisData.timeframe.toUpperCase()}
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
          {analysisData.reasons.map((reason, index) => (
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
      {analysisData.tradeSetup && (
        <Grid item xs={12}>
          <TradeSetupCard
            tradeSetup={analysisData.tradeSetup}
            action={analysisData.action}
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
              <strong>Interval:</strong> {analysis.snapshot.layout.interval}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            <strong>Analyzed:</strong>{" "}
            {format(new Date(analysis.createdAt), "MMMM dd, yyyy HH:mm")}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}

export default function AnalysisDisplay({ analysis }: AnalysisDisplayProps) {
  const logger = getLogger();
  const router = useRouter();
  const createSnapshot = useCreateSnapshot();
  const createAnalysis = useCreateAnalysis();
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const hasEconomicContext = !!analysis.economicContext;
  const isMultiLayout = analysis.isMultiLayout && !!analysis.multiLayoutData;
  const multiLayoutSnapshots = analysis.multiLayoutData?.multiLayoutSnapshots || [];
  const layoutsAnalyzed = analysis.multiLayoutData?.layoutsAnalyzed || 0;
  const intervals = analysis.multiLayoutData?.intervals || [];
  const hasOpenAI = !!analysis.openaiAnalysis;
  const hasDeepSeek = !!analysis.deepseekAnalysis;
  const hasDualAnalysis = hasOpenAI || hasDeepSeek;

  // Debug logging
  console.log("Analysis data:", {
    isMultiLayout,
    hasMultiLayoutData: !!analysis.multiLayoutData,
    snapshotsLength: multiLayoutSnapshots.length,
    layoutsAnalyzed,
    intervals,
  });

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const layoutId = analysis.snapshot.layoutId;
      const snapshot = await createSnapshot.mutateAsync(layoutId);
      const newAnalysis = await createAnalysis.mutateAsync({
        snapshotId: snapshot.id,
        aiModel: analysis.aiModel || undefined
      });
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
              Multi-Layout Analysis ({layoutsAnalyzed} charts)
            </Typography>
            <Typography variant="body2">
              Intervals: {intervals.join(", ")}
            </Typography>
          </Box>
          <Grid container>
            {multiLayoutSnapshots.map((snapshot, index) => (
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

      {/* Tabs for AI providers and Economic Context */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          {hasDualAnalysis && hasOpenAI && (
            <Tab icon={<TrendingUpIcon />} label="OpenAI Analysis" />
          )}
          {hasDualAnalysis && hasDeepSeek && (
            <Tab icon={<TrendingUpIcon />} label="DeepSeek Analysis" />
          )}
          {!hasDualAnalysis && (
            <Tab icon={<TrendingUpIcon />} label="Technical Analysis" />
          )}
          {hasEconomicContext && (
            <Tab icon={<CalendarTodayIcon />} label="Economic Context" />
          )}
        </Tabs>
      </Box>

      <CardContent>
        {/* Determine which content to show based on activeTab */}
        {(() => {
          // Calculate tab indices dynamically
          let currentTabIndex = 0;
          const openaiTabIndex = hasDualAnalysis && hasOpenAI ? currentTabIndex++ : -1;
          const deepseekTabIndex = hasDualAnalysis && hasDeepSeek ? currentTabIndex++ : -1;
          const legacyTabIndex = !hasDualAnalysis ? currentTabIndex++ : -1;
          const economicTabIndex = hasEconomicContext ? currentTabIndex++ : -1;

          // Show OpenAI tab content
          if (activeTab === openaiTabIndex && analysis.openaiAnalysis) {
            return (
              <>
                <AIAnalysisContent
                  analysisData={analysis.openaiAnalysis}
                  providerName="OpenAI"
                  analysis={analysis}
                />

                {/* Show error if exists */}
                {analysis.aiErrors?.openai && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WarningIcon color="warning" />
                      <Typography variant="body2" color="text.primary">
                        <strong>Note:</strong> {analysis.aiErrors.openai}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Action Buttons */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 2,
                        justifyContent: "center",
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
              </>
            );
          }

          // Show DeepSeek tab content
          if (activeTab === deepseekTabIndex && analysis.deepseekAnalysis) {
            return (
              <>
                <AIAnalysisContent
                  analysisData={analysis.deepseekAnalysis}
                  providerName="DeepSeek"
                  analysis={analysis}
                />

                {/* Show error if exists */}
                {analysis.aiErrors?.deepseek && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WarningIcon color="warning" />
                      <Typography variant="body2" color="text.primary">
                        <strong>Note:</strong> {analysis.aiErrors.deepseek}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Action Buttons */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 2,
                        justifyContent: "center",
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
              </>
            );
          }

          // Show legacy single analysis (backward compatibility)
          if (activeTab === legacyTabIndex) {
            return (
              <>
                <AIAnalysisContent
                  analysisData={{
                    action: analysis.action,
                    confidence: analysis.confidence,
                    timeframe: analysis.timeframe,
                    reasons: analysis.reasons,
                    tradeSetup: analysis.tradeSetup,
                  }}
                  providerName="AI"
                  analysis={analysis}
                />

                {/* Action Buttons */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 2,
                        justifyContent: "center",
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
              </>
            );
          }

          // Show economic context
          if (activeTab === economicTabIndex && analysis.economicContext) {
            return (
              <Box sx={{ py: 2 }}>
                <EconomicContextPanel
                  economicContext={analysis.economicContext}
                />
              </Box>
            );
          }

          return null;
        })()}
      </CardContent>
    </Card>
  );
}
