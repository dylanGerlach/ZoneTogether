/**
 * Reusable Text component with predefined typography variants
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  color?: keyof typeof colors;
  align?: 'left' | 'center' | 'right';
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
  style,
  ...props
}) => {
  return (
    <RNText
      style={[
        styles[variant],
        { color: colors[color], textAlign: align },
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
  },
  h2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
  },
  h3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },
  h4: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
  },
  body: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
});
