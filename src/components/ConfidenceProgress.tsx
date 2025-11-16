import { Box, LinearProgress, Typography } from "@mui/material";

interface ConfidenceProgressProps {
  confidence: number; // 0-100
  showPercentage?: boolean;
}

export default function ConfidenceProgress({
  confidence,
  showPercentage = true,
}: ConfidenceProgressProps) {
  const getColor = () => {
    if (confidence <= 30) return "error";
    if (confidence <= 60) return "warning";
    return "success";
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Box sx={{ flexGrow: 1, mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={confidence}
            color={getColor()}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        {showPercentage && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 45 }}
          >
            {confidence}%
          </Typography>
        )}
      </Box>
    </Box>
  );
}
