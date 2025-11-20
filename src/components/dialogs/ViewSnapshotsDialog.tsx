import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useCreateAnalysis } from "@/hooks/useAnalyses";
import { SnapshotCard } from "@/components/analysis";
import { LoadingSpinner, ErrorAlert } from "@/components/common";
import { DeleteConfirmationDialog } from "@/components/dialogs";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { getLogger } from "@/lib/logging";

interface ViewSnapshotsDialogProps {
  open: boolean;
  layoutId: string | null;
  onClose: () => void;
}

export default function ViewSnapshotsDialog({
  open,
  layoutId,
  onClose,
}: ViewSnapshotsDialogProps) {
  const logger = getLogger();
  const { data: snapshots, isLoading, error } = useSnapshots(layoutId);
  const createAnalysis = useCreateAnalysis();
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    snapshotId: string | null;
  }>({
    open: false,
    snapshotId: null,
  });
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [userSettings, setUserSettings] = useState<{
    defaultAiModel?: string;
  }>({});

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
        logger.error("Failed to fetch user settings", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    if (open) {
      loadSettings();
    }
  }, [open, getAuthToken, logger]);

  const handleAnalyze = async (snapshotId: string) => {
    try {
      setActionLoading(snapshotId);
      const aiModel = userSettings.defaultAiModel || "gpt-4o";
      const analysis = await createAnalysis.mutateAsync({
        snapshotId,
        aiModel,
      });
      router.push(`/analysis/${analysis.id}`);
      onClose();
    } catch (error) {
      logger.error("Analysis failed", {
        error: error instanceof Error ? error.message : String(error),
        snapshotId,
      });
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.snapshotId) return;

    try {
      const token = await getAuthToken();
      await axios.delete(`/api/snapshots/${deleteDialog.snapshotId}`, {
        headers: { Authorization: token },
      });
      queryClient.invalidateQueries({ queryKey: ["snapshots", layoutId] });
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
      setDeleteDialog({ open: false, snapshotId: null });
    } catch (error) {
      logger.error("Delete failed", {
        error: error instanceof Error ? error.message : String(error),
        snapshotId: deleteDialog.snapshotId,
      });
    }
  };

  const handleDeleteAll = async () => {
    if (!layoutId) return;

    try {
      setDeletingAll(true);
      const token = await getAuthToken();
      await axios.delete(`/api/layouts/${layoutId}/snapshots`, {
        headers: { Authorization: token },
      });
      queryClient.invalidateQueries({ queryKey: ["snapshots", layoutId] });
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
      setDeleteAllDialog(false);
      logger.info("All snapshots deleted for layout", { layoutId });
    } catch (error) {
      logger.error("Delete all snapshots failed", {
        error: error instanceof Error ? error.message : String(error),
        layoutId,
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleView = (analysisId: string) => {
    router.push(`/analysis/${analysisId}`);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Snapshots</span>
            {snapshots && snapshots.length > 0 && (
              <IconButton
                onClick={() => setDeleteAllDialog(true)}
                color="error"
                size="small"
                title="Delete all snapshots"
              >
                <DeleteSweepIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <ErrorAlert message="Failed to load snapshots" severity="error" />
          )}
          {isLoading ? (
            <LoadingSpinner message="Loading snapshots..." />
          ) : snapshots && snapshots.length > 0 ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {snapshots.map((snapshot) => (
                <Grid item xs={12} sm={6} md={4} key={snapshot.id}>
                  <SnapshotCard
                    snapshot={snapshot}
                    onAnalyze={handleAnalyze}
                    onDelete={(id: any) =>
                      setDeleteDialog({ open: true, snapshotId: id })
                    }
                    onView={handleView}
                    loading={actionLoading === snapshot.id}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No snapshots yet. Generate a snapshot from the layouts table.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        title="Delete Snapshot"
        message="Are you sure you want to delete this snapshot? This will also delete its analysis if it exists."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, snapshotId: null })}
      />

      <DeleteConfirmationDialog
        open={deleteAllDialog}
        title="Delete All Snapshots"
        message={`Are you sure you want to delete all ${
          snapshots?.length || 0
        } snapshots for this layout? This will also delete all associated analyses. This action cannot be undone.`}
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAllDialog(false)}
      />
    </>
  );
}
