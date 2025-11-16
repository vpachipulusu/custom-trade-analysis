import { useState } from "react";
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
} from "@mui/material";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useCreateAnalysis } from "@/hooks/useAnalyses";
import SnapshotCard from "./SnapshotCard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorAlert from "./ErrorAlert";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAnalyze = async (snapshotId: string) => {
    try {
      setActionLoading(snapshotId);
      const analysis = await createAnalysis.mutateAsync(snapshotId);
      router.push(`/analysis/${analysis.id}`);
      onClose();
    } catch (error) {
      console.error("Analysis failed:", error);
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
      console.error("Delete failed:", error);
    }
  };

  const handleView = (analysisId: string) => {
    router.push(`/analysis/${analysisId}`);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Snapshots</DialogTitle>
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
                    onDelete={(id) =>
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
    </>
  );
}
