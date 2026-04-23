/**
 * Navigation type definitions
 */

import type { MembershipRole, UUID } from "./generated/backend-api.types";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Account: undefined;
  Organization: {
    organizationId: UUID;
    organizationName: string;
    organizationRole: MembershipRole;
  };
  ProjectList: {
    organizationId: UUID;
    organizationName: string;
    organizationRole: MembershipRole;
  };
  ProjectDetail: {
    organizationId: UUID;
    organizationName: string;
    organizationRole: MembershipRole;
    projectId: UUID;
  };
  ProjectMap: {
    organizationId: UUID;
    organizationName: string;
    organizationRole: MembershipRole;
    projectId: UUID;
    focusH3Cell?: string;
  };
  ZoneMap: { organizationId: UUID; organizationName: string };
  MessageDetail: { conversationId: UUID; title: string };
  NewMessage: { organizationId: UUID; organizationName: string };
};

export type ScreenName = keyof RootStackParamList;
