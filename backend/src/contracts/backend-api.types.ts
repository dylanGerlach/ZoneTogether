/**
 * Backend API contract types.
 *
 * This file is the source of truth for types consumed by the frontend.
 * Run `npm run generate:frontend-types` in the backend to regenerate
 * `frontend/src/types/generated/backend-api.types.ts`.
 */

export type UUID = string;
export type ISODateString = string;
export type MembershipRole = "owner" | "admin" | "member";

export interface ApiErrorResponse {
  error: string;
}

/**
 * GET /auth/test
 */
export interface AuthTestResponse {
  Success: string;
}

/**
 * POST /organization
 */
export interface CreateOrganizationRequest {
  name: string;
  description: string;
}

export interface CreateOrganizationResponse {
  id: UUID;
}

/**
 * POST /organization/member
 */
export interface JoinOrganizationRequest {
  organizationId: UUID;
  role?: MembershipRole;
}

export interface OrganizationMemberRecord {
  organization_id: UUID;
  user_id: UUID;
  role: MembershipRole;
}

export type JoinOrganizationResponse = OrganizationMemberRecord | null;

/**
 * GET /organization
 */
export interface OrganizationSummary {
  name: string;
  description: string | null;
}

export interface OrganizationMembership {
  organization_id: UUID;
  role: MembershipRole;
  organization: OrganizationSummary | null;
}

export interface GetOrganizationsResponse {
  organizations: OrganizationMembership[];
}

/**
 * GET /organization/:organizationId/users
 */
export interface OrganizationUser {
  user_id: UUID;
  role: MembershipRole;
  profile_id?: UUID;
  profile_full_name?: string;
}

export type GetOrganizationUsersResponse = OrganizationUser[];

/**
 * POST /sessions
 */
export interface CreateSessionRequest {
  organizationId: UUID;
  users: UUID[];
  title: string;
}

export interface MessageSession {
  id: UUID;
  organization_id: UUID;
  title: string;
  last_message_sent?: string | null;
  created_at?: ISODateString;
  updated_at?: ISODateString;
}

export type CreateSessionResponse = MessageSession;

/**
 * GET /sessions
 */
export interface MessageSessionUser {
  user_id: UUID;
  message_session: UUID | MessageSession | null;
  created_at?: ISODateString;
}

export type GetUserSessionsResponse = MessageSessionUser[];

/**
 * POST /sessions/message
 */
export interface CreateMessageRequest {
  sessionId: UUID;
  content: string;
}

export interface Message {
  id: UUID;
  message_session_id: UUID;
  user_id: UUID;
  message: string;
  timestamp: ISODateString;
  profile_id?: UUID;
  profile_full_name?: string;
  created_at?: ISODateString;
  updated_at?: ISODateString;
}

export type CreateMessageResponse = Message;

/**
 * GET /sessions/:sessionId
 */
export type GetMessagesResponse = Message[];
