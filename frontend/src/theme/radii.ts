/**
 * Radius tokens for consistent rounded corners.
 */

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export type RadiusSize = keyof typeof radii;
