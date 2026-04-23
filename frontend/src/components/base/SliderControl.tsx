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

// `@react-native-community/slider` on web strips `value === 0` to `undefined`
// via `!value` and then crashes with `undefined.toFixed(...)`. Shifting the
// entire range by a constant non-zero offset guarantees Slider never receives
// a literal 0 while keeping consumer semantics untouched.
const VALUE_SHIFT = 1;

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 0.01,
  onValueChange,
  valueText,
}) => {
  const handleValueChange = (nextValue: number) => {
    onValueChange(nextValue - VALUE_SHIFT);
  };

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
        value={value + VALUE_SHIFT}
        minimumValue={minimumValue + VALUE_SHIFT}
        maximumValue={maximumValue + VALUE_SHIFT}
        step={step}
        onValueChange={handleValueChange}
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
