import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Box,
  Chip,
  Typography,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import { format } from "date-fns";
import { Layout } from "@/hooks/useLayouts";
import { useDeleteLayout } from "@/hooks/useLayouts";
import AddLayoutDialog from "./AddLayoutDialog";
import EditLayoutDialog from "./EditLayoutDialog";
import ViewSnapshotsDialog from "./ViewSnapshotsDialog";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import DashboardSettingsDialog from "./DashboardSettingsDialog";
import { useCreateSnapshot } from "@/hooks/useSnapshots";
import { useCreateSymbolAnalysis } from "@/hooks/useAnalyses";
import { getLogger } from "@/lib/logging";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

interface LayoutsTableProps {
  layouts: Layout[];
  onRefresh: () => void;
}

export default function LayoutsTable({
  layouts,
  onRefresh,
}: LayoutsTableProps) {
  const logger = getLogger();
  const { getAuthToken } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<{
    defaultAiModel?: string;
    sessionid?: string;
    sessionidSign?: string;
  }>({});
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    layout: Layout | null;
  }>({
    open: false,
    layout: null,
  });

  // Fetch user settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getAuthToken();
        const response = await axios.get("/api/user/settings", {
          headers: { Authorization: token },
        });
        setUserSettings(response.data);
      } catch (error) {
        logger.error("Failed to fetch user settings", { error: error instanceof Error ? error.message : String(error) });
      }
    };
    loadSettings();
  }, [getAuthToken, logger]);
  const [viewSnapshotsDialog, setViewSnapshotsDialog] = useState<{
    open: boolean;
    layoutId: string | null;
  }>({
    open: false,
    layoutId: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    layoutId: string | null;
  }>({
    open: false,
    layoutId: null,
  });

  const deleteLayout = useDeleteLayout();
  const createSnapshot = useCreateSnapshot();
  const createSymbolAnalysis = useCreateSymbolAnalysis();
  const router = useRouter();

  const handleDelete = async () => {
    if (deleteDialog.layoutId) {
      try {
        await deleteLayout.mutateAsync(deleteDialog.layoutId);
        setDeleteDialog({ open: false, layoutId: null });
      } catch (error) {
        logger.error("Delete failed", {
          error: error instanceof Error ? error.message : String(error),
          layoutId: deleteDialog.layoutId,
        });
      }
    }
  };

  const handleGenerateSnapshot = async (layoutId: string) => {
    try {
      await createSnapshot.mutateAsync(layoutId);
    } catch (error) {
      logger.error("Snapshot generation failed", { error: error instanceof Error ? error.message : String(error), layoutId });
    }
  };

  const handleAnalyzeSymbol = async (symbol: string) => {
    try {
      const aiModel = userSettings.defaultAiModel || "gpt-4o";
      const analysis = await createSymbolAnalysis.mutateAsync({
        symbol,
        aiModel,
      });
      logger.info("Symbol analysis completed", {
        symbol,
        aiModel,
        analysisId: analysis.id,
      });
      router.push(`/analysis/${analysis.id}`);
    } catch (error) {
      logger.error("Symbol analysis failed", { error: error instanceof Error ? error.message : String(error), symbol });
    }
  };

  const handleSettingsSaved = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.get("/api/user/settings", {
        headers: { Authorization: token },
      });
      setUserSettings(response.data);
    } catch (error) {
      logger.error("Failed to reload user settings", { error: error instanceof Error ? error.message : String(error) });
    }
  };

  // Group layouts by symbol to show multi-layout analyze option
  const layoutsBySymbol = layouts.reduce((acc, layout) => {
    const symbol = layout.symbol || "Unknown";
    if (!acc[symbol]) {
      acc[symbol] = [];
    }
    acc[symbol].push(layout);
    return acc;
  }, {} as Record<string, Layout[]>);

  // Sort symbols alphabetically and group layouts
  const sortedSymbols = Object.keys(layoutsBySymbol).sort();
  const groupedLayouts: { symbol: string; layouts: Layout[] }[] =
    sortedSymbols.map((symbol) => ({
      symbol,
      layouts: layoutsBySymbol[symbol].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));

  if (layouts.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No layouts yet. Create your first layout to get started.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          sx={{ mt: 2 }}
        >
          Add Layout
        </Button>
        <AddLayoutDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSuccess={() => {
            setAddDialogOpen(false);
            onRefresh();
          }}
        />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsDialogOpen(true)}
        >
          Settings
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Layout
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Interval</TableCell>
              <TableCell>Layout ID</TableCell>
              <TableCell>Snapshots</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedLayouts.map((group) => {
              const hasMultipleLayouts = group.layouts.length > 1;

              return group.layouts.map((layout, index) => {
                const isFirstInGroup = index === 0;

                return (
                  <TableRow
                    key={layout.id}
                    sx={{
                      borderTop:
                        isFirstInGroup && index !== 0
                          ? "2px solid #e0e0e0"
                          : undefined,
                    }}
                  >
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {isFirstInGroup && (
                          <>
                            <Typography
                              variant="body2"
                              fontWeight={hasMultipleLayouts ? 600 : 400}
                            >
                              {layout.symbol || "-"}
                            </Typography>
                            {hasMultipleLayouts && (
                              <Chip
                                label={`${group.layouts.length} layouts`}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                          </>
                        )}
                        {!isFirstInGroup && (
                          <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ pl: 2 }}
                          >
                            ↳
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{layout.interval || "-"}</TableCell>
                    <TableCell>
                      {layout.layoutId ? (
                        <Chip label={layout.layoutId} size="small" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={layout.snapshotCount}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(layout.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell align="right">
                      {isFirstInGroup &&
                        hasMultipleLayouts &&
                        layout.symbol && (
                          <Tooltip title="Analyze all layouts for this symbol">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                handleAnalyzeSymbol(layout.symbol!)
                              }
                              disabled={createSymbolAnalysis.isPending}
                            >
                              <AnalyticsIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      <IconButton
                        size="small"
                        color="primary"
                        title="Generate Snapshot"
                        onClick={() => handleGenerateSnapshot(layout.id)}
                        disabled={createSnapshot.isPending}
                      >
                        <CameraAltIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="info"
                        title="View Snapshots"
                        onClick={() =>
                          setViewSnapshotsDialog({
                            open: true,
                            layoutId: layout.id,
                          })
                        }
                      >
                        <PhotoLibraryIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="secondary"
                        title="Edit"
                        onClick={() => setEditDialog({ open: true, layout })}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Delete"
                        onClick={() =>
                          setDeleteDialog({ open: true, layoutId: layout.id })
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              });
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <AddLayoutDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={() => {
          setAddDialogOpen(false);
          onRefresh();
        }}
      />

      {editDialog.layout && (
        <EditLayoutDialog
          open={editDialog.open}
          layout={editDialog.layout}
          onClose={() => setEditDialog({ open: false, layout: null })}
          onSuccess={() => {
            setEditDialog({ open: false, layout: null });
            onRefresh();
          }}
        />
      )}

      <ViewSnapshotsDialog
        open={viewSnapshotsDialog.open}
        layoutId={viewSnapshotsDialog.layoutId}
        onClose={() => setViewSnapshotsDialog({ open: false, layoutId: null })}
      />

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        title="Delete Layout"
        message="Are you sure you want to delete this layout? This will also delete all associated snapshots and analyses."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, layoutId: null })}
      />

      <DashboardSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        currentSettings={userSettings}
        onSave={handleSettingsSaved}
      />
    </>
  );
}
