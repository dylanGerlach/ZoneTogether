import React from "react";
import { StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";

import { colors, spacing } from "../../theme";
import { Text } from "./Text";

type SliderControlProps = {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  valueText?: string;
};

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 0.01,
  onValueChange,
  valueText,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        <Text variant="caption" color="textSecondary">
          {valueText ?? `${Math.round(value * 100)}%`}
        </Text>
      </View>
      <Slider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.gray300}
        thumbTintColor={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
