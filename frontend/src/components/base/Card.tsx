/**
 * Reusable Card component
 */

import React from 'react';
import { View, ViewProps, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, elevation, radii, spacing } from '../../theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevated?: boolean;
}

const COMPACT_BREAKPOINT = 768;

export const Card: React.FC<CardProps> = ({ children, style, elevated = true, ...props }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_BREAKPOINT;

  return (
    <View
      style={[
        styles.card,
        isCompact && styles.cardCompact,
        elevated ? styles.cardElevated : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfacePrimary,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompact: {
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  cardElevated: {
    shadowColor: colors.black,
    ...elevation.low,
  },
});
