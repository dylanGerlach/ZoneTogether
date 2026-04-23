import { useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";

import type {
  AuthSession,
  MembershipRole,
  OrganizationUser,
  UUID,
} from "../../../types";
import { useOrganizationContext } from "../../../context/OrganizationContext";
import { useProjectContext } from "../../../context/ProjectContext";
import { canEditOrganizationProjects } from "../logic";

type UseProjectControllerArgs = {
  session: AuthSession | null;
  organizationId: UUID;
  organizationRole: MembershipRole;
};

export function useProjectController({
  session,
  organizationId,
  organizationRole,
}: UseProjectControllerArgs) {
  const canEdit = canEditOrganizationProjects(organizationRole);

  const {
    getOrganizationUsers,
    loadOrganizationUsers,
  } = useOrganizationContext();

  const {
    getProjectsForOrg,
    projectsLoadingByOrg,
    projectsErrorByOrg,
    loadProjects,
    createProjectRecord: ctxCreateProject,
    updateProjectRecord: ctxUpdateProject,
    deleteProjectRecord: ctxDeleteProject,
    loadProjectTeams: ctxLoadProjectTeams,
    loadProjectMembers: ctxLoadProjectMembers,
    getProjectTeams,
    getProjectMembers,
    createTeamRecord: ctxCreateTeam,
    updateTeamRecord: ctxUpdateTeam,
    deleteTeamRecord: ctxDeleteTeam,
    saveTeamMembers: ctxSaveTeamMembers,
    projectError,
    teamError,
    savingProject,
    managingTeam,
    setTeamError,
  } = useProjectContext();

  const projects = getProjectsForOrg(organizationId);
  const loadingProjects = projectsLoadingByOrg[organizationId] ?? false;
  const organizationUsers = getOrganizationUsers(organizationId);
  // Surface a per-org error when present.
  const combinedProjectError = projectsErrorByOrg[organizationId] ?? projectError;

  const assertCanEdit = useCallback(() => {
    if (!canEdit) {
      Alert.alert("Read-only access", "Only organization admins can modify projects.");
      return false;
    }
    return true;
  }, [canEdit]);

  const loadProjectsForOrg = useCallback(async () => {
    if (!session) return;
    await loadProjects(session, organizationId);
  }, [loadProjects, organizationId, session]);

  const ensureOrganizationUsers = useCallback(async () => {
    if (!session) return;
    if (organizationUsers.length > 0) return;
    await loadOrganizationUsers(session, organizationId);
  }, [loadOrganizationUsers, organizationId, organizationUsers.length, session]);

  useEffect(() => {
    void loadProjectsForOrg();
    void ensureOrganizationUsers();
  }, [ensureOrganizationUsers, loadProjectsForOrg]);

  const createProjectRecord = useCallback(
    async (payload: {
      name: string;
      description?: string;
      h3Resolution?: number;
      city: string;
      centerLat: number;
      centerLng: number;
    }) => {
      if (!session || !assertCanEdit()) return null;
      return ctxCreateProject(session, organizationId, payload);
    },
    [assertCanEdit, ctxCreateProject, organizationId, session],
  );

  const updateProjectRecord = useCallback(
    async (
      projectId: UUID,
      payload: { name?: string; description?: string; h3Resolution?: number },
    ) => {
      if (!session || !assertCanEdit()) return null;
      return ctxUpdateProject(session, projectId, payload);
    },
    [assertCanEdit, ctxUpdateProject, session],
  );

  const deleteProjectRecord = useCallback(
    async (projectId: UUID) => {
      if (!session || !assertCanEdit()) return false;
      return ctxDeleteProject(session, projectId);
    },
    [assertCanEdit, ctxDeleteProject, session],
  );

  const loadProjectTeams = useCallback(
    async (projectId: UUID) => {
      if (!session) return;
      await ctxLoadProjectTeams(session, projectId);
    },
    [ctxLoadProjectTeams, session],
  );

  const loadProjectMembers = useCallback(
    async (projectId: UUID) => {
      if (!session) return;
      await ctxLoadProjectMembers(session, projectId);
    },
    [ctxLoadProjectMembers, session],
  );

  const createTeamRecord = useCallback(
    async (projectId: UUID, payload: { name: string; colorHex: string }) => {
      if (!session || !assertCanEdit()) return null;
      return ctxCreateTeam(session, projectId, payload);
    },
    [assertCanEdit, ctxCreateTeam, session],
  );

  const updateTeamRecord = useCallback(
    async (
      projectId: UUID,
      teamId: UUID,
      payload: { name?: string; colorHex?: string },
    ) => {
      if (!session || !assertCanEdit()) return null;
      return ctxUpdateTeam(session, projectId, teamId, payload);
    },
    [assertCanEdit, ctxUpdateTeam, session],
  );

  const deleteTeamRecord = useCallback(
    async (projectId: UUID, teamId: UUID) => {
      if (!session || !assertCanEdit()) return false;
      return ctxDeleteTeam(session, projectId, teamId);
    },
    [assertCanEdit, ctxDeleteTeam, session],
  );

  const saveTeamMembers = useCallback(
    async (projectId: UUID, teamId: UUID, userIds: UUID[]) => {
      if (!session || !assertCanEdit()) return null;
      return ctxSaveTeamMembers(session, projectId, teamId, userIds);
    },
    [assertCanEdit, ctxSaveTeamMembers, session],
  );

  const organizationUsersById = useMemo(() => {
    const map = new Map<UUID, OrganizationUser>();
    for (const user of organizationUsers) {
      map.set(user.user_id, user);
    }
    return map;
  }, [organizationUsers]);

  return {
    canEdit,
    projects,
    loadingProjects,
    projectError: combinedProjectError,
    teamError,
    savingProject,
    managingTeam,
    organizationUsers,
    organizationUsersById,
    loadProjects: loadProjectsForOrg,
    createProjectRecord,
    updateProjectRecord,
    deleteProjectRecord,
    loadProjectTeams,
    loadProjectMembers,
    getProjectTeams,
    getProjectMembers,
    createTeamRecord,
    updateTeamRecord,
    deleteTeamRecord,
    saveTeamMembers,
    setTeamError,
  };
}
