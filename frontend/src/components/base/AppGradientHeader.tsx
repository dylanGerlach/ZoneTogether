import React from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radii, spacing, typography } from "../../theme";
import { Text } from "./Text";

type AppGradientHeaderProps = {
  title: string;
  subtitle?: string;
  kicker?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

const COMPACT_BREAKPOINT = 768;

export const AppGradientHeader: React.FC<AppGradientHeaderProps> = ({
  title,
  subtitle,
  kicker,
  children,
  style,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_BREAKPOINT;

  const titleStyle = isCompact
    ? {
        fontSize: typography.fontSize.xl,
        lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
      }
    : undefined;

  const subtitleStyle = isCompact
    ? {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.fontSize.sm * typography.lineHeight.compact,
      }
    : undefined;

  const kickerStyle = isCompact
    ? { fontSize: typography.fontSize.xxs }
    : undefined;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={[
          styles.gradient,
          isCompact && styles.gradientCompact,
        ]}
      >
        <View style={[styles.content, isCompact && styles.contentCompact]}>
          {kicker ? (
            <Text
              variant="caption"
              color="textInverse"
              style={[styles.kicker, kickerStyle]}
            >
              {kicker}
            </Text>
          ) : null}
          <Text variant="h1" color="textInverse" style={titleStyle}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="body"
              color="textInverse"
              style={[styles.subtitle, subtitleStyle]}
            >
              {subtitle}
            </Text>
          ) : null}
          {children}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  gradient: {
    paddingVertical: spacing.lg,
  },
  gradientCompact: {
    paddingVertical: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  contentCompact: {
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  kicker: {
    letterSpacing: 0.5,
    opacity: 0.92,
  },
  subtitle: {
    opacity: 0.92,
  },
});
