import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();

  const email = user?.email ?? "guest@example.com";
  const fullName = (user?.user_metadata as { fullName?: string })?.fullName;
  const role = (user?.user_metadata as { role?: string })?.role;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Welcome to ZoneTogether
        </Text>

        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Account Overview
          </Text>
          <Text variant="body" color="textSecondary" style={styles.detail}>
            Email: {email}
          </Text>
          {fullName && (
            <Text variant="body" color="textSecondary" style={styles.detail}>
              Name: {fullName}
            </Text>
          )}
          {role && (
            <Text variant="body" color="textSecondary" style={styles.detail}>
              Role: {role}
            </Text>
          )}
        </Card>

        <Button
          variant="secondary"
          style={styles.signOutButton}
          onPress={signOut}
        >
          <Text variant="label" color="white">
            Sign Out
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    textAlign: "center",
  },
  card: {
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  detail: {
    marginBottom: spacing.xs,
  },
  signOutButton: {
    alignSelf: "center",
    minWidth: 200,
  },
});
