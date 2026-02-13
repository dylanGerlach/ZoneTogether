import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button, Card, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type AccountScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Account"
>;

export const AccountScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigation = useNavigation<AccountScreenNavigationProp>();

  const fullName = (user?.user_metadata as { fullName?: string })?.fullName?.trim();
  const email = user?.email ?? "guest";

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text variant="h1" style={styles.title}>
            Account
          </Text>
          <Text variant="body" color="textSecondary" style={styles.subtitle}>
            Basic account details for your current session.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Account Info</Text>
          </View>
          <View style={styles.details}>
            <View style={styles.row}>
              <Text variant="caption" color="textSecondary" style={styles.label}>
                Name
              </Text>
              <Text variant="body">{fullName || "Not provided"}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="caption" color="textSecondary" style={styles.label}>
                Email
              </Text>
              <Text variant="body">{email}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button variant="outline" onPress={() => navigation.navigate("Home")}>
              <Text variant="label" color="primary">
                Back to Home
              </Text>
            </Button>
            <Button variant="secondary" onPress={signOut}>
              <Text variant="label" color="white">
                Sign Out
              </Text>
            </Button>
          </View>
        </Card>
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
  heroCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.background,
    shadowColor: colors.gray900,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  details: {
    gap: spacing.sm,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
