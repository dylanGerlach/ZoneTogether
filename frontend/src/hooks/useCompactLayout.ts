import { useWindowDimensions } from "react-native";

import { spacing } from "../theme";

export const COMPACT_BREAKPOINT = 768;

/**
 * Responsive layout helpers. `isCompact` is true on phone-sized screens
 * (width < 768). Use the returned padding tokens to keep cards and
 * sections visually consistent between compact and wide layouts.
 */
export const useCompactLayout = () => {
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_BREAKPOINT;

  return {
    isCompact,
    cardPadding: isCompact ? spacing.sm : spacing.lg,
    cardPaddingMd: isCompact ? spacing.sm : spacing.md,
    sectionGap: isCompact ? spacing.sm : spacing.md,
  };
};
