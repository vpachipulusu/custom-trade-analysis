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
  Paper,
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
import AIModelSelector, { AIModelBadge } from "./AIModelSelector";

interface AnalysisDisplayProps {
  analysis: Analysis;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
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
    </Grid>
  );
}

export default function AnalysisDisplay({ analysis, selectedModel, onModelChange }: AnalysisDisplayProps) {
  const logger = getLogger();
  const router = useRouter();
  const createSnapshot = useCreateSnapshot();
  const createAnalysis = useCreateAnalysis();
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Use selectedModel if provided, otherwise fall back to analysis.aiModel
  const currentModel = selectedModel || analysis.aiModel;

  const hasEconomicContext = !!analysis.economicContext;
  const isMultiLayout = analysis.isMultiLayout && !!analysis.multiLayoutData;
  const multiLayoutSnapshots = analysis.multiLayoutData?.multiLayoutSnapshots || [];
  const layoutsAnalyzed = analysis.multiLayoutData?.layoutsAnalyzed || 0;
  const intervals = analysis.multiLayoutData?.intervals || [];
  const hasOpenAI = !!analysis.openaiAnalysis;
  const hasDeepSeek = !!analysis.deepseekAnalysis;
  const hasDualAnalysis = hasOpenAI || hasDeepSeek;

  // Debug logging for AI model
  console.log("AI Model Info:", {
    aiModel: analysis.aiModel,
    aiModelName: analysis.aiModelName,
    displayValue: analysis.aiModelName || analysis.aiModel || 'AI Model'
  });

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const layoutId = analysis.snapshot.layoutId;
      const snapshot = await createSnapshot.mutateAsync(layoutId);
      const newAnalysis = await createAnalysis.mutateAsync({
        snapshotId: snapshot.id,
        aiModel: currentModel || undefined
      });
      router.push(`/analysis/${newAnalysis.id}`);
    } catch (error) {
      logger.error("Regeneration failed", {
        error: error instanceof Error ? error.message : String(error),
        layoutId: analysis.snapshot.layoutId,
        aiModel: currentModel,
      });

      // Extract error message from axios error
      let errorMessage = "Failed to regenerate analysis. Please try again.";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.error) {
          errorMessage = `Analysis failed: ${axiosError.response.data.error}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Analysis failed: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card elevation={3}>
      {/* Analysis Info Header */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          p: 2.5
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Symbol and Interval */}
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              {analysis.snapshot.layout.symbol && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Symbol:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {analysis.snapshot.layout.symbol}
                  </Typography>
                </Box>
              )}
              {analysis.snapshot.layout.interval && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Interval:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {analysis.snapshot.layout.interval}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* AI Model Badge */}
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SmartToyIcon sx={{ fontSize: 24 }} />
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                  Generated by
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {analysis.aiModelName || analysis.aiModel || 'AI Model'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Multi-Layout Badge or Date */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
              {isMultiLayout && (
                <Chip
                  label={`Multi-Layout • ${layoutsAnalyzed} Charts`}
                  size="medium"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              )}
              <Typography variant="caption" sx={{ opacity: 0.8, alignSelf: 'center' }}>
                {format(new Date(analysis.createdAt), "MMM dd, yyyy HH:mm")}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Chart Images Section */}
      {isMultiLayout ? (
        <Box>
          <Box sx={{ p: 2, bgcolor: "grey.100", borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Timeframes: {intervals.join(", ")}
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

                {/* AI Model Selector */}
                {onModelChange && (
                  <Paper
                    elevation={2}
                    sx={{
                      mt: 3,
                      overflow: 'hidden',
                      borderRadius: 2
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.100',
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Select AI Model for New Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose a different model and click "Generate New Analysis" below
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                      <AIModelSelector
                        value={selectedModel || ''}
                        onChange={onModelChange}
                      />
                    </Box>
                  </Paper>
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

                {/* AI Model Selector */}
                {onModelChange && (
                  <Paper
                    elevation={2}
                    sx={{
                      mt: 3,
                      overflow: 'hidden',
                      borderRadius: 2
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.100',
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Select AI Model for New Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose a different model and click "Generate New Analysis" below
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                      <AIModelSelector
                        value={selectedModel || ''}
                        onChange={onModelChange}
                      />
                    </Box>
                  </Paper>
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

                {/* AI Model Selector */}
                {onModelChange && (
                  <Paper
                    elevation={2}
                    sx={{
                      mt: 3,
                      overflow: 'hidden',
                      borderRadius: 2
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.100',
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Select AI Model for New Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose a different model and click "Generate New Analysis" below
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                      <AIModelSelector
                        value={selectedModel || ''}
                        onChange={onModelChange}
                      />
                    </Box>
                  </Paper>
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
