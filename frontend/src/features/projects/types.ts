import type {
  MembershipRole,
  Project,
  ProjectMapTeamSnapshot,
  ProjectTeam,
  ProjectTeamMember,
  UUID,
} from "../../types";

export type ProjectEditorMode = "view" | "assign";

export type ProjectRouteContext = {
  organizationId: UUID;
  organizationName: string;
  organizationRole: MembershipRole;
};

export type TeamOption = {
  id: UUID;
  label: string;
  colorHex: string;
};

export type TeamMemberOption = {
  userId: UUID;
  label: string;
};

export type ProjectMapState = {
  project: Project;
  teams: ProjectMapTeamSnapshot[];
};

export type ProjectTeamState = {
  teams: ProjectTeam[];
  members: ProjectTeamMember[];
};
