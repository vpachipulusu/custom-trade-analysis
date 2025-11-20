import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Collapse,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import EconomicEventCard from "./EconomicEventCard";
import { EconomicEvent } from "@/lib/services/economicCalendar";

interface EconomicEventsListProps {
  events: EconomicEvent[];
  title: string;
  emptyMessage?: string;
}

export default function EconomicEventsList({
  events,
  title,
  emptyMessage = "No events found",
}: EconomicEventsListProps) {
  const [impactFilter, setImpactFilter] = useState<string>("ALL");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Filter events by impact
  const filteredEvents =
    impactFilter === "ALL"
      ? events
      : events.filter((event) => {
          if (impactFilter === "HIGH") return event.impact === "HIGH";
          if (impactFilter === "MEDIUM+")
            return event.impact === "MEDIUM" || event.impact === "HIGH";
          return true;
        });

  // Group events by day
  const eventsByDay = filteredEvents.reduce((acc, event) => {
    const eventDate =
      typeof event.date === "string" ? parseISO(event.date) : event.date;
    const dayKey = format(eventDate, "yyyy-MM-dd");
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(event);
    return acc;
  }, {} as Record<string, EconomicEvent[]>);

  const sortedDays = Object.keys(eventsByDay).sort();

  const toggleDay = (day: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  if (events.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">{title}</Typography>
        <ToggleButtonGroup
          value={impactFilter}
          exclusive
          onChange={(_, value) => value && setImpactFilter(value)}
          size="small"
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="MEDIUM+">Medium+</ToggleButton>
          <ToggleButton value="HIGH">High Only</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {sortedDays.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        sortedDays.map((day) => {
          const dayEvents = eventsByDay[day];
          const isExpanded = expandedDays.has(day);
          const dayDate = parseISO(day);

          return (
            <Paper key={day} sx={{ mb: 1, overflow: "hidden" }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={1.5}
                sx={{
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => toggleDay(day)}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    {format(dayDate, "EEEE, MMM dd")}
                  </Typography>
                  <Chip label={`${dayEvents.length} events`} size="small" />
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={isExpanded}>
                <Box p={2} pt={0}>
                  {dayEvents.map((event) => (
                    <EconomicEventCard key={event.id} event={event} compact />
                  ))}
                </Box>
              </Collapse>
            </Paper>
          );
        })
      )}
    </Box>
  );
}
