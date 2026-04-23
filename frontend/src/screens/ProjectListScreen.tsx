import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button, Card, Input, ScreenScaffold, SliderControl, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import {
  CityAutocomplete,
  type CityAutocompleteSelection,
} from "../features/projects/components/CityAutocomplete";
import { useProjectController } from "../features/projects/hooks/useProjectController";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type ProjectListNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ProjectList"
>;
type ProjectListRouteProp = RouteProp<RootStackParamList, "ProjectList">;
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

export const ProjectListScreen: React.FC = () => {
  const navigation = useNavigation<ProjectListNavigationProp>();
  const route = useRoute<ProjectListRouteProp>();
  const { organizationId, organizationName, organizationRole } = route.params;
  const { session } = useAuthContext();
  const { isCompact, cardPadding } = useCompactLayout();

  const {
    canEdit,
    projects,
    loadingProjects,
    projectError,
    savingProject,
    createProjectRecord,
  } = useProjectController({
    session,
    organizationId,
    organizationRole,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [projectCenter, setProjectCenter] =
    useState<CityAutocompleteSelection | null>(null);
  const [projectGridIndex, setProjectGridIndex] = useState(0);

  const resetCreateForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectCity("");
    setProjectCenter(null);
    setProjectGridIndex(0);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (savingProject) return;
    resetCreateForm();
    setIsCreateOpen(false);
  };

  const canSubmit = Boolean(projectName.trim()) && projectCenter !== null;

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim();
    if (!trimmedName || !projectCenter) return;
    const created = await createProjectRecord({
      name: trimmedName,
      description: projectDescription.trim() || undefined,
      h3Resolution: PROJECT_GRID_OPTIONS[projectGridIndex]!.resolution,
      city: projectCenter.city,
      centerLat: projectCenter.lat,
      centerLng: projectCenter.lng,
    });
    if (!created) return;
    setIsCreateOpen(false);
    resetCreateForm();
    navigation.navigate("ProjectMap", {
      organizationId,
      organizationName,
      organizationRole,
      projectId: created.id,
    });
  };

  return (
    <ScreenScaffold
      title={`${organizationName} Projects`}
      subtitle={`Role: ${organizationRole.toUpperCase()}`}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back",
        onPress: () => navigation.goBack(),
      }}
      rightActions={
        canEdit
          ? [
              {
                iconName: "plus",
                accessibilityLabel: "Create project",
                onPress: openCreateModal,
              },
            ]
          : []
      }
    >
      <Card style={[styles.card, { padding: cardPadding }]}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Projects</Text>
          {canEdit ? (
            <TouchableOpacity onPress={openCreateModal} activeOpacity={0.8}>
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
              <Button variant="primary" onPress={openCreateModal}>
                <Text variant="label" color="white">
                  Create Project
                </Text>
              </Button>
            ) : null}
          </View>
        ) : (
          <View style={styles.projectList}>
            {projects.map((project) => {
              const description = project.description?.trim() ?? "";
              return (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectItem,
                    isCompact && styles.projectItemCompact,
                  ]}
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
                      {project.name
                        .split(" ")
                        .map((word) => word.charAt(0))
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.projectItemBody}>
                    <Text variant="body" style={styles.projectName}>
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
                    <View style={styles.projectMeta}>
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
      </Card>

      {projectError ? (
        <Text variant="caption" color="error" style={styles.pageErrorText}>
          {projectError}
        </Text>
      ) : null}

      <Modal
        visible={isCreateOpen}
        animationType="fade"
        transparent
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeCreateModal} />
          <View style={styles.modalCard}>
            <Text variant="h3" style={styles.modalTitle}>
              Create Project
            </Text>
            <Input
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Project name"
              autoFocus
            />
            <CityAutocomplete
              session={session}
              value={projectCity}
              onChangeText={setProjectCity}
              onSelect={setProjectCenter}
              placeholder="Search for a city..."
            />
            <Input
              value={projectDescription}
              onChangeText={setProjectDescription}
              placeholder="Description (optional)"
            />
            <SliderControl
              label="Project map detail"
              value={projectGridIndex}
              minimumValue={0}
              maximumValue={PROJECT_GRID_OPTIONS.length - 1}
              step={1}
              onValueChange={setProjectGridIndex}
              valueText={PROJECT_GRID_OPTIONS[projectGridIndex]!.label}
            />
            <Text variant="caption" color="textSecondary">
              {PROJECT_GRID_OPTIONS[projectGridIndex]!.description}
            </Text>
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={closeCreateModal}>
                <Text variant="label" color="primary">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleCreateProject()}
                loading={savingProject}
                disabled={!canSubmit}
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
  projectList: {
    gap: spacing.sm,
  },
  projectItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  projectItemCompact: {
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
  projectItemBody: {
    flex: 1,
  },
  projectName: {
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
    marginTop: spacing.xs,
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
});
