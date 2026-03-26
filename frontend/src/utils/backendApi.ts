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
  CreateSessionRequest,
  CreateSessionResponse,
  DeleteZoneResponse,
  GenerateH3GridRequest,
  GenerateH3GridResponse,
  GetMessagesResponse,
  GetOrganizationUsersResponse,
  GetOrganizationsResponse,
  GetZonesResponse,
  GeoJSONPosition,
  GetUserSessionsResponse,
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
  const extra = (Constants?.expoConfig?.extra ?? {}) as {
    BACKEND_API_URL?: string;
  };

  const baseUrl =
    process.env.EXPO_PUBLIC_BACKEND_API_URL ??
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

export async function fetchUserSessions(
  session: Session,
): Promise<GetUserSessionsResponse> {
  return apiFetch<GetUserSessionsResponse>(session, "/sessions", {
    method: "GET",
  });
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
