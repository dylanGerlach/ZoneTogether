/**
 * Navigation type definitions
 */

import type { UUID } from "./generated/backend-api.types";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Account: undefined;
  Organization: { organizationId: UUID; organizationName: string };
  MessageList: { organizationId: UUID; organizationName: string };
  MessageDetail: { conversationId: UUID; title: string };
  NewMessage: { organizationId: UUID; organizationName: string };
};

export type ScreenName = keyof RootStackParamList;
