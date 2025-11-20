import React from "react";
import { Chip, ChipProps } from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  Remove,
  ShowChart,
} from "@mui/icons-material";

type WeeklyOutlook = "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";

interface OutlookChipProps {
  outlook: WeeklyOutlook;
  size?: "small" | "medium";
}

const outlookConfig: Record<
  WeeklyOutlook,
  { color: ChipProps["color"]; icon: React.ReactElement }
> = {
  BULLISH: {
    color: "success",
    icon: <TrendingUp fontSize="small" />,
  },
  BEARISH: {
    color: "error",
    icon: <TrendingDown fontSize="small" />,
  },
  NEUTRAL: {
    color: "default",
    icon: <Remove fontSize="small" />,
  },
  VOLATILE: {
    color: "warning",
    icon: <ShowChart fontSize="small" />,
  },
};

export default function OutlookChip({
  outlook,
  size = "medium",
}: OutlookChipProps) {
  const config = outlookConfig[outlook];

  return (
    <Chip
      icon={config.icon}
      label={outlook}
      color={config.color}
      size={size}
      variant="outlined"
    />
  );
}
