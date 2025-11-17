import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
} from "@mui/material";
import { format } from "date-fns";
import { EconomicEvent } from "@/lib/services/economicCalendar";

interface EconomicEventCardProps {
  event: EconomicEvent;
  compact?: boolean;
}

const impactColors = {
  LOW: "#4caf50",
  MEDIUM: "#ff9800",
  HIGH: "#f44336",
};

const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  EU: "🇪🇺",
  GB: "🇬🇧",
  JP: "🇯🇵",
  CH: "🇨🇭",
  AU: "🇦🇺",
  CA: "🇨🇦",
  NZ: "🇳🇿",
  CN: "🇨🇳",
};

export default function EconomicEventCard({
  event,
  compact = false,
}: EconomicEventCardProps) {
  const eventDate =
    typeof event.date === "string" ? new Date(event.date) : event.date;
  const flag = countryFlags[event.country] || "🌐";

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${impactColors[event.impact]}`,
        mb: 1,
        transition: "box-shadow 0.2s",
        "&:hover": {
          boxShadow: 3,
        },
      }}
    >
      <CardContent
        sx={{
          py: compact ? 1.5 : 2,
          "&:last-child": { pb: compact ? 1.5 : 2 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="h6" component="span" fontSize="1.2rem">
            {flag}
          </Typography>
          <Chip
            label={event.impact}
            size="small"
            sx={{
              backgroundColor: impactColors[event.impact],
              color: "white",
              fontWeight: 600,
              fontSize: "0.7rem",
            }}
          />
          <Chip
            label={event.category}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.7rem" }}
          />
          {event.currency && (
            <Chip
              label={event.currency}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.7rem" }}
            />
          )}
        </Box>

        <Typography variant="body1" fontWeight={500} gutterBottom>
          {event.event}
        </Typography>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            {format(eventDate, "MMM dd, yyyy")}{" "}
            {event.time && `at ${event.time}`}
          </Typography>

          {(event.actual || event.forecast || event.previous) && (
            <Box display="flex" gap={1} flexWrap="wrap">
              {event.previous && (
                <Tooltip title="Previous">
                  <Chip
                    label={`Prev: ${event.previous}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.65rem" }}
                  />
                </Tooltip>
              )}
              {event.forecast && (
                <Tooltip title="Forecast">
                  <Chip
                    label={`Fcst: ${event.forecast}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.65rem" }}
                  />
                </Tooltip>
              )}
              {event.actual && (
                <Tooltip title="Actual">
                  <Chip
                    label={`Act: ${event.actual}`}
                    size="small"
                    color="primary"
                    sx={{ fontSize: "0.65rem" }}
                  />
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
