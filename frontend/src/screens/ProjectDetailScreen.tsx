import React, { useEffect, useMemo, useState } from "react";
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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Button, Card, Checkbox, Input, ScreenScaffold, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useProjectController } from "../features/projects/hooks/useProjectController";
import { colors, spacing } from "../theme";
import type { RootStackParamList, UUID } from "../types";

type ProjectDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ProjectDetail"
>;
type ProjectDetailRouteProp = RouteProp<RootStackParamList, "ProjectDetail">;

const TEAM_COLOR_PALETTE = [
  "#FF5733",
  "#22C55E",
  "#A855F7",
  "#F59E0B",
  "#14B8A6",
  "#E11D48",
  "#06B6D4",
];

const MAX_ROW_MEMBER_NAMES = 3;

function pickNextTeamColor(existingColors: string[]): string {
  const used = new Set(existingColors.map((color) => color.trim().toUpperCase()));
  const firstAvailable = TEAM_COLOR_PALETTE.find((color) => !used.has(color));
  return firstAvailable ?? TEAM_COLOR_PALETTE[existingColors.length % TEAM_COLOR_PALETTE.length];
}

function arraysEqualAsSets(a: UUID[], b: UUID[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const value of b) {
    if (!setA.has(value)) return false;
  }
  return true;
}

export const ProjectDetailScreen: React.FC = () => {
  const navigation = useNavigation<ProjectDetailNavigationProp>();
  const route = useRoute<ProjectDetailRouteProp>();
  const { organizationId, organizationName, organizationRole, projectId } = route.params;
  const { session } = useAuthContext();

  const {
    canEdit,
    projects,
    loadingProjects,
    teamError,
    managingTeam,
    organizationUsers,
    organizationUsersById,
    loadProjectTeams,
    loadProjectMembers,
    getProjectTeams,
    getProjectMembers,
    createTeamRecord,
    updateTeamRecord,
    deleteTeamRecord,
    saveTeamMembers,
    setTeamError,
    updateProjectRecord,
    deleteProjectRecord,
    savingProject,
  } = useProjectController({
    session,
    organizationId,
    organizationRole,
  });

  const [teamName, setTeamName] = useState("");
  const [teamColorHex, setTeamColorHex] = useState("#22C55E");
  const [editingTeamId, setEditingTeamId] = useState<UUID | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<UUID[]>([]);
  const [initialUserIds, setInitialUserIds] = useState<UUID[]>([]);
  const [deleteTeamConfirmOpen, setDeleteTeamConfirmOpen] = useState(false);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState(false);

  useEffect(() => {
    void loadProjectTeams(projectId);
    void loadProjectMembers(projectId);
  }, [loadProjectMembers, loadProjectTeams, projectId]);

  const project = useMemo(
    () => projects.find((candidate) => candidate.id === projectId) ?? null,
    [projectId, projects],
  );
  const teams = getProjectTeams(projectId);
  const members = getProjectMembers(projectId);

  const membersByTeam = useMemo(() => {
    const map = new Map<UUID, UUID[]>();
    for (const member of members) {
      const existing = map.get(member.team_id) ?? [];
      existing.push(member.user_id);
      map.set(member.team_id, existing);
    }
    return map;
  }, [members]);

  const normalizedSelectedColor = teamColorHex.trim().toUpperCase();
  const isDuplicateColor = teams.some((team) => {
    if (editingTeamId && team.id === editingTeamId) return false;
    return team.color_hex.trim().toUpperCase() === normalizedSelectedColor;
  });

  const handleCreateTeam = async () => {
    setTeamError(null);
    const resolvedName = teamName.trim() || `Team ${teams.length + 1}`;
    const normalizedColor = teamColorHex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) return;
    const created = await createTeamRecord(projectId, {
      name: resolvedName,
      colorHex: normalizedColor,
    });
    if (!created) return;
    setTeamName("");
    setTeamColorHex(pickNextTeamColor(teams.map((team) => team.color_hex)));
    setEditingTeamId(null);
    setTeamModalOpen(false);
  };

  const handleOpenTeamSettings = (teamId: UUID) => {
    const target = teams.find((team) => team.id === teamId);
    if (!target) return;
    const currentMembers = members
      .filter((member) => member.team_id === teamId)
      .map((member) => member.user_id);
    setEditingTeamId(teamId);
    setTeamName(target.name);
    setTeamColorHex(target.color_hex);
    setSelectedUserIds(currentMembers);
    setInitialUserIds(currentMembers);
    setTeamError(null);
    setTeamModalOpen(true);
  };

  const handleSaveTeamEdit = async () => {
    setTeamError(null);
    if (!editingTeamId) return;
    const normalizedColor = teamColorHex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) return;

    const existing = teams.find((team) => team.id === editingTeamId);
    const trimmedName = teamName.trim();
    const nameChanged = existing ? existing.name !== trimmedName : true;
    const colorChanged = existing
      ? existing.color_hex.trim().toUpperCase() !== normalizedColor.toUpperCase()
      : true;

    if (nameChanged || colorChanged) {
      const updated = await updateTeamRecord(projectId, editingTeamId, {
        name: trimmedName,
        colorHex: normalizedColor,
      });
      if (!updated) return;
    }

    if (!arraysEqualAsSets(selectedUserIds, initialUserIds)) {
      const saved = await saveTeamMembers(projectId, editingTeamId, selectedUserIds);
      if (!saved) return;
    }

    setEditingTeamId(null);
    setTeamName("");
    setTeamColorHex(pickNextTeamColor(teams.map((team) => team.color_hex)));
    setSelectedUserIds([]);
    setInitialUserIds([]);
    setTeamModalOpen(false);
  };

  const openDeleteTeamConfirm = () => {
    if (!editingTeamId || managingTeam) return;
    setDeleteTeamConfirmOpen(true);
  };

  const closeDeleteTeamConfirm = () => {
    if (managingTeam) return;
    setDeleteTeamConfirmOpen(false);
  };

  const handleConfirmDeleteTeam = async () => {
    if (!editingTeamId) return;
    const ok = await deleteTeamRecord(projectId, editingTeamId);
    if (!ok) return;
    setDeleteTeamConfirmOpen(false);
    setEditingTeamId(null);
    setTeamName("");
    setTeamColorHex(pickNextTeamColor(teams.map((team) => team.color_hex)));
    setSelectedUserIds([]);
    setInitialUserIds([]);
    setTeamModalOpen(false);
  };

  const openCreateTeamModal = () => {
    setEditingTeamId(null);
    setTeamName("");
    setTeamColorHex(pickNextTeamColor(teams.map((team) => team.color_hex)));
    setSelectedUserIds([]);
    setInitialUserIds([]);
    setTeamError(null);
    setTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    setTeamModalOpen(false);
    setDeleteTeamConfirmOpen(false);
    setEditingTeamId(null);
    setTeamName("");
    setTeamColorHex(pickNextTeamColor(teams.map((team) => team.color_hex)));
    setSelectedUserIds([]);
    setInitialUserIds([]);
    setTeamError(null);
  };

  const toggleUser = (userId: UUID, nextValue: boolean) => {
    setSelectedUserIds((previous) =>
      nextValue ? [...previous, userId] : previous.filter((id) => id !== userId),
    );
  };

  const openEditProject = () => {
    if (!project) return;
    setEditProjectName(project.name);
    setEditProjectDescription(project.description ?? "");
    setEditProjectOpen(true);
  };

  const closeEditProject = () => {
    if (savingProject) return;
    setEditProjectOpen(false);
  };

  const handleSaveProjectEdit = async () => {
    if (!project) return;
    const trimmedName = editProjectName.trim();
    const trimmedDescription = editProjectDescription.trim();
    if (!trimmedName) return;
    const nameChanged = trimmedName !== project.name;
    const descriptionChanged =
      trimmedDescription !== (project.description ?? "");
    if (!nameChanged && !descriptionChanged) {
      setEditProjectOpen(false);
      return;
    }
    const updated = await updateProjectRecord(projectId, {
      name: trimmedName,
      description: trimmedDescription,
    });
    if (!updated) return;
    setEditProjectOpen(false);
  };

  const openDeleteProjectConfirm = () => {
    if (savingProject) return;
    setDeleteProjectConfirmOpen(true);
  };

  const closeDeleteProjectConfirm = () => {
    if (savingProject) return;
    setDeleteProjectConfirmOpen(false);
  };

  const handleConfirmDeleteProject = async () => {
    const ok = await deleteProjectRecord(projectId);
    if (!ok) return;
    setDeleteProjectConfirmOpen(false);
    navigation.goBack();
  };

  const resolveUserName = (userId: UUID) => {
    const user = organizationUsersById.get(userId);
    return user?.profile_full_name?.trim() || user?.user_id || userId;
  };

  const renderMemberSummary = (teamId: UUID) => {
    const ids = membersByTeam.get(teamId) ?? [];
    if (ids.length === 0) {
      return (
        <Text variant="caption" color="textTertiary">
          No members yet
        </Text>
      );
    }
    const visible = ids.slice(0, MAX_ROW_MEMBER_NAMES).map(resolveUserName);
    const overflow = ids.length - visible.length;
    const summary = overflow > 0 ? `${visible.join(", ")} +${overflow}` : visible.join(", ");
    return (
      <Text variant="caption" color="textSecondary">
        {summary}
      </Text>
    );
  };

  const saveDisabled =
    !teamName.trim() ||
    isDuplicateColor ||
    !/^#[0-9A-Fa-f]{6}$/.test(teamColorHex.trim());
  const activeTeamName = teams.find((team) => team.id === editingTeamId)?.name ?? "this team";

  return (
    <ScreenScaffold
      title={project?.name ?? "Project"}
      subtitle={`${organizationName} • ${organizationRole.toUpperCase()}`}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back",
        onPress: () => navigation.goBack(),
      }}
      rightActions={[
        {
          iconName: "map-outline",
          accessibilityLabel: "Open project map",
          onPress: () =>
            navigation.navigate("ProjectMap", {
              organizationId,
              organizationName,
              organizationRole,
              projectId,
            }),
        },
        ...(canEdit
          ? ([
              {
                iconName: "pencil-outline",
                accessibilityLabel: "Edit project",
                onPress: openEditProject,
              },
              {
                iconName: "trash-can-outline",
                accessibilityLabel: "Delete project",
                onPress: openDeleteProjectConfirm,
              },
            ] as const)
          : []),
      ]}
    >
      <Card style={styles.headerCard}>
        <Text variant="caption" color="primary">
          Project Settings
        </Text>
        <Text variant="body" color="textSecondary">
          {project?.description?.trim() || "Manage teams, members, and map assignments."}
        </Text>
        <Button
          variant="primary"
          onPress={() =>
            navigation.navigate("ProjectMap", {
              organizationId,
              organizationName,
              organizationRole,
              projectId,
            })
          }
        >
          <Text variant="label" color="white">
            Open Project Map
          </Text>
        </Button>
      </Card>

      {loadingProjects ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" color="textSecondary">
            Loading project details...
          </Text>
        </View>
      ) : null}

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Teams</Text>
          {canEdit ? (
            <TouchableOpacity onPress={openCreateTeamModal} activeOpacity={0.8}>
              <View style={styles.newAction}>
                <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                <Text variant="caption" color="primary" style={styles.sectionHeaderAction}>
                  New
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        {teams.length === 0 ? (
          <Text variant="caption" color="textSecondary">
            No teams yet.
          </Text>
        ) : (
          <View style={styles.teamList}>
            {teams.map((team) => {
              const rowContent = (
                <View style={styles.teamRowInner}>
                  <View style={styles.teamRowLead}>
                    <View style={[styles.teamColorDot, { backgroundColor: team.color_hex }]} />
                    <View style={styles.teamRowCopy}>
                      <Text variant="body">{team.name}</Text>
                      {renderMemberSummary(team.id)}
                    </View>
                  </View>
                  {canEdit ? (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={colors.textTertiary}
                    />
                  ) : null}
                </View>
              );

              return canEdit ? (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamRow}
                  activeOpacity={0.8}
                  onPress={() => handleOpenTeamSettings(team.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open settings for ${team.name}`}
                >
                  {rowContent}
                </TouchableOpacity>
              ) : (
                <View key={team.id} style={styles.teamRow}>
                  {rowContent}
                </View>
              );
            })}
          </View>
        )}

        {canEdit ? null : (
          <Text variant="caption" color="textSecondary">
            Members can view teams but cannot modify them.
          </Text>
        )}
        {teamError && !teamModalOpen ? (
          <Text variant="caption" color="error">
            {teamError}
          </Text>
        ) : null}
      </Card>

      <Modal
        visible={teamModalOpen}
        animationType="fade"
        transparent
        onRequestClose={closeTeamModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeTeamModal} />
          <View style={styles.modalCard}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text variant="h3">{editingTeamId ? "Team Settings" : "Create Team"}</Text>
              <Input
                label="Team name"
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Team name"
                helperText={
                  editingTeamId
                    ? undefined
                    : "Optional. Leave blank to auto-name (Team 2, Team 3, ...)."
                }
              />
              <Input
                label="Team color"
                value={teamColorHex}
                onChangeText={setTeamColorHex}
                placeholder="#22C55E"
                helperText="Use a hex color like #22C55E"
              />
              {isDuplicateColor ? (
                <Text variant="caption" color="error">
                  This color is already used by another team in this project.
                </Text>
              ) : null}

              {editingTeamId ? (
                <View style={styles.memberSection}>
                  <Text variant="label">Members</Text>
                  {organizationUsers.length === 0 ? (
                    <Text variant="caption" color="textSecondary">
                      No organization users found.
                    </Text>
                  ) : (
                    organizationUsers.map((user) => {
                      const checked = selectedUserIds.includes(user.user_id);
                      return (
                        <Checkbox
                          key={user.user_id}
                          value={checked}
                          disabled={!canEdit}
                          onToggle={(nextValue) => toggleUser(user.user_id, nextValue)}
                        >
                          <View>
                            <Text variant="body">
                              {user.profile_full_name || user.user_id}
                            </Text>
                            <Text variant="caption" color="textSecondary">
                              Org role: {user.role}
                            </Text>
                          </View>
                        </Checkbox>
                      );
                    })
                  )}
                </View>
              ) : null}

              {teamError ? (
                <Text variant="caption" color="error">
                  {teamError}
                </Text>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              {editingTeamId ? (
                <Button
                  variant="outline"
                  onPress={openDeleteTeamConfirm}
                  loading={managingTeam}
                >
                  <Text variant="label" color="error">
                    Delete
                  </Text>
                </Button>
              ) : (
                <View />
              )}
              <View style={styles.modalActionsRight}>
                <Button variant="outline" onPress={closeTeamModal}>
                  <Text variant="label" color="primary">
                    Cancel
                  </Text>
                </Button>
                <Button
                  variant="primary"
                  onPress={() =>
                    editingTeamId ? void handleSaveTeamEdit() : void handleCreateTeam()
                  }
                  loading={managingTeam}
                  disabled={saveDisabled}
                >
                  <Text variant="label" color="white">
                    {editingTeamId ? "Save" : "Create Team"}
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteTeamConfirmOpen}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteTeamConfirm}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeDeleteTeamConfirm} />
          <View style={styles.modalCard}>
            <Text variant="h3">Delete team</Text>
            <Text variant="body" color="textSecondary">
              Delete "{activeTeamName}"? This will remove its members and hex assignments.
            </Text>
            <View style={styles.modalActions}>
              <View />
              <View style={styles.modalActionsRight}>
                <Button variant="outline" onPress={closeDeleteTeamConfirm}>
                  <Text variant="label" color="primary">
                    Cancel
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => void handleConfirmDeleteTeam()}
                  loading={managingTeam}
                >
                  <Text variant="label" color="error">
                    Delete
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editProjectOpen}
        animationType="fade"
        transparent
        onRequestClose={closeEditProject}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={closeEditProject}
          />
          <View style={styles.modalCard}>
            <Text variant="h3">Edit Project</Text>
            <Input
              label="Name"
              value={editProjectName}
              onChangeText={setEditProjectName}
              placeholder="Project name"
              autoFocus
            />
            <Input
              label="Description"
              value={editProjectDescription}
              onChangeText={setEditProjectDescription}
              placeholder="Description (optional)"
            />
            <View style={styles.modalActions}>
              <View />
              <View style={styles.modalActionsRight}>
                <Button variant="outline" onPress={closeEditProject}>
                  <Text variant="label" color="primary">
                    Cancel
                  </Text>
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void handleSaveProjectEdit()}
                  loading={savingProject}
                  disabled={!editProjectName.trim()}
                >
                  <Text variant="label" color="white">
                    Save
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteProjectConfirmOpen}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteProjectConfirm}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={closeDeleteProjectConfirm}
          />
          <View style={styles.modalCard}>
            <Text variant="h3">Delete project</Text>
            <Text variant="body" color="textSecondary">
              Delete "{project?.name ?? "this project"}"? This will remove its
              teams, members, and hex assignments.
            </Text>
            <View style={styles.modalActions}>
              <View />
              <View style={styles.modalActionsRight}>
                <Button variant="outline" onPress={closeDeleteProjectConfirm}>
                  <Text variant="label" color="primary">
                    Cancel
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => void handleConfirmDeleteProject()}
                  loading={savingProject}
                >
                  <Text variant="label" color="error">
                    Delete
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionHeaderAction: {
    fontWeight: "700",
  },
  newAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  teamList: {
    gap: spacing.xs,
  },
  teamRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  teamRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  teamRowLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  teamRowCopy: {
    flex: 1,
    gap: 2,
  },
  teamColorDot: {
    width: 12,
    height: 12,
    borderRadius: 99,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 22, 36, 0.38)",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "85%",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  memberSection: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalActionsRight: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
