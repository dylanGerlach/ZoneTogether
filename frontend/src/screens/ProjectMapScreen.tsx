import React from "react";
import { StyleSheet } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, ScreenScaffold, Text } from "../components";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../types";

type ProjectMapNavigationProp = NativeStackNavigationProp<RootStackParamList, "ProjectMap">;
type ProjectMapRouteProp = RouteProp<RootStackParamList, "ProjectMap">;

export const ProjectMapScreen: React.FC = () => {
  const navigation = useNavigation<ProjectMapNavigationProp>();
  const route = useRoute<ProjectMapRouteProp>();
  const { organizationName } = route.params;

  return (
    <ScreenScaffold
      title="Project Map"
      subtitle={organizationName}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back",
        onPress: () => navigation.goBack(),
      }}
    >
        <Card style={styles.card}>
          <Text variant="h3">Project map editor is web-first</Text>
          <Text variant="body" color="textSecondary">
            Open this screen on web to edit H3 assignments for {organizationName}.
          </Text>
        </Card>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
