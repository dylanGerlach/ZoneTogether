import type {
  CreateSessionRequest,
  Message as ApiMessage,
  MessageSession,
  OrganizationSummary,
  OrganizationUser,
} from "./generated/backend-api.types";

export type SessionCreatePayload = CreateSessionRequest;

export type ConversationVM = MessageSession & {
  timestampLabel: string;
  isGroup: boolean;
  unreadCount?: number;
};

export type MessageVM = ApiMessage & {
  senderName: string;
  isOwn: boolean;
};

export interface OrganizationMemberVM {
  user_id: OrganizationUser["user_id"];
  profile_full_name: OrganizationUser["profile_full_name"];
  role: OrganizationUser["role"];
}

export interface OrganizationVM {
  id: string;
  name: OrganizationSummary["name"];
  description: OrganizationSummary["description"];
  members: OrganizationMemberVM[];
}
