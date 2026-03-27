import React from "react";
import { StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";

import { colors, spacing } from "../../theme";

type VerticalSliderControlProps = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onValueChange: (value: number) => void;
  height?: number;
};

export const VerticalSliderControl: React.FC<VerticalSliderControlProps> = ({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  onValueChange,
  height = 180,
}) => {
  return (
    <View style={[styles.trackContainer, { height }]}>
      <Slider
        style={[styles.slider, { width: height }]}
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
  trackContainer: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  slider: {
    transform: [{ rotate: "-90deg" }],
  },
});
