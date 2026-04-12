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
export type GeoJSONPosition = [number, number];

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

export interface OrganizationInvite {
  id: UUID;
  organization_id: UUID;
  email: string;
  inviter: UUID;
  role: MembershipRole;
  created_at?: ISODateString;
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

/**
 * Zones GeoJSON models
 */
export interface ZonePolygonGeometry {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
}

export interface ZoneMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: GeoJSONPosition[][][];
}

export type ZoneGeometry = ZonePolygonGeometry | ZoneMultiPolygonGeometry;

export interface ZoneFeatureProperties {
  name?: string;
  created_at?: ISODateString;
  adjusted?: boolean;
  originalZoneId?: string;
  note?: string;
  [key: string]: unknown;
}

export interface ZoneFeature {
  type: "Feature";
  id?: UUID | string;
  properties: ZoneFeatureProperties;
  geometry: ZoneGeometry;
}

export interface ZoneFeatureCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

/**
 * GET /zones?organizationId=:organizationId
 */
export type GetZonesResponse = ZoneFeatureCollection;

/**
 * POST /zones
 */
export interface CreateZoneRequest {
  organizationId: UUID;
  feature: ZoneFeature;
}

export interface CreateZoneResponse {
  ok: true;
  id: string;
}

export interface ZoneNameTakenResponse {
  error: "zone_name_taken";
  existingZoneId: string;
  existingZoneName: string;
}

export interface OverlapDetectedResponse {
  error: "overlap_detected";
  overlappingZone: ZoneFeature;
  overlappingZones?: ZoneFeature[];
  newZone: ZoneFeature;
}

/**
 * POST /zones/adjust
 */
export interface AdjustZoneRequest {
  organizationId: UUID;
  newZone: ZoneFeature;
  overlappingZoneId?: UUID | string;
  overlappingZoneIds?: Array<UUID | string>;
}

export interface AdjustZoneResponse {
  ok: true;
  adjustedZone: ZoneFeature;
}

export type AdjustZoneErrorCode =
  | "adjust_missing_overlap_ids"
  | "adjust_overlap_zone_missing"
  | "adjust_geometry_invalid"
  | "adjust_inside_zone"
  | "adjust_overlap_processing_failed"
  | "adjust_too_small";

export interface AdjustZoneErrorResponse extends ApiErrorResponse {
  code: AdjustZoneErrorCode;
}

/**
 * DELETE /zones/:zoneId?organizationId=:organizationId
 */
export interface DeleteZoneResponse {
  ok: true;
  deletedId: string;
}

/**
 * PUT /zones/:zoneId
 */
export interface UpdateZoneRequest {
  organizationId: UUID;
  feature: ZoneFeature;
}

export interface UpdateZoneResponse {
  ok: true;
  id: string;
  updated: true;
}

/**
 * POST /h3/generate
 */
export interface GenerateH3GridRequest {
  polygon: GeoJSONPosition[];
  resolution?: number;
}

export interface H3CellFeatureProperties {
  h3Index: string;
  resolution: number;
}

export interface H3CellFeature {
  type: "Feature";
  properties: H3CellFeatureProperties;
  geometry: ZonePolygonGeometry;
}

export interface GenerateH3GridResponse {
  type: "FeatureCollection";
  features: H3CellFeature[];
}
