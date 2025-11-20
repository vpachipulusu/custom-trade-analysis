import { Chip } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon from "@mui/icons-material/Remove";

interface ActionChipProps {
  action: "BUY" | "SELL" | "HOLD";
  size?: "small" | "medium";
}

export default function ActionChip({
  action,
  size = "medium",
}: ActionChipProps) {
  const getChipProps = () => {
    switch (action) {
      case "BUY":
        return {
          label: "BUY",
          color: "success" as const,
          icon: <TrendingUpIcon />,
        };
      case "SELL":
        return {
          label: "SELL",
          color: "error" as const,
          icon: <TrendingDownIcon />,
        };
      case "HOLD":
        return {
          label: "HOLD",
          color: "default" as const,
          icon: <RemoveIcon />,
        };
    }
  };

  const props = getChipProps();

  return (
    <Chip
      label={props.label}
      color={props.color}
      icon={props.icon}
      size={size}
      sx={{ fontWeight: "bold" }}
    />
  );
}
