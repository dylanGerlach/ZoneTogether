import React from "react";
import { StyleSheet, View, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button, Card, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const email = user?.email ?? "guest@example.com";
  const fullName = (user?.user_metadata as { fullName?: string })?.fullName;
  const role = (user?.user_metadata as { role?: string })?.role;

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
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

        <TouchableOpacity
          onPress={() => navigation.navigate("MessageList")}
          style={styles.messagesLink}
        >
          <Text variant="body" color="primary" style={styles.messagesLinkText}>
            Go to Messages →
          </Text>
        </TouchableOpacity>

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
    </Container>
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
  messagesLink: {
    padding: spacing.md,
    alignSelf: "center",
  },
  messagesLinkText: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
  signOutButton: {
    alignSelf: "center",
    minWidth: 200,
  },
});
