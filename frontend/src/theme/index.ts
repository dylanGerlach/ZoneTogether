/**
 * Central theme export
 */

import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';

export const theme = {
  colors,
  spacing,
  typography,
} as const;

export default theme;
