import React from "react";
import { Modal, StyleSheet, View } from "react-native";

import { Button, Card, Text } from "../../../components";
import { colors, spacing } from "../../../theme";
import type { ZoneFeature } from "../types";

type OverlapPopupProps = {
  visible: boolean;
  overlappingZone: ZoneFeature | null;
  overlapCount?: number;
  onRedo: () => void;
  onRedrawManually: () => void;
  loading?: boolean;
};

export const OverlapPopup: React.FC<OverlapPopupProps> = ({
  visible,
  overlappingZone,
  overlapCount = 1,
  onRedo,
  onRedrawManually,
  loading = false,
}) => {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <Text variant="h3">Overlap detected</Text>
          <Text variant="body" color="textSecondary">
            Your new zone intersects with {overlapCount} existing {overlapCount === 1 ? "zone" : "zones"}
            {overlappingZone?.properties?.name
              ? ` (for example: ${String(overlappingZone.properties.name)})`
              : ""}.
          </Text>
          <Text variant="body" color="textSecondary">
            Redo Zone will adjust around all overlaps and save automatically in one step.
          </Text>
          <View style={styles.actions}>
            <Button variant="outline" onPress={onRedrawManually} disabled={loading}>
              <Text variant="label" color="primary">
                Redraw Manually
              </Text>
            </Button>
            <Button variant="primary" onPress={onRedo} loading={loading}>
              <Text variant="label" color="white">
                Redo Zone
              </Text>
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
});
