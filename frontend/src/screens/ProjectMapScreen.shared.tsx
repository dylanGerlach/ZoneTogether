import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button, Input, ScreenScaffold, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useMessageContext } from "../context/MessageContext";
import { MessageThreadView } from "../features/messaging/components/MessageThreadView";
import { EMOJI_TAGS } from "../features/messaging/emojiTags";
import { ProjectH3MapCanvasWeb } from "../features/projects/components/ProjectH3MapCanvas.web";
import { useProjectController } from "../features/projects/hooks/useProjectController";
import { useProjectH3MapController } from "../features/projects/hooks/useProjectH3MapController";
import {
  getCellOwnerTeamId,
  latLngToProjectCell,
} from "../features/projects/logic";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../types";

type ProjectMapNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ProjectMap"
>;
type ProjectMapRouteProp = RouteProp<RootStackParamList, "ProjectMap">;

export const ProjectMapScreen: React.FC = () => {
  const navigation = useNavigation<ProjectMapNavigationProp>();
  const route = useRoute<ProjectMapRouteProp>();
  const { organizationRole, organizationName, organizationId, projectId, focusH3Cell } =
    route.params;
  const { session } = useAuthContext();

  const {
    canEdit,
    project,
    teams,
    activeTeamId,
    setActiveTeamId,
    loadingMap,
    savingMap,
    creatingTeam,
    mapError,
    h3Resolution,
    handleCellToggle,
    handleCreateTeam,
  } = useProjectH3MapController({
    session,
    projectId,
    organizationRole,
  });

  const { updateProjectRecord, deleteProjectRecord, savingProject } =
    useProjectController({
      session,
      organizationId,
      organizationRole,
    });

  const {
    getSessionForProject,
    sessionsById,
    ensureProjectSession,
    sendMessage,
    sendingBySession,
  } = useMessageContext();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Admins default to edit mode; they can flip to view via the toggle on the
  // canvas header. Non-admins never see the toggle and effectiveCanEdit stays
  // false regardless of this state.
  const [editMode, setEditMode] = useState(true);
  const effectiveCanEdit = canEdit && editMode;

  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [pendingDescription, setPendingDescription] = useState("");
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [activeFocusCell, setActiveFocusCell] = useState<string | null>(
    focusH3Cell ?? null,
  );
  const screenScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setActiveFocusCell(focusH3Cell ?? null);
  }, [focusH3Cell]);

  const handleGridChipPress = useCallback((cell: string) => {
    setActiveFocusCell(cell);
    // Bring the map back into view so the focused cell is actually visible
    // even if the user pressed "View on Map" from far down in the chat.
    screenScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const projectSession = useMemo(
    () => getSessionForProject(projectId),
    // Re-derive when sessions change so we pick up newly loaded project sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getSessionForProject, projectId, sessionsById],
  );

  const sendingForProjectSession = projectSession
    ? sendingBySession[projectSession.id] ?? false
    : false;

  useEffect(() => {
    if (!editOpen || !project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }, [editOpen, project]);

  const openEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (savingProject) return;
    setEditOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!project) return;
    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();
    if (!trimmedName) return;
    const nameChanged = trimmedName !== project.name;
    const descriptionChanged = trimmedDescription !== (project.description ?? "");
    if (!nameChanged && !descriptionChanged) {
      setEditOpen(false);
      return;
    }
    const updated = await updateProjectRecord(projectId, {
      name: trimmedName,
      description: trimmedDescription,
    });
    if (!updated) return;
    setEditOpen(false);
  };

  const openDeleteConfirm = () => {
    if (savingProject) return;
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (savingProject) return;
    setDeleteConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    const ok = await deleteProjectRecord(projectId);
    if (!ok) return;
    setDeleteConfirmOpen(false);
    navigation.goBack();
  };

  // Auto-provision the project chat session on mount so the embedded
  // MessageThreadView has a conversationId to render against.
  useEffect(() => {
    if (!session || projectSession) return;
    void ensureProjectSession(session, projectId);
  }, [ensureProjectSession, projectId, projectSession, session]);

  const handleCanvasMapClick = useCallback(
    (latitude: number, longitude: number) => {
      // In view mode (or for non-admin members), clicking a hex opens the
      // share-to-chat flow instead of mutating assignments — but only if the
      // clicked cell is actually assigned to some team. Unassigned hexes are
      // ignored in view mode so people don't share bare map tiles into chat.
      if (!effectiveCanEdit) {
        const cell = latLngToProjectCell({
          latitude,
          longitude,
          resolution: h3Resolution,
        });
        if (!getCellOwnerTeamId(teams, cell)) return;
        setPendingCell(cell);
        setPendingDescription("");
        setPendingEmoji(null);
        return;
      }
      void handleCellToggle(latitude, longitude);
    },
    [effectiveCanEdit, h3Resolution, handleCellToggle, teams],
  );

  const cancelShare = () => {
    setPendingCell(null);
    setPendingDescription("");
    setPendingEmoji(null);
  };

  const handleSendShare = async () => {
    if (!session || !pendingCell) return;
    const trimmed = pendingDescription.trim();
    if (!trimmed) return;
    let targetSession = projectSession;
    if (!targetSession) {
      targetSession = await ensureProjectSession(session, projectId);
    }
    if (!targetSession) return;
    // Prepend the selected emoji (if any) so teammates can visually scan the
    // chat for status/hazard signals without reading each description.
    const body = pendingEmoji ? `${pendingEmoji} ${trimmed}` : trimmed;
    const created = await sendMessage(session, targetSession.id, body, {
      h3Cell: pendingCell,
    });
    if (!created) return;
    setPendingCell(null);
    setPendingDescription("");
    setPendingEmoji(null);
  };

  const rightActions: Array<{
    iconName: "cog-outline" | "pencil-outline" | "trash-can-outline";
    accessibilityLabel: string;
    onPress: () => void;
  }> = [];

  rightActions.push({
    iconName: "cog-outline",
    accessibilityLabel: "Open project settings",
    onPress: () =>
      navigation.navigate("ProjectDetail", {
        organizationId,
        organizationName,
        organizationRole,
        projectId,
      }),
  });

  if (canEdit) {
    rightActions.push({
      iconName: "pencil-outline",
      accessibilityLabel: "Edit project",
      onPress: openEdit,
    });
    rightActions.push({
      iconName: "trash-can-outline",
      accessibilityLabel: "Delete project",
      onPress: openDeleteConfirm,
    });
  }

  return (
    <ScreenScaffold
      title={project?.name ?? "Project Map"}
      subtitle={`${organizationName} • ${organizationRole.toUpperCase()}`}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back",
        onPress: () => navigation.goBack(),
      }}
      rightActions={rightActions}
      scrollRef={screenScrollRef}
    >
      {loadingMap ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" color="textSecondary">
            Loading map...
          </Text>
        </View>
      ) : (
        <ProjectH3MapCanvasWeb
          teams={teams}
          activeTeamId={activeTeamId}
          setActiveTeamId={setActiveTeamId}
          canEdit={effectiveCanEdit}
          isAdmin={canEdit}
          onToggleEditMode={() => setEditMode((previous) => !previous)}
          savingMap={savingMap}
          creatingTeam={creatingTeam}
          onCreateTeam={() => {
            void handleCreateTeam();
          }}
          onMapClick={handleCanvasMapClick}
          focusCell={activeFocusCell}
          initialCenter={
            project ? [project.center_lat, project.center_lng] : null
          }
        />
      )}

      {mapError ? (
        <Text variant="caption" color="error">
          {mapError}
        </Text>
      ) : null}

      <View style={styles.chatSection}>
        <Text variant="label" color="textSecondary" style={styles.chatHeading}>
          Project Chat
        </Text>
        {projectSession ? (
          <MessageThreadView
            conversationId={projectSession.id}
            onGridChipPress={handleGridChipPress}
          />
        ) : (
          <View style={styles.chatPlaceholder}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="caption" color="textSecondary">
              Loading project chat...
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeEdit} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Edit Project
            </Text>
            <Input
              label="Name"
              value={editName}
              onChangeText={setEditName}
              placeholder="Project name"
              autoFocus
            />
            <Input
              label="Description"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description (optional)"
            />
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={closeEdit}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleSaveEdit()}
                loading={savingProject}
                disabled={!editName.trim()}
              >
                <Text variant="label" color="white">
                  Save
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmOpen}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteConfirm}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeDeleteConfirm} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Delete project
            </Text>
            <Text variant="body" color="textSecondary">
              Delete "{project?.name ?? "this project"}"? This will remove its teams, members, and
              hex assignments.
            </Text>
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={closeDeleteConfirm}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => void handleConfirmDelete()}
                loading={savingProject}
              >
                <Text variant="label" color="error">
                  Delete
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pendingCell !== null}
        animationType="fade"
        transparent
        onRequestClose={cancelShare}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={cancelShare} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Share grid to chat
            </Text>
            <Input
              value={pendingDescription}
              onChangeText={setPendingDescription}
              placeholder="Describe what's here"
              autoFocus
            />
            <Text variant="caption" color="textSecondary" style={styles.emojiHeading}>
              Add a tag (optional)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiRow}
            >
              {EMOJI_TAGS.map(({ emoji, label }) => {
                const selected = pendingEmoji === emoji;
                return (
                  <Pressable
                    key={emoji}
                    onPress={() =>
                      setPendingEmoji((prev) => (prev === emoji ? null : emoji))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected }}
                    style={[
                      styles.emojiChip,
                      selected && styles.emojiChipSelected,
                    ]}
                  >
                    <Text variant="body" style={styles.emojiGlyph}>
                      {emoji}
                    </Text>
                    <Text
                      variant="caption"
                      color={selected ? "primary" : "textSecondary"}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={cancelShare}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleSendShare()}
                loading={sendingForProjectSession}
                disabled={!pendingDescription.trim()}
              >
                <Text variant="label" color="white">
                  Send
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chatSection: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  chatHeading: {
    paddingHorizontal: spacing.xs,
  },
  chatPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
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
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  emojiHeading: {
    marginTop: spacing.xs,
  },
  emojiRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  emojiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  emojiChipSelected: {
    borderColor: colors.primary,
    backgroundColor: "#eef6ff",
  },
  emojiGlyph: {
    fontSize: 18,
  },
});
