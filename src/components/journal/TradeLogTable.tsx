"use client";

import { useState, useEffect, useMemo } from "react";
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
  TablePagination,
  TableFooter,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { format, parse } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useJournal } from "@/contexts/JournalContext";
import { formatCurrency } from "@/lib/utils/currency";
import TradeDetailsDialog from "./TradeDetailsDialog";
import CloseTradeDialog from "./CloseTradeDialog";

type SortField = "instrument" | "entryDate" | "exitDate" | "pl" | "costs";
type SortDirection = "asc" | "desc";

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
  exitDate?: string;
  exitTime?: string;
  tradeCosts: string;
  riskRewardRatio?: string;
  closedPositionPL?: string;
  accountChangePercent?: string;
  tradeScreenshot?: string;
  tradeNotes?: string;
  disciplineRating?: number;
  emotionalState?: string;
  status: string;
  accountNumber?: string;
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

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("");
  const [plFilter, setPLFilter] = useState("all"); // all, won, lost, breakeven
  const [accountNumberFilter, setAccountNumberFilter] = useState("");

  // Get unique instruments and account numbers for dropdowns
  const uniqueInstruments = useMemo(() => {
    const instruments = new Set(trades.map((t) => t.market).filter(Boolean));
    return Array.from(instruments).sort();
  }, [trades]);

  const uniqueAccountNumbers = useMemo(() => {
    const accounts = new Set(
      trades.map((t) => t.accountNumber).filter(Boolean)
    );
    return Array.from(accounts).sort();
  }, [trades]);

  useEffect(() => {
    fetchTrades();
  }, [refreshTrigger]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/journal/trades`, {
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

  // Apply filters and sorting on client side
  const filteredAndSortedTrades = useMemo(() => {
    let result = trades.filter((trade) => {
      // Status filter
      if (statusFilter !== "all" && trade.status !== statusFilter) return false;

      // Market/Instrument filter
      if (marketFilter && trade.market !== marketFilter) return false;

      // Account number filter
      if (accountNumberFilter && trade.accountNumber !== accountNumberFilter)
        return false;

      // P/L filter (won/lost/breakeven)
      if (plFilter !== "all") {
        const pl = trade.closedPositionPL
          ? parseFloat(trade.closedPositionPL)
          : null;
        if (pl === null) return false;

        if (plFilter === "won" && pl <= 0) return false;
        if (plFilter === "lost" && pl >= 0) return false;
        if (plFilter === "breakeven" && pl !== 0) return false;
      }

      return true;
    });

    // Apply sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case "instrument":
            aVal = a.market || "";
            bVal = b.market || "";
            break;
          case "entryDate":
            try {
              aVal = new Date(a.date).getTime();
              bVal = new Date(b.date).getTime();
            } catch {
              aVal = 0;
              bVal = 0;
            }
            break;
          case "exitDate":
            try {
              aVal = a.exitDate ? new Date(a.exitDate).getTime() : 0;
              bVal = b.exitDate ? new Date(b.exitDate).getTime() : 0;
            } catch {
              aVal = 0;
              bVal = 0;
            }
            break;
          case "pl":
            aVal = a.closedPositionPL ? parseFloat(a.closedPositionPL) : 0;
            bVal = b.closedPositionPL ? parseFloat(b.closedPositionPL) : 0;
            break;
          case "costs":
            aVal = a.tradeCosts ? parseFloat(a.tradeCosts) : 0;
            bVal = b.tradeCosts ? parseFloat(b.tradeCosts) : 0;
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return result;
  }, [
    trades,
    statusFilter,
    marketFilter,
    accountNumberFilter,
    plFilter,
    sortField,
    sortDirection,
  ]);

  // Paginate filtered trades
  const paginatedTrades = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedTrades.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedTrades, page, rowsPerPage]);

  // Calculate page totals
  const pageTotals = useMemo(() => {
    const totalPL = paginatedTrades.reduce((sum, trade) => {
      const pl = trade.closedPositionPL
        ? parseFloat(trade.closedPositionPL)
        : 0;
      return sum + pl;
    }, 0);

    const totalCosts = paginatedTrades.reduce((sum, trade) => {
      const cost = trade.tradeCosts ? parseFloat(trade.tradeCosts) : 0;
      return sum + cost;
    }, 0);

    return { totalPL, totalCosts };
  }, [paginatedTrades]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setMarketFilter("");
    setPLFilter("all");
    setAccountNumberFilter("");
    setPage(0);
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
      {/* Advanced Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Result</InputLabel>
            <Select
              value={plFilter}
              label="Result"
              onChange={(e) => {
                setPLFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="won">Won</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
              <MenuItem value="breakeven">Break-Even</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Instrument</InputLabel>
            <Select
              value={marketFilter}
              label="Instrument"
              onChange={(e) => {
                setMarketFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueInstruments.map((inst) => (
                <MenuItem key={inst} value={inst}>
                  {inst}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Account Number</InputLabel>
            <Select
              value={accountNumberFilter}
              label="Account Number"
              onChange={(e) => {
                setAccountNumberFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueAccountNumbers.map((acc) => (
                <MenuItem key={acc} value={acc}>
                  {acc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ alignSelf: "center" }}
          >
            {filteredAndSortedTrades.length} trade
            {filteredAndSortedTrades.length !== 1 ? "s" : ""} found
          </Typography>
        </Stack>
      </Paper>

      {filteredAndSortedTrades.length === 0 ? (
        <Alert severity="info">
          {trades.length === 0
            ? "No trades found. Add your first trade to get started!"
            : "No trades match the current filters."}
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    onClick={() => handleSort("entryDate")}
                    sx={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      Entry Date/Time
                      {sortField === "entryDate" ? (
                        sortDirection === "asc" ? (
                          <ArrowUpwardIcon fontSize="small" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" />
                        )
                      ) : (
                        <UnfoldMoreIcon
                          fontSize="small"
                          sx={{ opacity: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell
                    onClick={() => handleSort("instrument")}
                    sx={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      Instrument
                      {sortField === "instrument" ? (
                        sortDirection === "asc" ? (
                          <ArrowUpwardIcon fontSize="small" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" />
                        )
                      ) : (
                        <UnfoldMoreIcon
                          fontSize="small"
                          sx={{ opacity: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">Entry Price</TableCell>
                  <TableCell align="right">Position Size</TableCell>
                  <TableCell align="right">Stop Loss</TableCell>
                  <TableCell align="right">Take Profit</TableCell>
                  <TableCell align="right">Exit Price</TableCell>
                  <TableCell
                    onClick={() => handleSort("exitDate")}
                    sx={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      Exit Date/Time
                      {sortField === "exitDate" ? (
                        sortDirection === "asc" ? (
                          <ArrowUpwardIcon fontSize="small" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" />
                        )
                      ) : (
                        <UnfoldMoreIcon
                          fontSize="small"
                          sx={{ opacity: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={() => handleSort("pl")}
                    sx={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      P/L
                      {sortField === "pl" ? (
                        sortDirection === "asc" ? (
                          <ArrowUpwardIcon fontSize="small" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" />
                        )
                      ) : (
                        <UnfoldMoreIcon
                          fontSize="small"
                          sx={{ opacity: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={() => handleSort("costs")}
                    sx={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      Costs
                      {sortField === "costs" ? (
                        sortDirection === "asc" ? (
                          <ArrowUpwardIcon fontSize="small" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" />
                        )
                      ) : (
                        <UnfoldMoreIcon
                          fontSize="small"
                          sx={{ opacity: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTrades.map((trade) => (
                  <TableRow key={trade.id} hover>
                    <TableCell>
                      {format(new Date(trade.date), "dd/MM/yyyy")} {trade.time}
                    </TableCell>
                    <TableCell>{trade.accountNumber || "-"}</TableCell>
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
                    <TableCell>
                      {trade.exitDate && trade.exitTime
                        ? `${format(new Date(trade.exitDate), "dd/MM/yyyy")} ${
                            trade.exitTime
                          }`
                        : "-"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: trade.closedPositionPL
                          ? parseFloat(trade.closedPositionPL) >= 0
                            ? "success.main"
                            : "error.main"
                          : "inherit",
                        fontWeight: "bold",
                      }}
                    >
                      {formatCurrency(trade.closedPositionPL, currency)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(trade.tradeCosts, currency)}
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
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="right"
                    sx={{ fontWeight: "bold" }}
                  >
                    Page Totals:
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: "bold",
                      color:
                        pageTotals.totalPL >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {formatCurrency(pageTotals.totalPL.toString(), currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatCurrency(pageTotals.totalCosts.toString(), currency)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredAndSortedTrades.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
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
