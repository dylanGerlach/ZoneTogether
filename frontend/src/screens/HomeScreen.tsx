import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button, Card, Input, ScreenScaffold, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useOrganizationContext } from "../context/OrganizationContext";
import { useProjectContext } from "../context/ProjectContext";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { createOrganization } from "../utils/backendApi";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export const HomeScreen: React.FC = () => {
  const { user, session } = useAuthContext();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isCompact, cardPadding } = useCompactLayout();

  const {
    organizations,
    organizationsLoading,
    organizationsError,
    loadOrganizations,
    loadOrganizationUsers,
    organizationUsersByOrg,
  } = useOrganizationContext();
  const { loadProjects, projectsByOrg } = useProjectContext();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [newOrganizationDescription, setNewOrganizationDescription] = useState("");
  const [createOrganizationError, setCreateOrganizationError] = useState<string | null>(
    null
  );
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const fullName = (user?.user_metadata as { fullName?: string })?.fullName;

  const firstName = useMemo(() => {
    if (!fullName) return "there";
    return fullName.trim().split(" ")[0] ?? "there";
  }, [fullName]);

  const refreshOrganizations = useCallback(async () => {
    if (!session) return [];
    return loadOrganizations(session);
  }, [loadOrganizations, session]);

  useEffect(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  useEffect(() => {
    if (!session) return;
    if (organizations.length === 0) {
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    let cancelled = false;
    void Promise.allSettled(
      organizations.map((membership) =>
        loadProjects(session, membership.organization_id),
      ),
    ).then(() => {
      if (!cancelled) setProjectsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadProjects, organizations, session]);

  useEffect(() => {
    if (!session) return;
    if (organizations.length === 0) return;
    void Promise.allSettled(
      organizations.map((membership) =>
        loadOrganizationUsers(session, membership.organization_id),
      ),
    );
  }, [loadOrganizationUsers, organizations, session]);

  const organizationIds = useMemo(
    () => new Set(organizations.map((membership) => membership.organization_id)),
    [organizations],
  );

  const projectCount = useMemo(() => {
    let total = 0;
    for (const orgId of organizationIds) {
      total += projectsByOrg[orgId]?.length ?? 0;
    }
    return total;
  }, [organizationIds, projectsByOrg]);

  const organizationCount = organizations.length;

  const workspaceStatsLoading = organizationsLoading || projectsLoading;

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
      await refreshOrganizations();
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

  return (
    <ScreenScaffold
      title="Your Workspace"
      subtitle="Overview"
      kicker={`WELCOME BACK, ${firstName.toUpperCase()}`}
      leftAction={{
        iconName: "menu",
        accessibilityLabel: "Open menu",
      }}
      rightActions={[
        {
          iconName: "cog-outline",
          accessibilityLabel: "Open account",
          onPress: () => navigation.navigate("Account"),
        },
      ]}
    >
        <View
          style={[
            styles.heroCard,
            { padding: cardPadding, gap: isCompact ? spacing.md : spacing.lg },
          ]}
        >
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                styles.statPrimary,
                isCompact && styles.statCardCompact,
              ]}
            >
              <Text variant="h1" color="white" style={styles.statValue}>
                {workspaceStatsLoading ? "..." : organizationCount}
              </Text>
              <Text variant="caption" color="white">
                Organizations
              </Text>
            </View>
            <View
              style={[styles.statCard, isCompact && styles.statCardCompact]}
            >
              <Text variant="h1" style={styles.statValue}>
                {workspaceStatsLoading ? "..." : projectCount}
              </Text>
              <Text variant="caption" color="textSecondary">
                Projects
              </Text>
            </View>
          </View>
        </View>

        <Card style={[styles.card, { padding: cardPadding }]}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Organizations</Text>
            <TouchableOpacity onPress={openCreateModal}>
              <View style={styles.newAction}>
                <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                <Text variant="caption" color="primary" style={styles.sectionHeaderAction}>
                  New
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {organizationsLoading ? (
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
                    style={[
                      styles.organizationItem,
                      isCompact && styles.organizationItemCompact,
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate("Organization", {
                        organizationId: membership.organization_id,
                        organizationName: orgName,
                        organizationRole: membership.role,
                      })
                    }
                  >
                    <View style={styles.logoBlock}>
                      <Text variant="label" color="primary">
                        {orgName
                          .split(" ")
                          .map((word) => word.charAt(0))
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
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
                      <Text variant="caption" color="textTertiary" style={styles.organizationMeta}>
                        {(() => {
                          const count =
                            organizationUsersByOrg[membership.organization_id]?.length ?? 0;
                          return `${count} ${count === 1 ? "member" : "members"}`;
                        })()}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={colors.textTertiary}
                    />
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
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    shadowColor: colors.gray900,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: spacing.lg,
  },
  heroTitle: {
    fontSize: 40,
    color: colors.primary,
    lineHeight: 44,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
  },
  statCardCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  statPrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  statValue: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
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
  sectionHeaderAction: {
    fontWeight: "700",
  },
  newAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  organizationItemCompact: {
    padding: spacing.sm,
    gap: spacing.sm,
    borderRadius: 12,
  },
  logoBlock: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
  },
  organizationItemBody: {
    flex: 1,
  },
  organizationName: {
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  organizationMeta: {
    marginTop: spacing.xs,
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
    backgroundColor: colors.backgroundSecondary,
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
