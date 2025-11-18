/**
 * Currency utility functions
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  JPY: "¥",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function formatCurrency(
  value: number | string | undefined,
  currency: string = "GBP"
): string {
  if (value === undefined || value === null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${num.toFixed(2)}`;
}

export function formatPercentage(value: number | string | undefined): string {
  if (value === undefined || value === null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `${num.toFixed(2)}%`;
}
