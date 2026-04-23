import type { Request, Response } from "express";

import type {
  ApiErrorResponse,
  AssignProjectHexesRequest,
  AssignProjectHexesResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateProjectTeamRequest,
  DeleteProjectResponse,
  DeleteProjectTeamResponse,
  GeocodeResponse,
  GetProjectMapResponse,
  GetProjectTeamMembersResponse,
  GetProjectsResponse,
  ListProjectTeamsResponse,
  MembershipRole,
  MessageSession,
  Project,
  ProjectTeam,
  SetProjectTeamMembersRequest,
  SetProjectTeamMembersResponse,
  UnassignProjectHexesRequest,
  UnassignProjectHexesResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
  UpdateProjectTeamRequest,
  UUID,
} from "../../contracts/backend-api.types.js";
import { ProjectsService } from "../../db/projects.db.js";
import { MessagingDB } from "../../db/messaging.db.js";

type ConflictErrorResponse = ApiErrorResponse & {
  code: "unique_conflict";
};

type ProjectsServiceLike = {
  isConstraintConflict: (error: { code?: string } | null) => boolean;
  getOrganizationRole: (organizationId: UUID, userId: UUID) => Promise<MembershipRole | null>;
  createProject: (args: {
    organizationId: UUID;
    name: string;
    description?: string;
    h3Resolution: number;
    city: string;
    centerLat: number;
    centerLng: number;
    createdBy: UUID;
  }) => Promise<CreateProjectResponse>;
  listProjects: (organizationId: UUID) => Promise<GetProjectsResponse>;
  getProject: (projectId: UUID) => Promise<Project | null>;
  updateProject: (projectId: UUID, payload: UpdateProjectRequest) => Promise<UpdateProjectResponse | null>;
  deleteProject: (projectId: UUID) => Promise<boolean>;
  listTeams: (projectId: UUID) => Promise<ListProjectTeamsResponse>;
  getTeam: (projectId: UUID, teamId: UUID) => Promise<ProjectTeam | null>;
  createTeam: (projectId: UUID, name: string, colorHex: string) => Promise<ProjectTeam>;
  updateTeam: (
    projectId: UUID,
    teamId: UUID,
    payload: UpdateProjectTeamRequest,
  ) => Promise<ProjectTeam | null>;
  deleteTeam: (projectId: UUID, teamId: UUID) => Promise<boolean>;
  setTeamMembers: (args: {
    project: Project;
    teamId: UUID;
    payload: SetProjectTeamMembersRequest;
    assignedBy: UUID;
  }) => Promise<GetProjectTeamMembersResponse>;
  listProjectMembers: (projectId: UUID) => Promise<GetProjectTeamMembersResponse>;
  getProjectMap: (project: Project) => Promise<GetProjectMapResponse>;
  assignHexes: (args: {
    project: Project;
    teamId: UUID;
    h3Cells: string[];
    assignedBy: UUID;
  }) => Promise<number>;
  unassignHexes: (projectId: UUID, h3Cells: string[]) => Promise<number>;
  listDistinctProjectUserIds: (projectId: UUID) => Promise<UUID[]>;
};

type MessagingServiceLike = {
  createProjectSession: (
    projectId: UUID,
    organizationId: UUID,
    title: string,
  ) => Promise<MessageSession | null>;
  getProjectSession: (projectId: UUID) => Promise<MessageSession | null>;
  syncSessionMembers: (
    sessionId: UUID,
    userIds: UUID[],
  ) => Promise<{ added: UUID[]; removed: UUID[] }>;
  updateSessionTitle: (sessionId: UUID, title: string) => Promise<MessageSession | null>;
  createSystemMessage: (
    sessionId: UUID,
    userId: UUID,
    kind: "system_join" | "system_leave",
  ) => Promise<unknown>;
};

let createProjectsService: (token: string) => ProjectsServiceLike = (token) =>
  new ProjectsService(token);

let createMessagingService: (token: string) => MessagingServiceLike = (token) =>
  new MessagingDB(token) as MessagingServiceLike;

export function __setProjectsServiceFactoryForTests(
  factory: ((token: string) => ProjectsServiceLike) | null,
) {
  createProjectsService = factory ?? ((token) => new ProjectsService(token));
}

export function __setMessagingServiceFactoryForTests(
  factory: ((token: string) => MessagingServiceLike) | null,
) {
  createMessagingService =
    factory ?? ((token) => new MessagingDB(token) as MessagingServiceLike);
}

async function emitMembershipSystemMessages(args: {
  messagingService: MessagingServiceLike;
  sessionId: UUID;
  diff: { added: UUID[]; removed: UUID[] };
}): Promise<void> {
  for (const userId of args.diff.added) {
    try {
      await args.messagingService.createSystemMessage(
        args.sessionId,
        userId,
        "system_join",
      );
    } catch (error) {
      console.error("Failed to emit system_join message", error);
    }
  }
  for (const userId of args.diff.removed) {
    try {
      await args.messagingService.createSystemMessage(
        args.sessionId,
        userId,
        "system_leave",
      );
    } catch (error) {
      console.error("Failed to emit system_leave message", error);
    }
  }
}

async function syncProjectSessionMembership(args: {
  projectsService: ProjectsServiceLike;
  messagingService: MessagingServiceLike;
  project: Project;
}): Promise<void> {
  const session = await args.messagingService.getProjectSession(args.project.id);
  if (!session) return;
  const teamUserIds = await args.projectsService.listDistinctProjectUserIds(
    args.project.id,
  );
  const userIds = Array.from(
    new Set<UUID>([...teamUserIds, args.project.created_by]),
  );
  const diff = await args.messagingService.syncSessionMembers(session.id, userIds);
  await emitMembershipSystemMessages({
    messagingService: args.messagingService,
    sessionId: session.id,
    diff,
  });
}

function getAuthContext(req: Request): { token: string; userId: UUID } | null {
  if (!req.token || !req.user?.id) return null;
  return { token: req.token, userId: req.user.id as UUID };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

const PROJECT_RESOLUTION_MIN = 8;
const PROJECT_RESOLUTION_MAX = 10;

function isValidResolution(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= PROJECT_RESOLUTION_MIN &&
    (value as number) <= PROJECT_RESOLUTION_MAX
  );
}

function isValidColorHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function parseOrganizationId(req: Request): UUID | null {
  const organizationId = req.query.organizationId;
  if (!isNonEmptyString(organizationId)) return null;
  return organizationId as UUID;
}

function handleServerError(
  service: ProjectsServiceLike,
  error: unknown,
  res: Response<ApiErrorResponse | ConflictErrorResponse>,
  fallbackMessage: string,
) {
  if (service.isConstraintConflict(error as { code?: string } | null)) {
    return res.status(409).json({
      error: "A record with the same unique value already exists",
      code: "unique_conflict",
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
}

function isAdminRole(role: MembershipRole | null): boolean {
  return role === "owner" || role === "admin";
}

function sendForbidden(res: Response<ApiErrorResponse>) {
  return res.status(403).json({ error: "Forbidden" });
}

async function requireOrganizationMemberOrAdmin(args: {
  service: ProjectsServiceLike;
  userId: UUID;
  organizationId: UUID;
  requireAdmin: boolean;
  res: Response<ApiErrorResponse>;
}): Promise<boolean> {
  const role = await args.service.getOrganizationRole(args.organizationId, args.userId);
  if (!role) {
    sendForbidden(args.res);
    return false;
  }
  if (args.requireAdmin && !isAdminRole(role)) {
    sendForbidden(args.res);
    return false;
  }
  return true;
}

async function requireProjectAccess(args: {
  service: ProjectsServiceLike;
  userId: UUID;
  projectId: UUID;
  requireAdmin: boolean;
  res: Response<ApiErrorResponse>;
}): Promise<Project | null> {
  const project = await args.service.getProject(args.projectId);
  if (!project) {
    args.res.status(404).json({ error: "Project not found" });
    return null;
  }

  const role = await args.service.getOrganizationRole(project.organization_id, args.userId);
  if (!role) {
    sendForbidden(args.res);
    return null;
  }
  if (args.requireAdmin && !isAdminRole(role)) {
    sendForbidden(args.res);
    return null;
  }
  return project;
}

export async function createProject(
  req: Request<{}, CreateProjectResponse | ApiErrorResponse | ConflictErrorResponse, CreateProjectRequest>,
  res: Response<CreateProjectResponse | ApiErrorResponse | ConflictErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { organizationId, name, description, h3Resolution, city, centerLat, centerLng } =
    req.body ?? {};
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!isOptionalString(description)) {
    return res.status(400).json({ error: "description must be a string when provided" });
  }
  if (h3Resolution !== undefined && !isValidResolution(h3Resolution)) {
    return res.status(400).json({ error: "h3Resolution must be an integer between 8 and 10" });
  }
  if (!isNonEmptyString(city)) {
    return res.status(400).json({ error: "city is required" });
  }
  if (!isValidLatitude(centerLat)) {
    return res.status(400).json({ error: "centerLat must be a number between -90 and 90" });
  }
  if (!isValidLongitude(centerLng)) {
    return res.status(400).json({ error: "centerLng must be a number between -180 and 180" });
  }

  const service = createProjectsService(auth.token);
  try {
    const allowed = await requireOrganizationMemberOrAdmin({
      service,
      userId: auth.userId,
      organizationId: organizationId as UUID,
      requireAdmin: true,
      res,
    });
    if (!allowed) return;

    const project = await service.createProject({
      organizationId: organizationId as UUID,
      name: name.trim(),
      ...(description !== undefined ? { description: description.trim() } : {}),
      h3Resolution: h3Resolution ?? PROJECT_RESOLUTION_MIN,
      city: city.trim(),
      centerLat,
      centerLng,
      createdBy: auth.userId,
    });

    try {
      const messaging = createMessagingService(auth.token);
      const existing = await messaging.getProjectSession(project.id);
      const session =
        existing ??
        (await messaging.createProjectSession(
          project.id,
          project.organization_id,
          `${project.name} - Team Chat`,
        ));
      if (session) {
        const diff = await messaging.syncSessionMembers(session.id, [
          project.created_by,
        ]);
        await emitMembershipSystemMessages({
          messagingService: messaging,
          sessionId: session.id,
          diff,
        });
      }
    } catch (sessionError) {
      console.error("Failed to provision project chat session", sessionError);
    }

    return res.status(200).json(project);
  } catch (error) {
    return handleServerError(service, error, res, "Failed to create project");
  }
}

export async function ensureProjectChat(
  req: Request<{ projectId: UUID }, MessageSession | ApiErrorResponse>,
  res: Response<MessageSession | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: false,
      res,
    });
    if (!project) return;

    const messaging = createMessagingService(auth.token);
    let session = await messaging.getProjectSession(project.id);
    if (!session) {
      session = await messaging.createProjectSession(
        project.id,
        project.organization_id,
        `${project.name} - Team Chat`,
      );
    }
    if (!session) {
      return res.status(500).json({ error: "Failed to provision project chat" });
    }

    try {
      await syncProjectSessionMembership({
        projectsService: service,
        messagingService: messaging,
        project,
      });
    } catch (syncError) {
      console.error("Failed to sync project chat members on ensure", syncError);
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error("Failed to ensure project chat", error);
    return res.status(500).json({ error: "Failed to ensure project chat" });
  }
}

export async function listProjects(
  req: Request<{}, GetProjectsResponse | ApiErrorResponse, unknown, { organizationId?: UUID }>,
  res: Response<GetProjectsResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const organizationId = parseOrganizationId(req);
  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const allowed = await requireOrganizationMemberOrAdmin({
      service,
      userId: auth.userId,
      organizationId,
      requireAdmin: false,
      res,
    });
    if (!allowed) return;

    const response = await service.listProjects(organizationId);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to list projects", error);
    return res.status(500).json({ error: "Failed to list projects" });
  }
}

export async function getProjectMap(
  req: Request<{ projectId: UUID }, GetProjectMapResponse | ApiErrorResponse>,
  res: Response<GetProjectMapResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: false,
      res,
    });
    if (!project) return;

    const response = await service.getProjectMap(project);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to get project map", error);
    return res.status(500).json({ error: "Failed to get project map" });
  }
}

export async function updateProject(
  req: Request<{ projectId: UUID }, UpdateProjectResponse | ApiErrorResponse | ConflictErrorResponse, UpdateProjectRequest>,
  res: Response<UpdateProjectResponse | ApiErrorResponse | ConflictErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const { name, description, h3Resolution } = req.body ?? {};
  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: "name must be a non-empty string" });
  }
  if (!isOptionalString(description)) {
    return res.status(400).json({ error: "description must be a string when provided" });
  }
  if (h3Resolution !== undefined && !isValidResolution(h3Resolution)) {
    return res.status(400).json({ error: "h3Resolution must be an integer between 8 and 10" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;

    const updated = await service.updateProject(projectId, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(h3Resolution !== undefined ? { h3Resolution } : {}),
    });
    if (!updated) return res.status(404).json({ error: "Project not found" });

    if (name !== undefined && updated.name !== project.name) {
      try {
        const messaging = createMessagingService(auth.token);
        const session = await messaging.getProjectSession(updated.id);
        if (session) {
          await messaging.updateSessionTitle(
            session.id,
            `${updated.name} - Team Chat`,
          );
        }
      } catch (sessionError) {
        console.error("Failed to rename project chat session", sessionError);
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    return handleServerError(service, error, res, "Failed to update project");
  }
}

export async function deleteProject(
  req: Request<{ projectId: UUID }, DeleteProjectResponse | ApiErrorResponse>,
  res: Response<DeleteProjectResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;

    const deleted = await service.deleteProject(projectId);
    if (!deleted) return res.status(404).json({ error: "Project not found" });
    return res.status(200).json({ ok: true, id: projectId });
  } catch (error) {
    console.error("Failed to delete project", error);
    return res.status(500).json({ error: "Failed to delete project" });
  }
}

export async function listProjectTeams(
  req: Request<{ projectId: UUID }, ListProjectTeamsResponse | ApiErrorResponse>,
  res: Response<ListProjectTeamsResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: false,
      res,
    });
    if (!project) return;

    const response = await service.listTeams(projectId);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to list project teams", error);
    return res.status(500).json({ error: "Failed to list project teams" });
  }
}

export async function createProjectTeam(
  req: Request<{ projectId: UUID }, ProjectTeam | ApiErrorResponse | ConflictErrorResponse, CreateProjectTeamRequest>,
  res: Response<ProjectTeam | ApiErrorResponse | ConflictErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const projectId = req.params.projectId;
  const { name, colorHex } = req.body ?? {};
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!isNonEmptyString(colorHex) || !isValidColorHex(colorHex)) {
    return res.status(400).json({ error: "colorHex must be a valid #RRGGBB color" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;

    const team = await service.createTeam(projectId, name.trim(), colorHex.trim());
    return res.status(200).json(team);
  } catch (error) {
    return handleServerError(service, error, res, "Failed to create project team");
  }
}

export async function updateProjectTeam(
  req: Request<{ projectId: UUID; teamId: UUID }, ProjectTeam | ApiErrorResponse | ConflictErrorResponse, UpdateProjectTeamRequest>,
  res: Response<ProjectTeam | ApiErrorResponse | ConflictErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const { projectId, teamId } = req.params;
  const { name, colorHex } = req.body ?? {};
  if (!isNonEmptyString(projectId) || !isNonEmptyString(teamId)) {
    return res.status(400).json({ error: "projectId and teamId are required" });
  }
  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: "name must be a non-empty string when provided" });
  }
  if (colorHex !== undefined && (!isNonEmptyString(colorHex) || !isValidColorHex(colorHex))) {
    return res.status(400).json({ error: "colorHex must be a valid #RRGGBB color when provided" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;

    const updated = await service.updateTeam(projectId, teamId, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(colorHex !== undefined ? { colorHex: colorHex.trim() } : {}),
    });
    if (!updated) return res.status(404).json({ error: "Team not found" });
    return res.status(200).json(updated);
  } catch (error) {
    return handleServerError(service, error, res, "Failed to update project team");
  }
}

export async function deleteProjectTeam(
  req: Request<{ projectId: UUID; teamId: UUID }, DeleteProjectTeamResponse | ApiErrorResponse>,
  res: Response<DeleteProjectTeamResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const { projectId, teamId } = req.params;
  if (!isNonEmptyString(projectId) || !isNonEmptyString(teamId)) {
    return res.status(400).json({ error: "projectId and teamId are required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;

    const deleted = await service.deleteTeam(projectId, teamId);
    if (!deleted) return res.status(404).json({ error: "Team not found" });

    try {
      await syncProjectSessionMembership({
        projectsService: service,
        messagingService: createMessagingService(auth.token),
        project,
      });
    } catch (sessionError) {
      console.error(
        "Failed to sync project chat members after team delete",
        sessionError,
      );
    }

    return res.status(200).json({ ok: true, id: teamId });
  } catch (error) {
    console.error("Failed to delete project team", error);
    return res.status(500).json({ error: "Failed to delete project team" });
  }
}

export async function setProjectTeamMembers(
  req: Request<{ projectId: UUID; teamId: UUID }, SetProjectTeamMembersResponse | ApiErrorResponse, SetProjectTeamMembersRequest>,
  res: Response<SetProjectTeamMembersResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const { projectId, teamId } = req.params;
  if (!isNonEmptyString(projectId) || !isNonEmptyString(teamId)) {
    return res.status(400).json({ error: "projectId and teamId are required" });
  }

  const userIds = req.body?.userIds;
  if (!Array.isArray(userIds) || !userIds.every(isNonEmptyString)) {
    return res.status(400).json({ error: "userIds must be an array of UUID strings" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;
    const team = await service.getTeam(projectId, teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const response = await service.setTeamMembers({
      project,
      teamId,
      payload: { userIds: userIds.map((id) => id.trim()) },
      assignedBy: auth.userId,
    });

    try {
      await syncProjectSessionMembership({
        projectsService: service,
        messagingService: createMessagingService(auth.token),
        project,
      });
    } catch (sessionError) {
      console.error(
        "Failed to sync project chat members after setTeamMembers",
        sessionError,
      );
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to set project team members", error);
    return res.status(500).json({ error: "Failed to set project team members" });
  }
}

export async function getProjectTeamMembers(
  req: Request<{ projectId: UUID }, GetProjectTeamMembersResponse | ApiErrorResponse>,
  res: Response<GetProjectTeamMembersResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: false,
      res,
    });
    if (!project) return;

    const response = await service.listProjectMembers(projectId);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to get project team members", error);
    return res.status(500).json({ error: "Failed to get project team members" });
  }
}

export async function assignProjectHexes(
  req: Request<{ projectId: UUID }, AssignProjectHexesResponse | ApiErrorResponse, AssignProjectHexesRequest>,
  res: Response<AssignProjectHexesResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const { teamId, h3Cells } = req.body ?? {};
  if (!isNonEmptyString(teamId)) {
    return res.status(400).json({ error: "teamId is required" });
  }
  if (!Array.isArray(h3Cells) || !h3Cells.every(isNonEmptyString)) {
    return res.status(400).json({ error: "h3Cells must be an array of strings" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;
    const team = await service.getTeam(projectId, teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const assignedCount = await service.assignHexes({
      project,
      teamId,
      h3Cells: h3Cells.map((cell) => cell.trim()),
      assignedBy: auth.userId,
    });
    return res.status(200).json({ ok: true, assignedCount });
  } catch (error) {
    console.error("Failed to assign project hexes", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to assign project hexes";
    return res.status(400).json({ error: errorMessage });
  }
}

export async function unassignProjectHexes(
  req: Request<{ projectId: UUID }, UnassignProjectHexesResponse | ApiErrorResponse, UnassignProjectHexesRequest>,
  res: Response<UnassignProjectHexesResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  const projectId = req.params.projectId;
  if (!isNonEmptyString(projectId)) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const { h3Cells } = req.body ?? {};
  if (!Array.isArray(h3Cells) || !h3Cells.every(isNonEmptyString)) {
    return res.status(400).json({ error: "h3Cells must be an array of strings" });
  }

  const service = createProjectsService(auth.token);
  try {
    const project = await requireProjectAccess({
      service,
      userId: auth.userId,
      projectId,
      requireAdmin: true,
      res,
    });
    if (!project) return;

    const unassignedCount = await service.unassignHexes(projectId, h3Cells.map((cell) => cell.trim()));
    return res.status(200).json({ ok: true, unassignedCount });
  } catch (error) {
    console.error("Failed to unassign project hexes", error);
    return res.status(500).json({ error: "Failed to unassign project hexes" });
  }
}

// Nominatim (OpenStreetMap) has a usage policy that requires a descriptive User-Agent
// identifying the application and a contact. This is configurable via env so deployers
// can set their own contact without changing code.
const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ?? "zonetogether/1.0 (https://github.com/zonetogether)";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_TIMEOUT_MS = 5000;

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    state?: string;
    country?: string;
  };
};

export async function geocodeCity(
  req: Request<{}, GeocodeResponse | ApiErrorResponse, unknown, { q?: string }>,
  res: Response<GeocodeResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const rawQuery = req.query.q;
  if (!isNonEmptyString(rawQuery) || rawQuery.trim().length < 2) {
    return res.status(400).json({ error: "q must be at least 2 characters" });
  }
  const query = rawQuery.trim();

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  // Bias the search toward populated places so users typing "Berlin" don't get random streets first.
  url.searchParams.set("featuretype", "city");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Nominatim upstream error", response.status, await response.text().catch(() => ""));
      return res.status(502).json({ error: "Geocoding service unavailable" });
    }

    const results = (await response.json()) as NominatimResult[];
    const mapped: GeocodeResponse = results
      .map((result) => {
        const lat = result.lat ? Number(result.lat) : NaN;
        const lng = result.lon ? Number(result.lon) : NaN;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const cityName =
          result.address?.city ??
          result.address?.town ??
          result.address?.village ??
          result.address?.municipality ??
          result.address?.hamlet ??
          result.name ??
          (result.display_name ? result.display_name.split(",")[0]?.trim() : undefined) ??
          "";
        const label = result.display_name ?? cityName;
        if (!cityName || !label) return null;
        return { label, city: cityName, lat, lng } as const;
      })
      .filter((value): value is { label: string; city: string; lat: number; lng: number } => value !== null);

    return res.status(200).json(mapped);
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return res.status(504).json({ error: "Geocoding service timed out" });
    }
    console.error("Failed to geocode city", error);
    return res.status(502).json({ error: "Geocoding service unavailable" });
  } finally {
    clearTimeout(timeout);
  }
}
