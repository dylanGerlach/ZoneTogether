import React from "react";
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Text } from "../components";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type OrganizationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Organization"
>;
type OrganizationScreenRouteProp = RouteProp<RootStackParamList, "Organization">;

type TodoSectionProps = {
  title: string;
  description: string;
};

const TodoSection: React.FC<TodoSectionProps> = ({ title, description }) => (
  <Card style={styles.card}>
    <View style={styles.sectionHeader}>
      <Text variant="h3">{title}</Text>
      <Text variant="caption" color="primary" style={styles.todoPill}>
        TODO
      </Text>
    </View>
    <Text variant="body" color="textSecondary">
      {description}
    </Text>
  </Card>
);

export const OrganizationScreen: React.FC = () => {
  const navigation = useNavigation<OrganizationScreenNavigationProp>();
  const route = useRoute<OrganizationScreenRouteProp>();
  const { organizationId, organizationName } = route.params;

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Home")}
            style={styles.backButton}
          >
            <Text variant="body" color="primary">
              ← Organizations
            </Text>
          </TouchableOpacity>
          <Text variant="h1" style={styles.title}>
            {organizationName}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.subtitle}>
            Organization hub for communication, members, map, and projects.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Messages</Text>
          </View>
          <Text variant="body" color="textSecondary" style={styles.sectionDescription}>
            Open all organization conversations and start new threads.
          </Text>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() =>
              navigation.navigate("MessageList", {
                organizationId,
                organizationName,
              })
            }
          >
            <Text variant="label" color="white">
              Open Messages
            </Text>
          </TouchableOpacity>
        </Card>

        <TodoSection
          title="Add Users"
          description="Sid please add this functionality to onboard new users"
        />

        <TodoSection
          title="Map"
          description="Omer please import the current maps functionality you have, keep everything in the frontend"
        />

        <TodoSection
          title="Projects"
          description="List organization projects, statuses, owners, and next milestones."
        />
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 30,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.gray900,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionDescription: {
    marginTop: -spacing.xs,
  },
  primaryAction: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  todoPill: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: "hidden",
  },
});
