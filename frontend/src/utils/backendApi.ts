import Constants from "expo-constants";
import type { Session } from "@supabase/supabase-js";

import type {
  ApiErrorResponse,
  CreateMessageRequest,
  CreateMessageResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  GetMessagesResponse,
  GetOrganizationUsersResponse,
  GetOrganizationsResponse,
  GetUserSessionsResponse,
} from "../types";

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
    throw new Error(message);
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
