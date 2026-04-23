/**
 * Central theme export
 */

import { colors } from './colors';
import { elevation } from './elevation';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export { colors } from './colors';
export { elevation } from './elevation';
export { radii } from './radii';
export { spacing } from './spacing';
export { typography } from './typography';

export const theme = {
  colors,
  elevation,
  radii,
  spacing,
  typography,
} as const;

export default theme;
