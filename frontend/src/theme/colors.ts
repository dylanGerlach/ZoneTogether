/**
 * ZoneTogether Color Palette
 */

export const colors = {
  // Core neutrals
  white: "#ffffff",
  black: "#000000",

  // Brand colors
  primary: "#2b7ef8",
  primaryDeep: "#1f5bd1",
  accent: "#5c2cff",
  tertiary: "#0ea5a2",
  gradientStart: "#5c2cff",
  gradientEnd: "#2b7ef8",

  // Semantic colors
  success: "#1f9d69",
  error: "#d93838",
  warning: "#d08a19",
  info: "#2a7ea8",

  // Grays
  gray50: "#f7f9fa",
  gray100: "#edf2f4",
  gray200: "#d7dfe3",
  gray300: "#b6c3ca",
  gray400: "#95a5ae",
  gray500: "#747779",
  gray600: "#5b6469",
  gray700: "#444e54",
  gray800: "#2d363c",
  gray900: "#14191d",

  // Text colors
  textPrimary: "#10253a",
  textSecondary: "#4d616c",
  textTertiary: "#747779",
  textInverse: "#ffffff",
  textMuted: "#6a7b86",

  // Surface colors
  background: "#ecf1ff",
  backgroundSecondary: "#ffffff",
  surfacePrimary: "#ffffff",
  surfaceSecondary: "#f7f9ff",
  surfaceElevated: "#ffffff",
  surfaceOverlay: "rgba(16, 37, 58, 0.35)",

  // Action colors
  actionPrimary: "#2b7ef8",
  actionPrimaryPressed: "#1f5bd1",
  actionSecondary: "#e9f0ff",
  actionSecondaryPressed: "#d9e5ff",
  actionDanger: "#d93838",

  // Border colors
  border: "#d7dfe3",
  borderStrong: "#b6c3ca",
  divider: "#b6c3ca",
} as const;

export type ColorName = keyof typeof colors;
