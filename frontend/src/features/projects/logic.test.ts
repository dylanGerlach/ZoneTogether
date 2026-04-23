import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCellTeamLookup,
  canEditOrganizationProjects,
  nextHexAction,
} from "./logic";
import type { ProjectMapTeamSnapshot } from "../../types";

const sampleTeams: ProjectMapTeamSnapshot[] = [
  {
    team: {
      id: "team-a",
      project_id: "project-1",
      name: "Team A",
      color_hex: "#FF0000",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    memberCount: 2,
    h3Cells: ["8828308281fffff", "8828308283fffff"],
  },
  {
    team: {
      id: "team-b",
      project_id: "project-1",
      name: "Team B",
      color_hex: "#00AAFF",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    memberCount: 1,
    h3Cells: ["8828308285fffff"],
  },
];

test("canEditOrganizationProjects only allows owner/admin", () => {
  assert.equal(canEditOrganizationProjects("owner"), true);
  assert.equal(canEditOrganizationProjects("admin"), true);
  assert.equal(canEditOrganizationProjects("member"), false);
});

test("buildCellTeamLookup maps each H3 cell to team id", () => {
  const lookup = buildCellTeamLookup(sampleTeams);
  assert.equal(lookup.get("8828308281fffff"), "team-a");
  assert.equal(lookup.get("8828308285fffff"), "team-b");
  assert.equal(lookup.has("missing-cell"), false);
});

test("nextHexAction toggles between assign and unassign", () => {
  assert.equal(
    nextHexAction({
      selectedTeamId: "team-a",
      currentOwnerTeamId: null,
    }),
    "assign",
  );
  assert.equal(
    nextHexAction({
      selectedTeamId: "team-a",
      currentOwnerTeamId: "team-b",
    }),
    "assign",
  );
  assert.equal(
    nextHexAction({
      selectedTeamId: "team-a",
      currentOwnerTeamId: "team-a",
    }),
    "unassign",
  );
});
