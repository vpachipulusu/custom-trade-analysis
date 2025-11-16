import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
} from "@mui/material";
import { format } from "date-fns";

interface SnapshotCardProps {
  snapshot: {
    id: string;
    url: string;
    createdAt: Date | string;
    analysis?: {
      id: string;
    } | null;
  };
  onAnalyze?: (snapshotId: string) => void;
  onDelete?: (snapshotId: string) => void;
  onView?: (analysisId: string) => void;
  loading?: boolean;
}

export default function SnapshotCard({
  snapshot,
  onAnalyze,
  onDelete,
  onView,
  loading = false,
}: SnapshotCardProps) {
  const hasAnalysis = !!snapshot.analysis;
  const createdDate =
    typeof snapshot.createdAt === "string"
      ? new Date(snapshot.createdAt)
      : snapshot.createdAt;

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        height="200"
        image={snapshot.url}
        alt="Chart snapshot"
        sx={{ objectFit: "cover", backgroundColor: "#f5f5f5" }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {format(createdDate, "MMM dd, yyyy HH:mm")}
          </Typography>
          {hasAnalysis && (
            <Chip label="Analyzed" color="primary" size="small" />
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          {!hasAnalysis && onAnalyze && (
            <Button
              size="small"
              variant="contained"
              onClick={() => onAnalyze(snapshot.id)}
              disabled={loading}
            >
              Analyze
            </Button>
          )}
          {hasAnalysis && onView && snapshot.analysis && (
            <Button
              size="small"
              variant="contained"
              onClick={() => onView(snapshot.analysis!.id)}
              disabled={loading}
            >
              View Analysis
            </Button>
          )}
        </Box>
        {onDelete && (
          <Button
            size="small"
            color="error"
            onClick={() => onDelete(snapshot.id)}
            disabled={loading}
          >
            Delete
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
