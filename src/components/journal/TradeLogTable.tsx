"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Button,
  Stack,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useJournal } from "@/contexts/JournalContext";
import { formatCurrency } from "@/lib/utils/currency";
import TradeDetailsDialog from "./TradeDetailsDialog";
import CloseTradeDialog from "./CloseTradeDialog";

interface Trade {
  id: string;
  date: string;
  time: string;
  direction: string;
  market: string;
  entryPrice: string;
  accountBalance: string;
  positionSize: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  actualExitPrice?: string;
  tradeCosts: string;
  riskRewardRatio?: string;
  closedPositionPL?: string;
  accountChangePercent?: string;
  tradeScreenshot?: string;
  tradeNotes?: string;
  disciplineRating?: number;
  emotionalState?: string;
  status: string;
}

interface Props {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function TradeLogTable({ refreshTrigger, onRefresh }: Props) {
  const { user } = useAuth();
  const { currency } = useJournal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [closeTradeOpen, setCloseTradeOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTrade, setMenuTrade] = useState<Trade | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("");

  useEffect(() => {
    fetchTrades();
  }, [refreshTrigger, statusFilter, marketFilter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (marketFilter) params.append("market", marketFilter);

      const res = await fetch(`/api/journal/trades?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch trades");

      const data = await res.json();
      setTrades(data.trades);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    trade: Trade
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuTrade(trade);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTrade(null);
  };

  const handleViewDetails = () => {
    if (menuTrade) {
      setSelectedTrade(menuTrade);
      setDetailsOpen(true);
    }
    handleMenuClose();
  };

  const handleCloseTrade = () => {
    if (menuTrade) {
      setSelectedTrade(menuTrade);
      setCloseTradeOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteTrade = async () => {
    if (!menuTrade || !confirm("Are you sure you want to delete this trade?")) {
      handleMenuClose();
      return;
    }

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/journal/trades/${menuTrade.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete trade");

      onRefresh?.();
      handleMenuClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trade");
      handleMenuClose();
    }
  };

  const formatPercent = (value: string | undefined) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return `${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Market"
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          placeholder="e.g. GBPUSD"
        />
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => {
            setStatusFilter("all");
            setMarketFilter("");
          }}
        >
          Clear Filters
        </Button>
      </Stack>

      {trades.length === 0 ? (
        <Alert severity="info">
          No trades found. Add your first trade to get started!
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Market</TableCell>
                <TableCell align="right">Entry Price</TableCell>
                <TableCell align="right">Position Size</TableCell>
                <TableCell align="right">Stop Loss</TableCell>
                <TableCell align="right">Take Profit</TableCell>
                <TableCell align="right">Exit Price</TableCell>
                <TableCell>R:R</TableCell>
                <TableCell align="right">P/L</TableCell>
                <TableCell align="right">Change %</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id} hover>
                  <TableCell>
                    {format(new Date(trade.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{trade.time}</TableCell>
                  <TableCell>
                    <Chip
                      label={trade.direction}
                      size="small"
                      color={trade.direction === "Long" ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>{trade.market}</TableCell>
                  <TableCell align="right">
                    {parseFloat(trade.entryPrice).toFixed(5)}
                  </TableCell>
                  <TableCell align="right">
                    {parseFloat(trade.positionSize).toFixed(4)}
                  </TableCell>
                  <TableCell align="right">
                    {trade.stopLossPrice
                      ? parseFloat(trade.stopLossPrice).toFixed(5)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {trade.takeProfitPrice
                      ? parseFloat(trade.takeProfitPrice).toFixed(5)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {trade.actualExitPrice
                      ? parseFloat(trade.actualExitPrice).toFixed(5)
                      : "-"}
                  </TableCell>
                  <TableCell>{trade.riskRewardRatio || "-"}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: trade.closedPositionPL
                        ? parseFloat(trade.closedPositionPL) >= 0
                          ? "success.main"
                          : "error.main"
                        : "inherit",
                    }}
                  >
                    {formatCurrency(trade.closedPositionPL, currency)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: trade.accountChangePercent
                        ? parseFloat(trade.accountChangePercent) >= 0
                          ? "success.main"
                          : "error.main"
                        : "inherit",
                    }}
                  >
                    {formatPercent(trade.accountChangePercent)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={trade.status}
                      size="small"
                      color={trade.status === "open" ? "warning" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, trade)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
        {menuTrade?.status === "open" && (
          <MenuItem onClick={handleCloseTrade}>Close Trade</MenuItem>
        )}
        <MenuItem onClick={handleDeleteTrade} sx={{ color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>

      {selectedTrade && (
        <>
          <TradeDetailsDialog
            open={detailsOpen}
            trade={selectedTrade}
            onClose={() => {
              setDetailsOpen(false);
              setSelectedTrade(null);
            }}
            onRefresh={onRefresh}
          />
          <CloseTradeDialog
            open={closeTradeOpen}
            trade={selectedTrade}
            onClose={() => {
              setCloseTradeOpen(false);
              setSelectedTrade(null);
            }}
            onTradeClosed={() => {
              setCloseTradeOpen(false);
              setSelectedTrade(null);
              onRefresh?.();
            }}
          />
        </>
      )}
    </Box>
  );
}
