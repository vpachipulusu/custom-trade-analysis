import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TimelineIcon from "@mui/icons-material/Timeline";

interface TradeSetup {
  quality: "A" | "B" | "C";
  entryPrice: number | null;
  stopLoss: number | null;
  targetPrice: number | null;
  riskRewardRatio: number | null;
  setupDescription: string;
}

interface TradeSetupCardProps {
  tradeSetup: TradeSetup;
  action: string;
}

const TradeSetupCard: React.FC<TradeSetupCardProps> = ({
  tradeSetup,
  action,
}) => {
  // Smart price formatting based on magnitude
  const formatPrice = (price: number): string => {
    if (price >= 10000) {
      // BTC, large numbers - 2 decimals
      return price.toFixed(2);
    } else if (price >= 1000) {
      // Gold, medium numbers - 2 decimals
      return price.toFixed(2);
    } else if (price >= 10) {
      // Stocks, some forex - 3 decimals
      return price.toFixed(3);
    } else {
      // Forex pairs - 5 decimals
      return price.toFixed(5);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "A":
        return "success";
      case "B":
        return "warning";
      case "C":
        return "error";
      default:
        return "default";
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case "A":
        return "A Setup - Excellent";
      case "B":
        return "B Setup - Good";
      case "C":
        return "C Setup - Marginal";
      default:
        return quality;
    }
  };

  return (
    <Card
      sx={{
        mt: 2,
        border: "1px solid",
        borderColor:
          tradeSetup.quality === "A"
            ? "success.main"
            : tradeSetup.quality === "B"
            ? "warning.main"
            : "error.main",
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Trade Setup Analysis
          </Typography>
          <Chip
            label={getQualityLabel(tradeSetup.quality)}
            color={getQualityColor(tradeSetup.quality) as any}
            size="medium"
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          {/* Entry Price */}
          {tradeSetup.entryPrice !== null && (
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Entry Price
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TimelineIcon color="primary" fontSize="small" />
                  <Typography variant="h6">
                    {formatPrice(tradeSetup.entryPrice)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Stop Loss */}
          {tradeSetup.stopLoss !== null && (
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Stop Loss
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TrendingDownIcon color="error" fontSize="small" />
                  <Typography variant="h6" color="error.main">
                    {formatPrice(tradeSetup.stopLoss)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Target Price */}
          {tradeSetup.targetPrice !== null && (
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Target Price
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TrendingUpIcon color="success" fontSize="small" />
                  <Typography variant="h6" color="success.main">
                    {formatPrice(tradeSetup.targetPrice)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Risk:Reward Ratio */}
          {tradeSetup.riskRewardRatio !== null && (
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Risk:Reward
                </Typography>
                <Typography variant="h6" color="primary">
                  1:{tradeSetup.riskRewardRatio.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Setup Description */}
        {tradeSetup.setupDescription && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Setup Analysis:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.7 }}>
              {tradeSetup.setupDescription}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeSetupCard;
