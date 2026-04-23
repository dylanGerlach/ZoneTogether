import type {
  CreateSessionRequest,
  Message as ApiMessage,
} from "./generated/backend-api.types";

export type SessionCreatePayload = CreateSessionRequest;

export type MessageVM = ApiMessage & {
  senderName: string;
  isOwn: boolean;
};
