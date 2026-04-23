/**
 * Spacing Scale
 * Uses 4px base unit for consistent spacing throughout the app
 */

export const spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  mdl: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export type SpacingSize = keyof typeof spacing;
