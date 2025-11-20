import React from "react";
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  ExpandMore,
  Warning as WarningIcon,
  Lightbulb,
  Info as InfoIcon,
} from "@mui/icons-material";
import { RiskLevelBadge, OutlookChip } from "@/components/common";
import EconomicEventsList from "./EconomicEventsList";
import { EconomicEvent } from "@/lib/services/economicCalendar";

interface EconomicContextData {
  symbol: string;
  immediateRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  weeklyOutlook: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  impactSummary: string;
  warnings: string[];
  opportunities: string[];
  recommendation?: string;
  upcomingEvents: EconomicEvent[];
  weeklyEvents: EconomicEvent[];
}

interface EconomicContextPanelProps {
  economicContext: EconomicContextData;
}

export default function EconomicContextPanel({
  economicContext,
}: EconomicContextPanelProps) {
  const {
    immediateRisk,
    weeklyOutlook,
    impactSummary,
    warnings,
    opportunities,
    recommendation,
    upcomingEvents,
    weeklyEvents,
  } = economicContext;

  const hasImmediateEvents = upcomingEvents && upcomingEvents.length > 0;
  const hasWeeklyEvents = weeklyEvents && weeklyEvents.length > 0;
  const isHighRisk = immediateRisk === "HIGH" || immediateRisk === "EXTREME";

  return (
    <Box>
      {/* Risk Overview Section */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
          <RiskLevelBadge riskLevel={immediateRisk} />
          <OutlookChip outlook={weeklyOutlook} />
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          {impactSummary}
        </Typography>
      </Paper>

      {/* Immediate Risk Accordion */}
      <Accordion defaultExpanded={isHighRisk} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            {isHighRisk && <WarningIcon color="error" />}
            <Typography variant="h6">⚠️ Events Within 1 Hour</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {hasImmediateEvents ? (
            <EconomicEventsList
              events={upcomingEvents}
              title=""
              emptyMessage="No immediate events"
            />
          ) : (
            <Box textAlign="center" py={3}>
              <Typography variant="body1" color="success.main">
                ✅ No immediate events
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Weekly Calendar Accordion */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">
              📅 This Week's Economic Calendar
            </Typography>
            {hasWeeklyEvents && (
              <Typography
                variant="caption"
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                {weeklyEvents.length} events
              </Typography>
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {hasWeeklyEvents ? (
            <EconomicEventsList
              events={weeklyEvents}
              title=""
              emptyMessage="No major events this week"
            />
          ) : (
            <Box textAlign="center" py={3}>
              <Typography variant="body1" color="text.secondary">
                No major events this week
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Warnings Section */}
      {warnings && warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>⚠️ Warnings</AlertTitle>
          <List dense>
            {warnings.map((warning, index) => (
              <ListItem key={index} disablePadding>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <WarningIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText primary={warning} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Opportunities Section */}
      {opportunities && opportunities.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>💡 Opportunities</AlertTitle>
          <List dense>
            {opportunities.map((opportunity, index) => (
              <ListItem key={index} disablePadding>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Lightbulb fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary={opportunity} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Recommendation Section */}
      {recommendation && (
        <Alert severity="info" icon={<InfoIcon />}>
          <AlertTitle>Recommendation</AlertTitle>
          <Typography variant="body2">{recommendation}</Typography>
        </Alert>
      )}
    </Box>
  );
}
