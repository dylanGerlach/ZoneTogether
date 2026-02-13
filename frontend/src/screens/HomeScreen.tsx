import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button, Card, Input, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { createOrganization, fetchOrganizations } from "../utils/backendApi";
import { colors, spacing } from "../theme";
import { OrganizationMembership, RootStackParamList } from "../types";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export const HomeScreen: React.FC = () => {
  const { user, session } = useAuthContext();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [newOrganizationDescription, setNewOrganizationDescription] = useState("");
  const [createOrganizationError, setCreateOrganizationError] = useState<string | null>(
    null
  );
  const [creatingOrganization, setCreatingOrganization] = useState(false);

  const fullName = (user?.user_metadata as { fullName?: string })?.fullName;

  const firstName = useMemo(() => {
    if (!fullName) return "there";
    return fullName.trim().split(" ")[0] ?? "there";
  }, [fullName]);

  const organizationCountLabel = useMemo(() => {
    const count = organizations.length;
    return count === 1 ? "1 organization" : `${count} organizations`;
  }, [organizations.length]);

  const loadOrganizations = useCallback(async () => {
    if (!session) return;

    setLoadingOrganizations(true);
    setOrganizationsError(null);
    try {
      const response = await fetchOrganizations(session);
      setOrganizations(response.organizations);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load organizations right now.";
      setOrganizationsError(message);
    } finally {
      setLoadingOrganizations(false);
    }
  }, [session]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const handleCreateOrganization = async () => {
    if (!session) return;

    const trimmedName = newOrganizationName.trim();
    const trimmedDescription = newOrganizationDescription.trim();
    if (!trimmedName) {
      setCreateOrganizationError("Organization name is required.");
      return;
    }

    setCreatingOrganization(true);
    setCreateOrganizationError(null);
    try {
      await createOrganization(session, {
        name: trimmedName,
        description: trimmedDescription,
      });
      setNewOrganizationName("");
      setNewOrganizationDescription("");
      setIsCreateModalOpen(false);
      await loadOrganizations();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create organization right now.";
      setCreateOrganizationError(message);
    } finally {
      setCreatingOrganization(false);
    }
  };

  const openCreateModal = () => {
    setCreateOrganizationError(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (creatingOrganization) return;
    setCreateOrganizationError(null);
    setIsCreateModalOpen(false);
  };

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text variant="h1" style={styles.title}>
                Welcome back, {firstName}
              </Text>
              <Text variant="body" color="textSecondary" style={styles.subtitle}>
                Create a new organization or open one to continue.
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Button variant="primary" onPress={openCreateModal} style={styles.primaryAction}>
              <Text variant="label" color="white">
                + New Organization
              </Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => navigation.navigate("Account")}
              style={styles.secondaryAction}
            >
              <Text variant="label" color="primary">
                Account
              </Text>
            </Button>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Organizations</Text>
            <Text variant="caption" color="textSecondary">
              {organizationCountLabel}
            </Text>
          </View>

          {loadingOrganizations ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="body" color="textSecondary" style={styles.loadingText}>
                Loading organizations...
              </Text>
            </View>
          ) : organizations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="h3" style={styles.emptyStateTitle}>
                No organizations yet
              </Text>
              <Text variant="body" color="textSecondary" style={styles.emptyStateBody}>
                Create your first organization to get started.
              </Text>
              <Button variant="primary" onPress={openCreateModal}>
                <Text variant="label" color="white">
                  Create Organization
                </Text>
              </Button>
            </View>
          ) : (
            <View style={styles.organizationList}>
              {organizations.map((membership) => {
                const orgName = membership.organization?.name ?? "Unnamed organization";
                const orgDescription =
                  membership.organization?.description ?? "No description";
                return (
                  <TouchableOpacity
                    key={membership.organization_id}
                    style={styles.organizationItem}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate("Organization", {
                        organizationId: membership.organization_id,
                        organizationName: orgName,
                      })
                    }
                  >
                    <View style={styles.organizationItemBody}>
                      <Text variant="body" style={styles.organizationName}>
                        {orgName}
                      </Text>
                      <Text
                        variant="caption"
                        color="textSecondary"
                        numberOfLines={2}
                      >
                        {orgDescription}
                      </Text>
                    </View>
                    <View style={styles.organizationItemMeta}>
                      <Text variant="caption" color="primary" style={styles.rolePill}>
                        {membership.role.toUpperCase()}
                      </Text>
                      <Text variant="body" color="textSecondary">
                        →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {organizationsError && (
          <Text variant="caption" color="error" style={styles.pageErrorText}>
            {organizationsError}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={isCreateModalOpen}
        animationType="fade"
        transparent
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeCreateModal} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Create organization
            </Text>
            <Text variant="body" color="textSecondary" style={styles.modalSubtitle}>
              This creates the organization and adds you as owner.
            </Text>

            <Input
              value={newOrganizationName}
              onChangeText={setNewOrganizationName}
              placeholder="Organization name"
              autoFocus
            />
            <Input
              value={newOrganizationDescription}
              onChangeText={setNewOrganizationDescription}
              placeholder="Description (optional)"
            />

            {createOrganizationError && (
              <Text variant="caption" color="error" style={styles.modalErrorText}>
                {createOrganizationError}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Button variant="outline" onPress={closeCreateModal} style={styles.modalButton}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="primary"
                onPress={handleCreateOrganization}
                loading={creatingOrganization}
                style={styles.modalButton}
              >
                <Text variant="label" color="white">
                  Create
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: spacing.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  title: {
    fontSize: 30,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  primaryAction: {
    minWidth: 210,
  },
  secondaryAction: {
    minWidth: 140,
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
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  organizationList: {
    gap: spacing.sm,
  },
  organizationItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  organizationItemBody: {
    flex: 1,
    marginRight: spacing.md,
  },
  organizationName: {
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  organizationItemMeta: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  rolePill: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: "hidden",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  emptyStateTitle: {
    textAlign: "center",
  },
  emptyStateBody: {
    textAlign: "center",
  },
  pageErrorText: {
    marginTop: -spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    marginBottom: spacing.md,
  },
  modalErrorText: {
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalButton: {
    minWidth: 120,
  },
});
