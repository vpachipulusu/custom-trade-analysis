"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import {
  ViewList as ViewListIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { ProtectedRoute } from '@/components/layout';
import { Layout } from '@/components/layout';
import { EconomicEventsList } from '@/components/economic';
import { EconomicEvent } from "@/lib/services/economicCalendar";

const COUNTRIES = [
  { code: "ALL", name: "All Countries" },
  { code: "US", name: "United States" },
  { code: "EU", name: "European Union" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "NZ", name: "New Zealand" },
];

const IMPACTS = [
  { value: "ALL", label: "All Impacts" },
  { value: "HIGH", label: "High Impact" },
  { value: "MEDIUM", label: "Medium Impact" },
  { value: "LOW", label: "Low Impact" },
];

const CATEGORIES = [
  { value: "ALL", label: "All Categories" },
  { value: "INTEREST_RATE", label: "Interest Rates" },
  { value: "EMPLOYMENT", label: "Employment" },
  { value: "INFLATION", label: "Inflation" },
  { value: "GDP", label: "GDP" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "CONSUMER", label: "Consumer Data" },
  { value: "HOUSING", label: "Housing" },
  { value: "TRADE", label: "Trade" },
];

export default function EconomicCalendarPage() {
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date>(
    endOfDay(addDays(new Date(), 7))
  );
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedImpact, setSelectedImpact] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [symbol, setSymbol] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (symbol) params.append("symbol", symbol);
      params.append("startDate", startDate.toISOString());
      params.append("endDate", endDate.toISOString());
      if (selectedCountry !== "ALL")
        params.append("countries", selectedCountry);
      if (selectedImpact !== "ALL") params.append("impact", selectedImpact);

      const response = await fetch(`/api/economic-events?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch economic events");
      }

      const data = await response.json();

      // Filter by category on client side
      let filteredEvents = data.events || [];
      if (selectedCategory !== "ALL") {
        filteredEvents = filteredEvents.filter(
          (event: EconomicEvent) => event.category === selectedCategory
        );
      }

      setEvents(filteredEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      [
        "Date",
        "Time",
        "Country",
        "Event",
        "Impact",
        "Currency",
        "Actual",
        "Forecast",
        "Previous",
        "Category",
      ].join(","),
      ...events.map((event) =>
        [
          event.date instanceof Date
            ? event.date.toISOString().split("T")[0]
            : event.date,
          event.time ?? "",
          event.country,
          `"${event.event}"`,
          event.impact,
          event.currency ?? "",
          event.actual ?? "",
          event.forecast ?? "",
          event.previous ?? "",
          event.category,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `economic-calendar-${
      startDate.toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <Box>
          <Typography variant="h4" gutterBottom>
            Economic Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Track high-impact economic events that may affect your trading
            decisions
          </Typography>

          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(date) =>
                        date && setStartDate(startOfDay(date))
                      }
                      slotProps={{
                        textField: { fullWidth: true, size: "small" },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(date) => date && setEndDate(endOfDay(date))}
                      slotProps={{
                        textField: { fullWidth: true, size: "small" },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Symbol (optional)"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g., EURUSD, BTCUSD"
                      helperText="Auto-filters by relevant currencies"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Country</InputLabel>
                      <Select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        label="Country"
                      >
                        {COUNTRIES.map((country) => (
                          <MenuItem key={country.code} value={country.code}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Impact</InputLabel>
                      <Select
                        value={selectedImpact}
                        onChange={(e) => setSelectedImpact(e.target.value)}
                        label="Impact"
                      >
                        {IMPACTS.map((impact) => (
                          <MenuItem key={impact.value} value={impact.value}>
                            {impact.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        label="Category"
                      >
                        {CATEGORIES.map((category) => (
                          <MenuItem key={category.value} value={category.value}>
                            {category.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        onClick={fetchEvents}
                        disabled={loading}
                        startIcon={
                          loading ? (
                            <CircularProgress size={16} />
                          ) : (
                            <RefreshIcon />
                          )
                        }
                        fullWidth
                      >
                        {loading ? "Loading..." : "Load Events"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleExportCSV}
                        disabled={events.length === 0}
                        startIcon={<DownloadIcon />}
                        fullWidth
                      >
                        Export CSV
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </LocalizationProvider>
            </CardContent>
          </Card>

          {/* View Mode Toggle */}
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {events.length} events found
              </Typography>
              {selectedCountry !== "ALL" && (
                <Chip
                  label={
                    COUNTRIES.find((c) => c.code === selectedCountry)?.name
                  }
                  size="small"
                  onDelete={() => setSelectedCountry("ALL")}
                />
              )}
              {selectedImpact !== "ALL" && (
                <Chip
                  label={`${selectedImpact} Impact`}
                  size="small"
                  onDelete={() => setSelectedImpact("ALL")}
                />
              )}
              {selectedCategory !== "ALL" && (
                <Chip
                  label={
                    CATEGORIES.find((c) => c.value === selectedCategory)?.label
                  }
                  size="small"
                  onDelete={() => setSelectedCategory("ALL")}
                />
              )}
            </Box>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="list">
                <ViewListIcon sx={{ mr: 1 }} />
                List
              </ToggleButton>
              <ToggleButton value="calendar">
                <CalendarIcon sx={{ mr: 1 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Events Display */}
          {!loading && !error && (
            <>
              {viewMode === "list" ? (
                <EconomicEventsList events={events} title="Economic Events" />
              ) : (
                <Card>
                  <CardContent>
                    <Alert severity="info">
                      Calendar view coming soon! Use list view to see all
                      events.
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && events.length === 0 && (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <CalendarIcon
                    sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    No Events Found
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Click "Load Events" to fetch economic calendar data
                  </Typography>
                  <Alert severity="warning" sx={{ maxWidth: 500, mx: "auto" }}>
                    <Typography variant="body2">
                      <strong>Setup Required:</strong> Add your FMP_API_KEY to
                      .env.local
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Get a free API key at financialmodelingprep.com (250
                      requests/day)
                    </Typography>
                  </Alert>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Layout>
    </ProtectedRoute>
  );
}
