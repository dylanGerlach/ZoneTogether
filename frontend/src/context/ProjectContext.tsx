import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthSession,
  Project,
  ProjectMapTeamSnapshot,
  ProjectTeam,
  ProjectTeamMember,
  UUID,
} from "../types";
import {
  assignProjectHexes,
  createProject,
  createProjectTeam,
  deleteProject,
  deleteProjectTeam,
  fetchProjectMap,
  fetchProjectTeamMembers,
  fetchProjectTeams,
  fetchProjects,
  setProjectTeamMembers,
  unassignProjectHexes,
  updateProject,
  updateProjectTeam,
} from "../utils/backendApi";

type ProjectsByOrg = Record<UUID, Project[]>;
type TeamsByProject = Record<UUID, ProjectTeam[]>;
type MembersByProject = Record<UUID, ProjectTeamMember[]>;
type MapByProject = Record<UUID, ProjectMapTeamSnapshot[]>;

type ProjectContextValue = {
  projectsByOrg: ProjectsByOrg;
  projectsLoadingByOrg: Record<UUID, boolean>;
  projectsErrorByOrg: Record<UUID, string | null>;
  teamsByProject: TeamsByProject;
  membersByProject: MembersByProject;
  mapTeamsByProject: MapByProject;
  projectRecordById: Record<UUID, Project>;
  mapLoadingByProject: Record<UUID, boolean>;
  mapErrorByProject: Record<UUID, string | null>;

  getProjectsForOrg: (organizationId: UUID) => Project[];
  getProjectTeams: (projectId: UUID) => ProjectTeam[];
  getProjectMembers: (projectId: UUID) => ProjectTeamMember[];
  getProjectMapTeams: (projectId: UUID) => ProjectMapTeamSnapshot[];
  getProject: (projectId: UUID) => Project | null;

  loadProjects: (session: AuthSession, organizationId: UUID) => Promise<Project[]>;
  createProjectRecord: (
    session: AuthSession,
    organizationId: UUID,
    payload: {
      name: string;
      description?: string;
      h3Resolution?: number;
      city: string;
      centerLat: number;
      centerLng: number;
    },
  ) => Promise<Project | null>;
  updateProjectRecord: (
    session: AuthSession,
    projectId: UUID,
    payload: { name?: string; description?: string; h3Resolution?: number },
  ) => Promise<Project | null>;
  deleteProjectRecord: (session: AuthSession, projectId: UUID) => Promise<boolean>;

  loadProjectTeams: (session: AuthSession, projectId: UUID) => Promise<ProjectTeam[]>;
  loadProjectMembers: (
    session: AuthSession,
    projectId: UUID,
  ) => Promise<ProjectTeamMember[]>;
  createTeamRecord: (
    session: AuthSession,
    projectId: UUID,
    payload: { name: string; colorHex: string },
  ) => Promise<ProjectTeam | null>;
  updateTeamRecord: (
    session: AuthSession,
    projectId: UUID,
    teamId: UUID,
    payload: { name?: string; colorHex?: string },
  ) => Promise<ProjectTeam | null>;
  deleteTeamRecord: (
    session: AuthSession,
    projectId: UUID,
    teamId: UUID,
  ) => Promise<boolean>;
  saveTeamMembers: (
    session: AuthSession,
    projectId: UUID,
    teamId: UUID,
    userIds: UUID[],
  ) => Promise<ProjectTeamMember[] | null>;

  loadProjectMap: (session: AuthSession, projectId: UUID) => Promise<{
    project: Project;
    teams: ProjectMapTeamSnapshot[];
  } | null>;
  assignHex: (
    session: AuthSession,
    projectId: UUID,
    teamId: UUID,
    cell: string,
  ) => Promise<boolean>;
  unassignHex: (
    session: AuthSession,
    projectId: UUID,
    cell: string,
  ) => Promise<boolean>;
  applyCellOptimistic: (
    projectId: UUID,
    cell: string,
    action: "assign" | "unassign",
    selectedTeamId: UUID,
  ) => void;

  projectError: string | null;
  teamError: string | null;
  savingProject: boolean;
  managingTeam: boolean;
  savingMap: boolean;
  setTeamError: (value: string | null) => void;
  setProjectError: (value: string | null) => void;

  invalidateOrganization: (organizationId: UUID) => void;
  invalidateProject: (projectId: UUID) => void;
  invalidateAll: () => void;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

function upsertTeamSnapshot(
  teams: ProjectMapTeamSnapshot[],
  team: ProjectTeam,
): ProjectMapTeamSnapshot[] {
  const index = teams.findIndex((snapshot) => snapshot.team.id === team.id);
  if (index === -1) {
    return [...teams, { team, memberCount: 0, h3Cells: [] }];
  }
  const copy = teams.slice();
  copy[index] = { ...copy[index], team };
  return copy;
}

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projectsByOrg, setProjectsByOrg] = useState<ProjectsByOrg>({});
  const [projectsLoadingByOrg, setProjectsLoadingByOrg] = useState<Record<UUID, boolean>>({});
  const [projectsErrorByOrg, setProjectsErrorByOrg] = useState<Record<UUID, string | null>>(
    {},
  );
  const [teamsByProject, setTeamsByProject] = useState<TeamsByProject>({});
  const [membersByProject, setMembersByProject] = useState<MembersByProject>({});
  const [mapTeamsByProject, setMapTeamsByProject] = useState<MapByProject>({});
  const [projectRecordById, setProjectRecordById] = useState<Record<UUID, Project>>({});
  const [mapLoadingByProject, setMapLoadingByProject] = useState<Record<UUID, boolean>>({});
  const [mapErrorByProject, setMapErrorByProject] = useState<Record<UUID, string | null>>({});

  const [projectError, setProjectError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [managingTeam, setManagingTeam] = useState(false);
  const [savingMap, setSavingMap] = useState(false);

  const rememberProject = useCallback((project: Project) => {
    setProjectRecordById((previous) => ({ ...previous, [project.id]: project }));
  }, []);

  const rememberProjects = useCallback((projects: Project[]) => {
    if (projects.length === 0) return;
    setProjectRecordById((previous) => {
      const next = { ...previous };
      for (const project of projects) {
        next[project.id] = project;
      }
      return next;
    });
  }, []);

  const loadProjects = useCallback(
    async (session: AuthSession, organizationId: UUID) => {
      setProjectsLoadingByOrg((previous) => ({ ...previous, [organizationId]: true }));
      setProjectsErrorByOrg((previous) => ({ ...previous, [organizationId]: null }));
      try {
        const response = await fetchProjects(session, organizationId);
        setProjectsByOrg((previous) => ({ ...previous, [organizationId]: response.projects }));
        rememberProjects(response.projects);
        return response.projects;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load projects.";
        setProjectsErrorByOrg((previous) => ({ ...previous, [organizationId]: message }));
        setProjectError(message);
        return [];
      } finally {
        setProjectsLoadingByOrg((previous) => ({ ...previous, [organizationId]: false }));
      }
    },
    [rememberProjects],
  );

  const createProjectRecord = useCallback(
    async (
      session: AuthSession,
      organizationId: UUID,
      payload: {
        name: string;
        description?: string;
        h3Resolution?: number;
        city: string;
        centerLat: number;
        centerLng: number;
      },
    ) => {
      setSavingProject(true);
      setProjectError(null);
      try {
        const created = await createProject(session, {
          organizationId,
          name: payload.name,
          ...(payload.description ? { description: payload.description } : {}),
          ...(payload.h3Resolution !== undefined
            ? { h3Resolution: payload.h3Resolution }
            : {}),
          city: payload.city,
          centerLat: payload.centerLat,
          centerLng: payload.centerLng,
        });
        setProjectsByOrg((previous) => ({
          ...previous,
          [organizationId]: [created, ...(previous[organizationId] ?? [])],
        }));
        rememberProject(created);
        return created;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create project.";
        setProjectError(message);
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [rememberProject],
  );

  const updateProjectRecord = useCallback(
    async (
      session: AuthSession,
      projectId: UUID,
      payload: { name?: string; description?: string; h3Resolution?: number },
    ) => {
      setSavingProject(true);
      try {
        const updated = await updateProject(session, projectId, payload);
        setProjectsByOrg((previous) => {
          const next: ProjectsByOrg = {};
          for (const [orgId, projects] of Object.entries(previous)) {
            next[orgId] = projects.map((project) =>
              project.id === projectId ? updated : project,
            );
          }
          return next;
        });
        rememberProject(updated);
        return updated;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update project.";
        setProjectError(message);
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [rememberProject],
  );

  const deleteProjectRecord = useCallback(
    async (session: AuthSession, projectId: UUID) => {
      setSavingProject(true);
      try {
        await deleteProject(session, projectId);
        setProjectsByOrg((previous) => {
          const next: ProjectsByOrg = {};
          for (const [orgId, projects] of Object.entries(previous)) {
            next[orgId] = projects.filter((project) => project.id !== projectId);
          }
          return next;
        });
        setProjectRecordById((previous) => {
          const { [projectId]: _removed, ...rest } = previous;
          return rest;
        });
        setTeamsByProject((previous) => {
          const { [projectId]: _removed, ...rest } = previous;
          return rest;
        });
        setMembersByProject((previous) => {
          const { [projectId]: _removed, ...rest } = previous;
          return rest;
        });
        setMapTeamsByProject((previous) => {
          const { [projectId]: _removed, ...rest } = previous;
          return rest;
        });
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete project.";
        setProjectError(message);
        return false;
      } finally {
        setSavingProject(false);
      }
    },
    [],
  );

  const loadProjectTeams = useCallback(
    async (session: AuthSession, projectId: UUID) => {
      try {
        const response = await fetchProjectTeams(session, projectId);
        setTeamsByProject((previous) => ({ ...previous, [projectId]: response.teams }));
        return response.teams;
      } catch (error) {
        setProjectError(
          error instanceof Error ? error.message : "Failed to load project teams.",
        );
        return [];
      }
    },
    [],
  );

  const loadProjectMembers = useCallback(
    async (session: AuthSession, projectId: UUID) => {
      try {
        const response = await fetchProjectTeamMembers(session, projectId);
        setMembersByProject((previous) => ({ ...previous, [projectId]: response.members }));
        return response.members;
      } catch (error) {
        setProjectError(
          error instanceof Error ? error.message : "Failed to load team members.",
        );
        return [];
      }
    },
    [],
  );

  const createTeamRecord = useCallback(
    async (
      session: AuthSession,
      projectId: UUID,
      payload: { name: string; colorHex: string },
    ) => {
      setManagingTeam(true);
      setTeamError(null);
      try {
        const team = await createProjectTeam(session, projectId, payload);
        setTeamsByProject((previous) => ({
          ...previous,
          [projectId]: [...(previous[projectId] ?? []), team],
        }));
        setMapTeamsByProject((previous) => ({
          ...previous,
          [projectId]: upsertTeamSnapshot(previous[projectId] ?? [], team),
        }));
        return team;
      } catch (error) {
        setTeamError(
          error instanceof Error ? error.message : "Unable to create team",
        );
        return null;
      } finally {
        setManagingTeam(false);
      }
    },
    [],
  );

  const updateTeamRecord = useCallback(
    async (
      session: AuthSession,
      projectId: UUID,
      teamId: UUID,
      payload: { name?: string; colorHex?: string },
    ) => {
      setManagingTeam(true);
      setTeamError(null);
      try {
        const team = await updateProjectTeam(session, projectId, teamId, payload);
        setTeamsByProject((previous) => ({
          ...previous,
          [projectId]: (previous[projectId] ?? []).map((candidate) =>
            candidate.id === teamId ? team : candidate,
          ),
        }));
        setMapTeamsByProject((previous) => ({
          ...previous,
          [projectId]: (previous[projectId] ?? []).map((snapshot) =>
            snapshot.team.id === teamId ? { ...snapshot, team } : snapshot,
          ),
        }));
        return team;
      } catch (error) {
        setTeamError(
          error instanceof Error ? error.message : "Unable to update team",
        );
        return null;
      } finally {
        setManagingTeam(false);
      }
    },
    [],
  );

  const deleteTeamRecord = useCallback(
    async (session: AuthSession, projectId: UUID, teamId: UUID) => {
      setManagingTeam(true);
      setTeamError(null);
      try {
        await deleteProjectTeam(session, projectId, teamId);
        setTeamsByProject((previous) => ({
          ...previous,
          [projectId]: (previous[projectId] ?? []).filter((team) => team.id !== teamId),
        }));
        setMembersByProject((previous) => ({
          ...previous,
          [projectId]: (previous[projectId] ?? []).filter(
            (member) => member.team_id !== teamId,
          ),
        }));
        setMapTeamsByProject((previous) => ({
          ...previous,
          [projectId]: (previous[projectId] ?? []).filter(
            (snapshot) => snapshot.team.id !== teamId,
          ),
        }));
        return true;
      } catch (error) {
        setTeamError(
          error instanceof Error ? error.message : "Unable to delete team",
        );
        return false;
      } finally {
        setManagingTeam(false);
      }
    },
    [],
  );

  const saveTeamMembers = useCallback(
    async (
      session: AuthSession,
      projectId: UUID,
      teamId: UUID,
      userIds: UUID[],
    ) => {
      setManagingTeam(true);
      setTeamError(null);
      try {
        const response = await setProjectTeamMembers(session, projectId, teamId, { userIds });
        setMembersByProject((previous) => ({
          ...previous,
          [projectId]: response.members,
        }));
        setMapTeamsByProject((previous) => {
          const snapshots = previous[projectId];
          if (!snapshots) return previous;
          const countByTeam = new Map<UUID, number>();
          for (const member of response.members) {
            countByTeam.set(member.team_id, (countByTeam.get(member.team_id) ?? 0) + 1);
          }
          return {
            ...previous,
            [projectId]: snapshots.map((snapshot) => ({
              ...snapshot,
              memberCount: countByTeam.get(snapshot.team.id) ?? 0,
            })),
          };
        });
        return response.members;
      } catch (error) {
        setTeamError(
          error instanceof Error ? error.message : "Unable to save team members",
        );
        return null;
      } finally {
        setManagingTeam(false);
      }
    },
    [],
  );

  const loadProjectMap = useCallback(
    async (session: AuthSession, projectId: UUID) => {
      setMapLoadingByProject((previous) => ({ ...previous, [projectId]: true }));
      setMapErrorByProject((previous) => ({ ...previous, [projectId]: null }));
      try {
        const response = await fetchProjectMap(session, projectId);
        setMapTeamsByProject((previous) => ({ ...previous, [projectId]: response.teams }));
        rememberProject(response.project);
        setTeamsByProject((previous) => ({
          ...previous,
          [projectId]: response.teams.map((snapshot) => snapshot.team),
        }));
        return { project: response.project, teams: response.teams };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load project map.";
        setMapErrorByProject((previous) => ({ ...previous, [projectId]: message }));
        return null;
      } finally {
        setMapLoadingByProject((previous) => ({ ...previous, [projectId]: false }));
      }
    },
    [rememberProject],
  );

  const applyCellOptimistic = useCallback(
    (projectId: UUID, cell: string, action: "assign" | "unassign", selectedTeamId: UUID) => {
      setMapTeamsByProject((previous) => {
        const snapshots = previous[projectId];
        if (!snapshots) return previous;
        const next = snapshots.map((snapshot) => {
          const hasCell = snapshot.h3Cells.includes(cell);
          if (action === "unassign" && snapshot.team.id === selectedTeamId) {
            return {
              ...snapshot,
              h3Cells: snapshot.h3Cells.filter((candidate) => candidate !== cell),
            };
          }
          if (action === "assign" && snapshot.team.id === selectedTeamId) {
            if (hasCell) return snapshot;
            return { ...snapshot, h3Cells: [...snapshot.h3Cells, cell] };
          }
          if (action === "assign" && hasCell) {
            return {
              ...snapshot,
              h3Cells: snapshot.h3Cells.filter((candidate) => candidate !== cell),
            };
          }
          return snapshot;
        });
        return { ...previous, [projectId]: next };
      });
    },
    [],
  );

  const assignHex = useCallback(
    async (session: AuthSession, projectId: UUID, teamId: UUID, cell: string) => {
      setSavingMap(true);
      setMapErrorByProject((previous) => ({ ...previous, [projectId]: null }));
      try {
        await assignProjectHexes(session, projectId, { teamId, h3Cells: [cell] });
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save map edit.";
        setMapErrorByProject((previous) => ({ ...previous, [projectId]: message }));
        return false;
      } finally {
        setSavingMap(false);
      }
    },
    [],
  );

  const unassignHex = useCallback(
    async (session: AuthSession, projectId: UUID, cell: string) => {
      setSavingMap(true);
      setMapErrorByProject((previous) => ({ ...previous, [projectId]: null }));
      try {
        await unassignProjectHexes(session, projectId, { h3Cells: [cell] });
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save map edit.";
        setMapErrorByProject((previous) => ({ ...previous, [projectId]: message }));
        return false;
      } finally {
        setSavingMap(false);
      }
    },
    [],
  );

  const getProjectsForOrg = useCallback(
    (organizationId: UUID) => projectsByOrg[organizationId] ?? [],
    [projectsByOrg],
  );
  const getProjectTeams = useCallback(
    (projectId: UUID) => teamsByProject[projectId] ?? [],
    [teamsByProject],
  );
  const getProjectMembers = useCallback(
    (projectId: UUID) => membersByProject[projectId] ?? [],
    [membersByProject],
  );
  const getProjectMapTeams = useCallback(
    (projectId: UUID) => mapTeamsByProject[projectId] ?? [],
    [mapTeamsByProject],
  );
  const getProject = useCallback(
    (projectId: UUID) => projectRecordById[projectId] ?? null,
    [projectRecordById],
  );

  const invalidateOrganization = useCallback((organizationId: UUID) => {
    setProjectsByOrg((previous) => {
      const { [organizationId]: _removed, ...rest } = previous;
      return rest;
    });
    setProjectsErrorByOrg((previous) => ({ ...previous, [organizationId]: null }));
  }, []);

  const invalidateProject = useCallback((projectId: UUID) => {
    setTeamsByProject((previous) => {
      const { [projectId]: _removed, ...rest } = previous;
      return rest;
    });
    setMembersByProject((previous) => {
      const { [projectId]: _removed, ...rest } = previous;
      return rest;
    });
    setMapTeamsByProject((previous) => {
      const { [projectId]: _removed, ...rest } = previous;
      return rest;
    });
    setMapErrorByProject((previous) => ({ ...previous, [projectId]: null }));
  }, []);

  const invalidateAll = useCallback(() => {
    setProjectsByOrg({});
    setProjectsLoadingByOrg({});
    setProjectsErrorByOrg({});
    setTeamsByProject({});
    setMembersByProject({});
    setMapTeamsByProject({});
    setProjectRecordById({});
    setMapLoadingByProject({});
    setMapErrorByProject({});
    setProjectError(null);
    setTeamError(null);
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projectsByOrg,
      projectsLoadingByOrg,
      projectsErrorByOrg,
      teamsByProject,
      membersByProject,
      mapTeamsByProject,
      projectRecordById,
      mapLoadingByProject,
      mapErrorByProject,
      getProjectsForOrg,
      getProjectTeams,
      getProjectMembers,
      getProjectMapTeams,
      getProject,
      loadProjects,
      createProjectRecord,
      updateProjectRecord,
      deleteProjectRecord,
      loadProjectTeams,
      loadProjectMembers,
      createTeamRecord,
      updateTeamRecord,
      deleteTeamRecord,
      saveTeamMembers,
      loadProjectMap,
      assignHex,
      unassignHex,
      applyCellOptimistic,
      projectError,
      teamError,
      savingProject,
      managingTeam,
      savingMap,
      setTeamError,
      setProjectError,
      invalidateOrganization,
      invalidateProject,
      invalidateAll,
    }),
    [
      projectsByOrg,
      projectsLoadingByOrg,
      projectsErrorByOrg,
      teamsByProject,
      membersByProject,
      mapTeamsByProject,
      projectRecordById,
      mapLoadingByProject,
      mapErrorByProject,
      getProjectsForOrg,
      getProjectTeams,
      getProjectMembers,
      getProjectMapTeams,
      getProject,
      loadProjects,
      createProjectRecord,
      updateProjectRecord,
      deleteProjectRecord,
      loadProjectTeams,
      loadProjectMembers,
      createTeamRecord,
      updateTeamRecord,
      deleteTeamRecord,
      saveTeamMembers,
      loadProjectMap,
      assignHex,
      unassignHex,
      applyCellOptimistic,
      projectError,
      teamError,
      savingProject,
      managingTeam,
      savingMap,
      invalidateOrganization,
      invalidateProject,
      invalidateAll,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
