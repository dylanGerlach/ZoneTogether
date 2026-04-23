import { latLngToCell } from "h3-js";

import type { MembershipRole, ProjectMapTeamSnapshot, UUID } from "../../types";

export function canEditOrganizationProjects(role: MembershipRole): boolean {
  return role === "owner" || role === "admin";
}

export function getCellOwnerTeamId(
  teams: ProjectMapTeamSnapshot[],
  h3Cell: string,
): UUID | null {
  for (const teamSnapshot of teams) {
    if (teamSnapshot.h3Cells.includes(h3Cell)) {
      return teamSnapshot.team.id;
    }
  }
  return null;
}

export function buildCellTeamLookup(teams: ProjectMapTeamSnapshot[]): Map<string, UUID> {
  const lookup = new Map<string, UUID>();
  for (const teamSnapshot of teams) {
    for (const h3Cell of teamSnapshot.h3Cells) {
      lookup.set(h3Cell, teamSnapshot.team.id);
    }
  }
  return lookup;
}

export function nextHexAction(args: {
  selectedTeamId: UUID;
  currentOwnerTeamId: UUID | null;
}): "assign" | "unassign" {
  if (args.currentOwnerTeamId === args.selectedTeamId) return "unassign";
  return "assign";
}

export function latLngToProjectCell(args: {
  latitude: number;
  longitude: number;
  resolution: number;
}): string {
  return latLngToCell(args.latitude, args.longitude, args.resolution);
}
