/**
 * Application configuration utilities
 * Reads and validates configuration values from environment variables
 */

/**
 * Get the maximum number of layouts allowed per symbol per user
 * @returns number - defaults to 4 if not set or invalid
 */
export function getMaxLayoutsPerSymbol(): number {
  const value = process.env.MAX_LAYOUTS_PER_SYMBOL;
  if (!value) {
    return 4; // Default value
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`Invalid MAX_LAYOUTS_PER_SYMBOL value: ${value}. Using default: 4`);
    return 4;
  }

  return parsed;
}

/**
 * Get the maximum number of snapshots allowed per layout
 * @returns number - defaults to 4 if not set or invalid
 */
export function getMaxSnapshotsPerLayout(): number {
  const value = process.env.MAX_SNAPSHOTS_PER_LAYOUT;
  if (!value) {
    return 4; // Default value
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`Invalid MAX_SNAPSHOTS_PER_LAYOUT value: ${value}. Using default: 4`);
    return 4;
  }

  return parsed;
}

/**
 * Get the maximum number of automated snapshots allowed per layout
 * This is separate from manual snapshots to prevent automation from filling up the user's snapshot quota
 * @returns number - defaults to 2 if not set or invalid
 */
export function getMaxAutomatedSnapshotsPerLayout(): number {
  const value = process.env.MAX_AUTOMATED_SNAPSHOTS_PER_LAYOUT;
  if (!value) {
    return 2; // Default value - keep fewer automated snapshots
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`Invalid MAX_AUTOMATED_SNAPSHOTS_PER_LAYOUT value: ${value}. Using default: 2`);
    return 2;
  }

  return parsed;
}
