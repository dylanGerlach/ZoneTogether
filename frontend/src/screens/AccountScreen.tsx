import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button, Card, ScreenScaffold, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type AccountScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Account"
>;

export const AccountScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const { cardPadding } = useCompactLayout();

  const fullName = (user?.user_metadata as { fullName?: string })?.fullName?.trim();
  const email = user?.email ?? "guest";

  return (
    <ScreenScaffold
      title="Account"
      subtitle="Basic account details for your current session."
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back to home",
        onPress: () => navigation.navigate("Home"),
      }}
      rightActions={[
        {
          iconName: "cog-outline",
          accessibilityLabel: "Account settings",
        },
      ]}
    >
        <Card style={[styles.card, { padding: cardPadding }]}>
          <View style={styles.details}>
            {/* <View style={styles.row}> */}
            <View style={styles.images}>
              <View style={styles.textColumn}>
                <Text variant="caption" color="textSecondary" style={styles.label}>
                  Name
                </Text>
                <Text variant="body">{fullName || "Not provided"}</Text>
              </View>
              <View style={styles.imageColumn}>
                  <Image
                    // source = {require(profileImage)}
                    source = {require('../../assets/Guest_Profile.jpg')}
                    style={styles.image}
                  />
            </View>
          </View>
            {/* </View> */}
            <View style={styles.row}>
              <Text variant="caption" color="textSecondary" style={styles.label}>
                User ID number
              </Text>
              <Text variant="body">12345678</Text>
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
            <Button variant="primary" onPress={signOut}>
              <Text variant="label" color="white">
                Sign Out
              </Text>
            </Button>
          </View>
        </Card>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.gray900,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  images: {
    flexDirection: "row", 
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },

  imageColumn: {
    flex: 1,
    marginLeft: 10,
  },

  textColumn: {
    // flex: 1, 
  },  

  image: {
    width: 50,
    height: 50,
    borderRadius: 50,
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
