import Constants from "expo-constants";
import type { Session } from "@supabase/supabase-js";

import type {
  AdjustZoneRequest,
  AdjustZoneResponse,
  ApiErrorResponse,
  CreateZoneRequest,
  CreateZoneResponse,
  CreateMessageRequest,
  CreateMessageResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateProjectTeamRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  DeleteZoneResponse,
  DeleteProjectResponse,
  DeleteProjectTeamResponse,
  GenerateH3GridRequest,
  GenerateH3GridResponse,
  GeocodeResponse,
  GetMessagesResponse,
  GetProjectMapResponse,
  GetProjectTeamMembersResponse,
  GetProjectsResponse,
  GetOrganizationUsersResponse,
  GetOrganizationInviteCandidatesResponse,
  GetOrganizationsResponse,
  GetSessionUsersResponse,
  GetZonesResponse,
  GeoJSONPosition,
  GetUserSessionsResponse,
  MessageSession,
  ListProjectTeamsResponse,
  SetProjectTeamMembersRequest,
  SetProjectTeamMembersResponse,
  AssignProjectHexesRequest,
  AssignProjectHexesResponse,
  UnassignProjectHexesRequest,
  UnassignProjectHexesResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
  UpdateProjectTeamRequest,
  ProjectTeam,
  InviteOrganizationUserRequest,
  InviteOrganizationUserResponse,
  UpdateZoneRequest,
  UpdateZoneResponse,
  ZoneFeature,
} from "../types";

export interface ApiRequestError extends Error {
  status: number;
  body?: ApiErrorResponse | Record<string, unknown> | null;
}

function createApiRequestError(
  message: string,
  status: number,
  body: ApiErrorResponse | Record<string, unknown> | null,
): ApiRequestError {
  const error = new Error(message) as ApiRequestError;
  error.status = status;
  error.body = body;
  return error;
}

function getBackendApiBaseUrl(): string {
  const env = process.env as Record<string, string | undefined>;
  const extra = (Constants?.expoConfig?.extra ?? {}) as {
    BACKEND_API_URL?: string;
  };

  const baseUrl =
    env.EXPO_PUBLIC_BACKEND_API_URL ??
    extra.BACKEND_API_URL ??
    "http://localhost:3000";

  return baseUrl.replace(/\/+$/, "");
}

async function apiFetch<TResponse>(
  session: Session,
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  if (!session.access_token) {
    throw new Error("Missing access token");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJsonResponse = contentType.toLowerCase().includes("application/json");
  const body = isJsonResponse
    ? ((await response.json().catch(() => null)) as
        | TResponse
        | ApiErrorResponse
        | null)
    : null;

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : fallbackMessage;
    throw createApiRequestError(
      message,
      response.status,
      (body as ApiErrorResponse | Record<string, unknown> | null) ?? null,
    );
  }

  if (body === null) {
    throw new Error("Invalid server response");
  }

  return body as TResponse;
}

export async function fetchOrganizations(
  session: Session,
): Promise<GetOrganizationsResponse> {
  return apiFetch<GetOrganizationsResponse>(session, "/organization", {
    method: "GET",
  });
}

export async function createOrganization(
  session: Session,
  payload: CreateOrganizationRequest,
): Promise<CreateOrganizationResponse> {
  return apiFetch<CreateOrganizationResponse>(session, "/organization", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchOrganizationUsers(
  session: Session,
  organizationId: string,
): Promise<GetOrganizationUsersResponse> {
  return apiFetch<GetOrganizationUsersResponse>(
    session,
    `/organization/${encodeURIComponent(organizationId)}/users`,
    { method: "GET" },
  );
}

export async function fetchOrganizationInviteCandidates(
  session: Session,
  organizationId: string,
  search?: string,
): Promise<GetOrganizationInviteCandidatesResponse> {
  const searchQuery =
    search && search.trim().length > 0
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
  return apiFetch<GetOrganizationInviteCandidatesResponse>(
    session,
    `/organization/${encodeURIComponent(organizationId)}/invite-candidates${searchQuery}`,
    { method: "GET" },
  );
}

export async function inviteOrganizationUser(
  session: Session,
  organizationId: string,
  payload: InviteOrganizationUserRequest,
): Promise<InviteOrganizationUserResponse> {
  return apiFetch<InviteOrganizationUserResponse>(
    session,
    `/organization/${encodeURIComponent(organizationId)}/invite`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchProjects(
  session: Session,
  organizationId: string,
): Promise<GetProjectsResponse> {
  return apiFetch<GetProjectsResponse>(
    session,
    `/projects?organizationId=${encodeURIComponent(organizationId)}`,
    { method: "GET" },
  );
}

export async function createProject(
  session: Session,
  payload: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  return apiFetch<CreateProjectResponse>(session, "/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function geocodeCity(
  session: Session,
  query: string,
  options?: { signal?: AbortSignal },
): Promise<GeocodeResponse> {
  return apiFetch<GeocodeResponse>(
    session,
    `/projects/geocode?q=${encodeURIComponent(query)}`,
    { method: "GET", signal: options?.signal },
  );
}

export async function updateProject(
  session: Session,
  projectId: string,
  payload: UpdateProjectRequest,
): Promise<UpdateProjectResponse> {
  return apiFetch<UpdateProjectResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteProject(
  session: Session,
  projectId: string,
): Promise<DeleteProjectResponse> {
  return apiFetch<DeleteProjectResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE" },
  );
}

export async function fetchProjectTeams(
  session: Session,
  projectId: string,
): Promise<ListProjectTeamsResponse> {
  return apiFetch<ListProjectTeamsResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/teams`,
    { method: "GET" },
  );
}

export async function createProjectTeam(
  session: Session,
  projectId: string,
  payload: CreateProjectTeamRequest,
): Promise<ProjectTeam> {
  return apiFetch<ProjectTeam>(
    session,
    `/projects/${encodeURIComponent(projectId)}/teams`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateProjectTeam(
  session: Session,
  projectId: string,
  teamId: string,
  payload: UpdateProjectTeamRequest,
): Promise<ProjectTeam> {
  return apiFetch<ProjectTeam>(
    session,
    `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteProjectTeam(
  session: Session,
  projectId: string,
  teamId: string,
): Promise<DeleteProjectTeamResponse> {
  return apiFetch<DeleteProjectTeamResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}`,
    { method: "DELETE" },
  );
}

export async function fetchProjectTeamMembers(
  session: Session,
  projectId: string,
): Promise<GetProjectTeamMembersResponse> {
  return apiFetch<GetProjectTeamMembersResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/members`,
    { method: "GET" },
  );
}

export async function setProjectTeamMembers(
  session: Session,
  projectId: string,
  teamId: string,
  payload: SetProjectTeamMembersRequest,
): Promise<SetProjectTeamMembersResponse> {
  return apiFetch<SetProjectTeamMembersResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchProjectMap(
  session: Session,
  projectId: string,
): Promise<GetProjectMapResponse> {
  return apiFetch<GetProjectMapResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/map`,
    { method: "GET" },
  );
}

export async function assignProjectHexes(
  session: Session,
  projectId: string,
  payload: AssignProjectHexesRequest,
): Promise<AssignProjectHexesResponse> {
  return apiFetch<AssignProjectHexesResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/map/assign`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function unassignProjectHexes(
  session: Session,
  projectId: string,
  payload: UnassignProjectHexesRequest,
): Promise<UnassignProjectHexesResponse> {
  return apiFetch<UnassignProjectHexesResponse>(
    session,
    `/projects/${encodeURIComponent(projectId)}/map/unassign`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchUserSessions(
  session: Session,
): Promise<GetUserSessionsResponse> {
  return apiFetch<GetUserSessionsResponse>(session, "/sessions", {
    method: "GET",
  });
}

export async function ensureProjectChatSession(
  session: Session,
  projectId: string,
): Promise<MessageSession> {
  return apiFetch<MessageSession>(
    session,
    `/projects/${encodeURIComponent(projectId)}/chat`,
    { method: "GET" },
  );
}

export async function createSession(
  session: Session,
  payload: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  return apiFetch<CreateSessionResponse>(session, "/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSessionMessages(
  session: Session,
  sessionId: string,
): Promise<GetMessagesResponse> {
  return apiFetch<GetMessagesResponse>(
    session,
    `/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
    },
  );
}

export async function fetchSessionUsers(
  session: Session,
  sessionId: string,
): Promise<GetSessionUsersResponse> {
  return apiFetch<GetSessionUsersResponse>(
    session,
    `/sessions/${encodeURIComponent(sessionId)}/users`,
    { method: "GET" },
  );
}

export async function createMessage(
  session: Session,
  payload: CreateMessageRequest,
): Promise<CreateMessageResponse> {
  return apiFetch<CreateMessageResponse>(session, "/sessions/message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchZones(
  session: Session,
  organizationId: string,
): Promise<GetZonesResponse> {
  return apiFetch<GetZonesResponse>(
    session,
    `/zones?organizationId=${encodeURIComponent(organizationId)}`,
    { method: "GET" },
  );
}

export async function postZone(
  session: Session,
  organizationId: string,
  feature: ZoneFeature,
): Promise<CreateZoneResponse> {
  const payload: CreateZoneRequest = { organizationId, feature };
  return apiFetch<CreateZoneResponse>(session, "/zones", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adjustZone(
  session: Session,
  organizationId: string,
  newZone: ZoneFeature,
  overlappingZoneIds: string[],
): Promise<AdjustZoneResponse> {
  const payload: AdjustZoneRequest = {
    organizationId,
    newZone,
    overlappingZoneIds,
  };
  return apiFetch<AdjustZoneResponse>(session, "/zones/adjust", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteZone(
  session: Session,
  organizationId: string,
  zoneId: string,
): Promise<DeleteZoneResponse> {
  return apiFetch<DeleteZoneResponse>(
    session,
    `/zones/${encodeURIComponent(zoneId)}?organizationId=${encodeURIComponent(organizationId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateZone(
  session: Session,
  organizationId: string,
  zoneId: string,
  feature: ZoneFeature,
): Promise<UpdateZoneResponse> {
  const payload: UpdateZoneRequest = { organizationId, feature };
  return apiFetch<UpdateZoneResponse>(
    session,
    `/zones/${encodeURIComponent(zoneId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function generateH3Grid(
  session: Session,
  polygon: GeoJSONPosition[],
  resolution?: number,
): Promise<GenerateH3GridResponse> {
  const payload: GenerateH3GridRequest = { polygon, resolution };
  return apiFetch<GenerateH3GridResponse>(session, "/h3/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
