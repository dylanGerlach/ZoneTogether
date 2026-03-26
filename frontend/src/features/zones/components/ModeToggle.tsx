import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "../../../components";
import { colors, spacing } from "../../../theme";
import type { ZoneMode } from "../types";

type ModeToggleProps = {
  mode: ZoneMode;
  onModeChange: (mode: ZoneMode) => void;
};

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onModeChange }) => {
  return (
    <View style={styles.container}>
      <ModeChip
        label="View"
        selected={mode === "view"}
        onPress={() => onModeChange("view")}
      />
      <ModeChip
        label="Draw"
        selected={mode === "freehand"}
        onPress={() => onModeChange("freehand")}
      />
    </View>
  );
};

type ModeChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const ModeChip: React.FC<ModeChipProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
  >
    <Text variant="label" color={selected ? "white" : "textPrimary"}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIdle: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
});
