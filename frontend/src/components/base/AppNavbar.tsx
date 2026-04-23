import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii, spacing } from "../../theme";
import { Text } from "./Text";

export type AppNavbarAction = {
  iconName: string;
  onPress?: () => void;
  accessibilityLabel: string;
};

type AppNavbarProps = {
  leftAction?: AppNavbarAction;
  rightActions?: AppNavbarAction[];
  title?: string;
  subtitle?: string;
  mode?: "default" | "floating" | "detached";
};

export const AppNavbar: React.FC<AppNavbarProps> = ({
  leftAction,
  rightActions = [],
  title,
  subtitle,
  mode = "default",
}) => {
  const isFloating = mode === "floating";
  const isDetached = mode === "detached";
  return (
    <View
      style={[
        styles.container,
        isFloating ? styles.containerFloating : null,
        isDetached ? styles.containerDetached : null,
      ]}
    >
      <View style={styles.leftSlot}>
        {leftAction ? (
          <TouchableOpacity
            style={[styles.iconButton, isFloating ? styles.iconButtonFloating : null]}
            activeOpacity={0.8}
            onPress={leftAction.onPress}
            disabled={!leftAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={leftAction.accessibilityLabel}
          >
            <MaterialCommunityIcons
              name={leftAction.iconName as never}
              size={18}
              color={isFloating ? colors.white : colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.centerSlot}>
        {title ? (
          <Text variant="h4" color={isFloating ? "textInverse" : "textPrimary"} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            variant="caption"
            color={isFloating ? "textInverse" : "textSecondary"}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rightSlot}>
        {rightActions.map((action) => (
          <TouchableOpacity
            key={action.accessibilityLabel}
            style={[styles.iconButton, isFloating ? styles.iconButtonFloating : null]}
            activeOpacity={0.8}
            onPress={action.onPress}
            disabled={!action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
          >
            <MaterialCommunityIcons
              name={action.iconName as never}
              size={18}
              color={isFloating ? colors.white : colors.primary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  containerFloating: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  containerDetached: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  leftSlot: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "flex-start",
  },
  centerSlot: {
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    minWidth: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonFloating: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.32)",
  },
  iconButtonDisabled: {
    opacity: 0.65,
  },
});

