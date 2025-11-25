/**
 * Format interval from numeric/string value to human-readable format
 * @param interval - The interval value (e.g., "240", "60", "D")
 * @returns Formatted interval string (e.g., "4H", "1H", "D")
 */
export function formatInterval(interval: string | number): string {
  const intervalStr = String(interval);

  const intervalMap: Record<string, string> = {
    "1": "1m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1H",
    "240": "4H",
    "D": "D",
    "W": "W",
    "M": "M",
  };

  return intervalMap[intervalStr] || intervalStr;
}

/**
 * Get full interval label for display in dropdowns
 * @param interval - The interval value
 * @returns Full label (e.g., "4 hours", "1 hour", "Daily")
 */
export function getIntervalLabel(interval: string | number): string {
  const intervalStr = String(interval);

  const labelMap: Record<string, string> = {
    "1": "1 minute",
    "5": "5 minutes",
    "15": "15 minutes",
    "30": "30 minutes",
    "60": "1 hour",
    "240": "4 hours",
    "D": "Daily",
    "W": "Weekly",
    "M": "Monthly",
  };

  return labelMap[intervalStr] || intervalStr;
}

export const INTERVALS = [
  { value: "1", label: "1 minute" },
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "D", label: "Daily" },
  { value: "W", label: "Weekly" },
  { value: "M", label: "Monthly" },
];
