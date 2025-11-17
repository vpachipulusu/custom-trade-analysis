import React from "react";
import { Chip, ChipProps } from "@mui/material";
import {
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  Dangerous,
} from "@mui/icons-material";

type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

interface RiskLevelBadgeProps {
  riskLevel: RiskLevel;
  size?: "small" | "medium";
}

const riskConfig: Record<
  RiskLevel,
  { color: ChipProps["color"]; icon: React.ReactElement; label: string }
> = {
  NONE: {
    color: "default",
    icon: <CheckCircle fontSize="small" />,
    label: "No Risk",
  },
  LOW: {
    color: "success",
    icon: <Info fontSize="small" />,
    label: "Low Risk",
  },
  MEDIUM: {
    color: "warning",
    icon: <Warning fontSize="small" />,
    label: "Medium Risk",
  },
  HIGH: {
    color: "error",
    icon: <ErrorIcon fontSize="small" />,
    label: "High Risk",
  },
  EXTREME: {
    color: "error",
    icon: <Dangerous fontSize="small" />,
    label: "Extreme Risk",
  },
};

export default function RiskLevelBadge({
  riskLevel,
  size = "medium",
}: RiskLevelBadgeProps) {
  const config = riskConfig[riskLevel];

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      sx={{
        fontWeight: riskLevel === "EXTREME" || riskLevel === "HIGH" ? 600 : 400,
      }}
    />
  );
}
