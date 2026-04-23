import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button, Card, Input, ScreenScaffold, SliderControl, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useMessageContext } from "../context/MessageContext";
import { useOrganizationContext } from "../context/OrganizationContext";
import { useProjectContext } from "../context/ProjectContext";
import {
  CityAutocomplete,
  type CityAutocompleteSelection,
} from "../features/projects/components/CityAutocomplete";
import { useCompactLayout } from "../hooks/useCompactLayout";
import {
  fetchOrganizationInviteCandidates,
  inviteOrganizationUser,
} from "../utils/backendApi";
import { colors, spacing } from "../theme";
import { MembershipRole, OrganizationUser, RootStackParamList } from "../types";

type OrganizationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Organization"
>;
type OrganizationScreenRouteProp = RouteProp<RootStackParamList, "Organization">;
const PROJECT_GRID_OPTIONS = [
  { resolution: 8, label: "Large", description: "Fewer, larger hexes" },
  { resolution: 9, label: "Medium", description: "Balanced map detail" },
  { resolution: 10, label: "Small", description: "More, smaller hexes" },
] as const;

function getGridLabelForResolution(resolution: number): string {
  return (
    PROJECT_GRID_OPTIONS.find((option) => option.resolution === resolution)?.label ?? "Custom"
  );
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

function formatTimestampLabel(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const OrganizationScreen: React.FC = () => {
  const navigation = useNavigation<OrganizationScreenNavigationProp>();
  const route = useRoute<OrganizationScreenRouteProp>();
  const { organizationId, organizationName, organizationRole } = route.params;
  const { session } = useAuthContext();
  const { isCompact, cardPadding } = useCompactLayout();

  const {
    getOrganizationUsers,
    organizationUsersLoadingByOrg,
    organizationUsersErrorByOrg,
    loadOrganizationUsers: ctxLoadOrganizationUsers,
  } = useOrganizationContext();

  const {
    getProjectsForOrg,
    getProject,
    projectsLoadingByOrg,
    projectsErrorByOrg,
    loadProjects,
    createProjectRecord,
  } = useProjectContext();

  const {
    getSessionsForOrganization,
    sessionsLoading,
    sessionsError,
    loadSessions,
  } = useMessageContext();

  const canEdit = organizationRole === "owner" || organizationRole === "admin";
  const canAssignAdmin = canEdit;

  const projects = getProjectsForOrg(organizationId);
  const loadingProjects = projectsLoadingByOrg[organizationId] ?? false;
  const projectError = projectsErrorByOrg[organizationId] ?? null;

  const messageSessions = useMemo(
    () => getSessionsForOrganization(organizationId),
    [getSessionsForOrganization, organizationId],
  );

  const organizationUsers = getOrganizationUsers(organizationId);
  const loadingOrganizationUsers =
    organizationUsersLoadingByOrg[organizationId] ?? false;
  const organizationUsersError = organizationUsersErrorByOrg[organizationId] ?? null;

  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteCandidates, setInviteCandidates] = useState<OrganizationUser[]>([]);
  const [loadingInviteCandidates, setLoadingInviteCandidates] = useState(false);
  const [inviteCandidatesError, setInviteCandidatesError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<MembershipRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteStatusMessage, setInviteStatusMessage] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<"pickUser" | "pickRole">("pickUser");

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectCity, setNewProjectCity] = useState("");
  const [newProjectCenter, setNewProjectCenter] =
    useState<CityAutocompleteSelection | null>(null);
  const [newProjectGridIndex, setNewProjectGridIndex] = useState(0);
  const [savingProject, setSavingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);

  const loadOrganizationUsers = useCallback(async () => {
    if (!session) return;
    await ctxLoadOrganizationUsers(session, organizationId);
  }, [ctxLoadOrganizationUsers, organizationId, session]);

  const refreshProjects = useCallback(async () => {
    if (!session) return;
    await loadProjects(session, organizationId);
  }, [loadProjects, organizationId, session]);

  const refreshSessions = useCallback(async () => {
    if (!session) return;
    await loadSessions(session);
  }, [loadSessions, session]);

  const loadInviteCandidates = useCallback(async () => {
    if (!session) return;
    setLoadingInviteCandidates(true);
    setInviteCandidatesError(null);
    try {
      const response = await fetchOrganizationInviteCandidates(
        session,
        organizationId,
        inviteSearch,
      );
      setInviteCandidates(response.users);
      if (
        selectedUserId &&
        !response.users.some((candidate) => candidate.user_id === selectedUserId)
      ) {
        setSelectedUserId(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load invite candidates.";
      setInviteCandidatesError(message);
      setInviteCandidates([]);
    } finally {
      setLoadingInviteCandidates(false);
    }
  }, [inviteSearch, organizationId, selectedUserId, session]);

  useEffect(() => {
    void loadOrganizationUsers();
  }, [loadOrganizationUsers]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!canAssignAdmin && inviteRole === "admin") {
      setInviteRole("member");
    }
  }, [canAssignAdmin, inviteRole]);

  const selectedCandidate = useMemo(
    () => inviteCandidates.find((candidate) => candidate.user_id === selectedUserId) ?? null,
    [inviteCandidates, selectedUserId],
  );

  useEffect(() => {
    if (inviteStep === "pickRole" && !selectedCandidate) {
      setInviteStep("pickUser");
    }
  }, [inviteStep, selectedCandidate]);

  const statsLoading = loadingProjects || sessionsLoading;

  const handleInviteUser = async () => {
    if (!session || !selectedUserId) return;
    setInviting(true);
    setInviteCandidatesError(null);
    setInviteStatusMessage(null);
    try {
      const targetRole = canAssignAdmin ? inviteRole : "member";
      await inviteOrganizationUser(session, organizationId, {
        userId: selectedUserId,
        role: targetRole,
      });
      setInviteStatusMessage("User invited successfully.");
      setSelectedUserId(null);
      setInviteRole("member");
      await loadInviteCandidates();
      await loadOrganizationUsers();
      closeInviteModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to invite selected user.";
      setInviteCandidatesError(message);
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = () => {
    setInviteStatusMessage(null);
    setInviteStep("pickUser");
    setSelectedUserId(null);
    setInviteRole("member");
    setInviteCandidatesError(null);
    setInviteModalOpen(true);
    void loadInviteCandidates();
  };

  const closeInviteModal = () => {
    if (inviting) return;
    setInviteStep("pickUser");
    setSelectedUserId(null);
    setInviteRole("member");
    setInviteCandidatesError(null);
    setInviteModalOpen(false);
  };

  const resetCreateProjectForm = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setNewProjectCity("");
    setNewProjectCenter(null);
    setNewProjectGridIndex(0);
    setCreateProjectError(null);
  };

  const openCreateProject = () => {
    resetCreateProjectForm();
    setIsCreateProjectOpen(true);
  };

  const closeCreateProject = () => {
    if (savingProject) return;
    resetCreateProjectForm();
    setIsCreateProjectOpen(false);
  };

  const canSubmitCreateProject =
    Boolean(newProjectName.trim()) && newProjectCenter !== null;

  const handleCreateProject = async () => {
    if (!session) return;
    const trimmedName = newProjectName.trim();
    if (!trimmedName) {
      setCreateProjectError("Project name is required.");
      return;
    }
    if (!newProjectCenter) {
      setCreateProjectError("Select a city from the suggestions.");
      return;
    }
    setSavingProject(true);
    setCreateProjectError(null);
    try {
      const created = await createProjectRecord(session, organizationId, {
        name: trimmedName,
        description: newProjectDescription.trim() || undefined,
        h3Resolution: PROJECT_GRID_OPTIONS[newProjectGridIndex]!.resolution,
        city: newProjectCenter.city,
        centerLat: newProjectCenter.lat,
        centerLng: newProjectCenter.lng,
      });
      if (!created) {
        setCreateProjectError("Unable to create project right now.");
        return;
      }
      setIsCreateProjectOpen(false);
      resetCreateProjectForm();
      navigation.navigate("ProjectMap", {
        organizationId,
        organizationName,
        organizationRole,
        projectId: created.id,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create project right now.";
      setCreateProjectError(message);
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <ScreenScaffold
      title={organizationName}
      subtitle="Overview"
      kicker="ORGANIZATION"
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back to organizations",
        onPress: () => navigation.navigate("Home"),
      }}
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
              {statsLoading ? "..." : projects.length}
            </Text>
            <Text variant="caption" color="white">
              Projects
            </Text>
          </View>
          <View
            style={[styles.statCard, isCompact && styles.statCardCompact]}
          >
            <Text variant="h1" style={styles.statValue}>
              {statsLoading ? "..." : messageSessions.length}
            </Text>
            <Text variant="caption" color="textSecondary">
              Message Threads
            </Text>
          </View>
        </View>
      </View>

      <Card style={[styles.card, { padding: cardPadding }]}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Projects</Text>
          {canEdit ? (
            <TouchableOpacity onPress={openCreateProject} activeOpacity={0.8}>
              <View style={styles.newAction}>
                <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                <Text variant="caption" color="primary" style={styles.sectionHeaderAction}>
                  New
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {loadingProjects ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="body" color="textSecondary" style={styles.loadingText}>
              Loading projects...
            </Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="h3" style={styles.emptyStateTitle}>
              No projects yet
            </Text>
            <Text variant="body" color="textSecondary" style={styles.emptyStateBody}>
              {canEdit
                ? "Create your first project to start assigning teams and map cells."
                : "Members can view projects once an admin creates them."}
            </Text>
            {canEdit ? (
              <Button variant="primary" onPress={openCreateProject}>
                <Text variant="label" color="white">
                  Create Project
                </Text>
              </Button>
            ) : null}
          </View>
        ) : (
          <View style={styles.rowList}>
            {projects.map((project) => {
              const description = project.description?.trim() ?? "";
              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.rowItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate("ProjectMap", {
                      organizationId,
                      organizationName,
                      organizationRole,
                      projectId: project.id,
                    })
                  }
                >
                  <View style={styles.logoBlock}>
                    <Text variant="label" color="primary">
                      {getInitials(project.name)}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text variant="body" style={styles.rowTitle}>
                      {project.name}
                    </Text>
                    {description ? (
                      <Text
                        variant="caption"
                        color="textSecondary"
                        numberOfLines={2}
                      >
                        {description}
                      </Text>
                    ) : null}
                    <View style={styles.rowMeta}>
                      <MaterialCommunityIcons
                        name="hexagon-multiple-outline"
                        size={13}
                        color={colors.textTertiary}
                      />
                      <Text variant="caption" color="textTertiary">
                        {getGridLabelForResolution(project.h3_resolution)} hex grid
                      </Text>
                    </View>
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

        {projectError ? (
          <Text variant="caption" color="error" style={styles.pageErrorText}>
            {projectError}
          </Text>
        ) : null}
      </Card>

      <Card style={[styles.card, { padding: cardPadding }]}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Message Threads</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("NewMessage", {
                organizationId,
                organizationName,
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.newAction}>
              <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
              <Text variant="caption" color="primary" style={styles.sectionHeaderAction}>
                New
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {sessionsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="body" color="textSecondary" style={styles.loadingText}>
              Loading message threads...
            </Text>
          </View>
        ) : messageSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="h3" style={styles.emptyStateTitle}>
              No message threads yet
            </Text>
            <Text variant="body" color="textSecondary" style={styles.emptyStateBody}>
              Start your first conversation with organization members.
            </Text>
            <Button
              variant="primary"
              onPress={() =>
                navigation.navigate("NewMessage", {
                  organizationId,
                  organizationName,
                })
              }
            >
              <Text variant="label" color="white">
                Start a Thread
              </Text>
            </Button>
          </View>
        ) : (
          <View style={styles.rowList}>
            {messageSessions.map((messageSession) => {
              const preview = messageSession.last_message_sent ?? "No messages yet";
              const timestamp = formatTimestampLabel(
                messageSession.updated_at ?? messageSession.created_at,
              );
              const linkedProject = messageSession.project_id
                ? getProject(messageSession.project_id)
                : null;
              return (
                <TouchableOpacity
                  key={messageSession.id}
                  style={styles.rowItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate("MessageDetail", {
                      conversationId: messageSession.id,
                      title: messageSession.title,
                    })
                  }
                >
                  <View style={styles.avatarBlock}>
                    <Text variant="label" color="white">
                      {getInitials(messageSession.title)}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTitleLine}>
                      <Text
                        variant="body"
                        style={styles.rowTitle}
                        numberOfLines={1}
                      >
                        {messageSession.title}
                      </Text>
                      {timestamp ? (
                        <Text variant="caption" color="textTertiary">
                          {timestamp}
                        </Text>
                      ) : null}
                    </View>
                    {messageSession.project_id ? (
                      <View style={styles.projectPill}>
                        <MaterialCommunityIcons
                          name="map-marker-radius-outline"
                          size={12}
                          color={colors.primary}
                        />
                        <Text variant="caption" color="primary" style={styles.projectPillLabel}>
                          Project · {linkedProject?.name ?? "Unknown"}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      variant="caption"
                      color="textSecondary"
                      numberOfLines={2}
                    >
                      {preview}
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

        {sessionsError ? (
          <Text variant="caption" color="error" style={styles.pageErrorText}>
            {sessionsError}
          </Text>
        ) : null}
      </Card>

      <Card style={[styles.card, { padding: cardPadding }]}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Users</Text>
          {canEdit ? (
            <TouchableOpacity onPress={openInviteModal} activeOpacity={0.8}>
              <View style={styles.newAction}>
                <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                <Text variant="caption" color="primary" style={styles.sectionHeaderAction}>
                  Invite
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        {loadingOrganizationUsers ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="body" color="textSecondary" style={styles.loadingText}>
              Loading users...
            </Text>
          </View>
        ) : organizationUsers.length === 0 ? (
          <Text variant="caption" color="textSecondary">
            No users in this organization yet.
          </Text>
        ) : (
          <View style={styles.userList}>
            {organizationUsers.map((userRecord) => (
              <View key={userRecord.user_id} style={styles.userRow}>
                <Text variant="body">
                  {userRecord.profile_full_name || userRecord.user_id}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {userRecord.role}
                </Text>
              </View>
            ))}
          </View>
        )}
        {organizationUsersError ? (
          <Text variant="caption" color="error">
            {organizationUsersError}
          </Text>
        ) : null}
        {inviteStatusMessage ? (
          <Text variant="caption" color="success">
            {inviteStatusMessage}
          </Text>
        ) : null}
      </Card>

      <Modal
        visible={isCreateProjectOpen}
        animationType="fade"
        transparent
        onRequestClose={closeCreateProject}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeCreateProject} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Create Project
            </Text>
            <Input
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Project name"
              autoFocus
            />
            <CityAutocomplete
              session={session}
              value={newProjectCity}
              onChangeText={setNewProjectCity}
              onSelect={setNewProjectCenter}
              placeholder="Search for a city..."
            />
            <Input
              value={newProjectDescription}
              onChangeText={setNewProjectDescription}
              placeholder="Description (optional)"
            />
            <SliderControl
              label="Project map detail"
              value={newProjectGridIndex}
              minimumValue={0}
              maximumValue={PROJECT_GRID_OPTIONS.length - 1}
              step={1}
              onValueChange={setNewProjectGridIndex}
              valueText={PROJECT_GRID_OPTIONS[newProjectGridIndex]!.label}
            />
            <Text variant="caption" color="textSecondary">
              {PROJECT_GRID_OPTIONS[newProjectGridIndex]!.description}
            </Text>
            {createProjectError ? (
              <Text variant="caption" color="error">
                {createProjectError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={closeCreateProject}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleCreateProject()}
                loading={savingProject}
                disabled={!canSubmitCreateProject}
              >
                <Text variant="label" color="white">
                  Create
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={inviteModalOpen}
        animationType="fade"
        transparent
        onRequestClose={closeInviteModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeInviteModal} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Invite User
            </Text>
            {inviteStep === "pickUser" ? (
              <>
                <Input
                  value={inviteSearch}
                  onChangeText={setInviteSearch}
                  placeholder="Search by name or email"
                />
                <ScrollView style={styles.modalList} contentContainerStyle={styles.candidateList}>
                  {loadingInviteCandidates ? (
                    <Text variant="caption" color="textSecondary">
                      Loading invite candidates...
                    </Text>
                  ) : inviteCandidates.length === 0 ? (
                    <Text variant="caption" color="textSecondary">
                      No invite candidates found.
                    </Text>
                  ) : (
                    inviteCandidates.map((candidate) => {
                      const isSelected = selectedUserId === candidate.user_id;
                      return (
                        <TouchableOpacity
                          key={candidate.user_id}
                          style={[
                            styles.candidateRow,
                            isSelected ? styles.candidateRowSelected : null,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedUserId(candidate.user_id);
                            setInviteStatusMessage(null);
                          }}
                        >
                          <Text variant="body">
                            {candidate.profile_full_name || candidate.user_id}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </>
            ) : (
              <>
                {selectedCandidate ? (
                  <Text variant="caption" color="textSecondary">
                    Selected user:{" "}
                    {selectedCandidate.profile_full_name || selectedCandidate.user_id}
                  </Text>
                ) : null}
                <View style={styles.roleSelectRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      inviteRole === "member" ? styles.roleOptionActive : null,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setInviteRole("member")}
                  >
                    <Text
                      variant="caption"
                      color={inviteRole === "member" ? "white" : "textPrimary"}
                    >
                      Member
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      inviteRole === "admin" ? styles.roleOptionActive : null,
                      !canAssignAdmin ? styles.roleOptionDisabled : null,
                    ]}
                    activeOpacity={0.8}
                    disabled={!canAssignAdmin}
                    onPress={() => setInviteRole("admin")}
                  >
                    <Text
                      variant="caption"
                      color={inviteRole === "admin" ? "white" : "textPrimary"}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
                {!canAssignAdmin ? (
                  <Text variant="caption" color="textSecondary">
                    Only owners/admins can assign admin role.
                  </Text>
                ) : null}
              </>
            )}

            {inviteCandidatesError ? (
              <Text variant="caption" color="error">
                {inviteCandidatesError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              {inviteStep === "pickRole" ? (
                <Button variant="outline" onPress={() => setInviteStep("pickUser")}>
                  <Text variant="label" color="primary">
                    Back
                  </Text>
                </Button>
              ) : (
                <Button variant="outline" onPress={closeInviteModal}>
                  <Text variant="label" color="primary">
                    Cancel
                  </Text>
                </Button>
              )}
              {inviteStep === "pickUser" ? (
                <Button
                  variant="primary"
                  onPress={() => setInviteStep("pickRole")}
                  disabled={!selectedCandidate}
                >
                  <Text variant="label" color="white">
                    Next
                  </Text>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onPress={() => void handleInviteUser()}
                  loading={inviting}
                  disabled={!selectedCandidate}
                >
                  <Text variant="label" color="white">
                    Invite User
                  </Text>
                </Button>
              )}
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
  rowList: {
    gap: spacing.sm,
  },
  rowItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
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
  avatarBlock: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: "600",
    marginBottom: spacing.xs,
    flexShrink: 1,
  },
  rowTitleLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  projectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.actionSecondary,
    marginBottom: spacing.xs,
  },
  projectPillLabel: {
    fontWeight: "600",
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
    marginTop: spacing.xs,
  },
  userList: {
    gap: spacing.xs,
  },
  userRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    gap: spacing.sm,
    maxHeight: "85%",
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalList: {
    maxHeight: 240,
  },
  candidateList: {
    gap: spacing.xs,
  },
  candidateRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  candidateRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.actionSecondary,
  },
  roleSelectRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  roleOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleOptionDisabled: {
    opacity: 0.55,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
