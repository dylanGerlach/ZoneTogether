/**
 * ZoneTogether Color Palette
 */

export const colors = {
  // Brand colors
  primary: '#0077b6',
  accent: '#f5821f',
  white: '#ffffff',
  
  // Semantic colors
  success: '#2e7d32',
  error: '#d32f2f',
  warning: '#ed6c02',
  info: '#0288d1',
  
  // Grays
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e0e0e0',
  gray300: '#bdbdbd',
  gray400: '#9e9e9e',
  gray500: '#757575',
  gray600: '#616161',
  gray700: '#424242',
  gray800: '#212121',
  gray900: '#000000',
  
  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9e9e9e',
  textInverse: '#ffffff',
  
  // Background colors
  background: '#ffffff',
  backgroundSecondary: '#fafafa',
  
  // Border colors
  border: '#e0e0e0',
  divider: '#bdbdbd',
} as const;

export type ColorName = keyof typeof colors;
