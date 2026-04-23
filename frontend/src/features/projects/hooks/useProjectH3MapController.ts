import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AuthSession,
  MembershipRole,
  ProjectTeam,
  UUID,
} from "../../../types";
import { useProjectContext } from "../../../context/ProjectContext";
import {
  buildCellTeamLookup,
  canEditOrganizationProjects,
  latLngToProjectCell,
  nextHexAction,
} from "../logic";

type UseProjectH3MapControllerArgs = {
  session: AuthSession | null;
  projectId: UUID;
  organizationRole: MembershipRole;
};

const TEAM_COLOR_PALETTE = [
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#EC4899",
  "#14B8A6",
  "#8B5CF6",
];

function toHexColorValue(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return `#${toHexColorValue((r + m) * 255)}${toHexColorValue((g + m) * 255)}${toHexColorValue((b + m) * 255)}`.toUpperCase();
}

function pickRandomTeamColor(existingColors: string[]): string {
  const used = new Set(existingColors.map((color) => color.trim().toUpperCase()));
  const available = TEAM_COLOR_PALETTE.filter((color) => !used.has(color));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Fall back to vivid HSL colors when the curated palette is exhausted.
  for (let i = 0; i < 24; i += 1) {
    const hue = Math.floor(Math.random() * 360);
    const candidate = hslToHex(hue, 72, 52);
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return "#22C55E";
}

function pickDefaultTeamName(existingNames: string[]): string {
  const used = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  let index = existingNames.length + 1;
  while (used.has(`team ${index}`)) {
    index += 1;
  }
  return `Team ${index}`;
}

export function useProjectH3MapController({
  session,
  projectId,
  organizationRole,
}: UseProjectH3MapControllerArgs) {
  const canEdit = canEditOrganizationProjects(organizationRole);

  const {
    getProjectMapTeams,
    getProject,
    mapLoadingByProject,
    mapErrorByProject,
    savingMap,
    managingTeam,
    loadProjectMap,
    assignHex,
    unassignHex,
    applyCellOptimistic,
    createTeamRecord,
  } = useProjectContext();

  const teams = getProjectMapTeams(projectId);
  const project = getProject(projectId);
  const loadingMap = mapLoadingByProject[projectId] ?? false;
  const mapError = mapErrorByProject[projectId] ?? null;
  const h3Resolution = project?.h3_resolution ?? 8;

  const [activeTeamId, setActiveTeamId] = useState<UUID | null>(null);

  const cellTeamLookup = useMemo(() => buildCellTeamLookup(teams), [teams]);

  const loadMap = useCallback(async () => {
    if (!session) return;
    const response = await loadProjectMap(session, projectId);
    if (!response) return;
    if (response.teams.length > 0) {
      setActiveTeamId((previous) => previous ?? response.teams[0].team.id);
    } else {
      setActiveTeamId(null);
    }
  }, [loadProjectMap, projectId, session]);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  useEffect(() => {
    if (activeTeamId && teams.some((snapshot) => snapshot.team.id === activeTeamId)) {
      return;
    }
    if (teams.length === 0) {
      if (activeTeamId !== null) setActiveTeamId(null);
      return;
    }
    setActiveTeamId(teams[0].team.id);
  }, [activeTeamId, teams]);

  const handleCellToggle = useCallback(
    async (latitude: number, longitude: number) => {
      if (!session || !canEdit || !activeTeamId) return;

      const cell = latLngToProjectCell({
        latitude,
        longitude,
        resolution: h3Resolution,
      });
      const currentOwner = cellTeamLookup.get(cell) ?? null;
      const action = nextHexAction({
        selectedTeamId: activeTeamId,
        currentOwnerTeamId: currentOwner,
      });

      // Snapshot teams to roll back on failure.
      const previousTeams = teams;
      applyCellOptimistic(projectId, cell, action, activeTeamId);

      const ok =
        action === "assign"
          ? await assignHex(session, projectId, activeTeamId, cell)
          : await unassignHex(session, projectId, cell);

      if (!ok) {
        // Roll back: re-apply the inverse optimistic change.
        // Simplest correct approach: reload map to restore truth.
        // We can't directly set teams, so reload instead.
        // (The rollback relies on server state being authoritative.)
        void loadMap();
        void previousTeams;
      }
    },
    [
      activeTeamId,
      applyCellOptimistic,
      assignHex,
      canEdit,
      cellTeamLookup,
      h3Resolution,
      loadMap,
      projectId,
      session,
      teams,
      unassignHex,
    ],
  );

  const handleCreateTeam = useCallback(async (): Promise<ProjectTeam | null> => {
    if (!session || !canEdit) return null;

    const defaultName = pickDefaultTeamName(teams.map((snapshot) => snapshot.team.name));
    const defaultColor = pickRandomTeamColor(teams.map((snapshot) => snapshot.team.color_hex));

    const created = await createTeamRecord(session, projectId, {
      name: defaultName,
      colorHex: defaultColor,
    });
    if (created) {
      setActiveTeamId(created.id);
    }
    return created;
  }, [canEdit, createTeamRecord, projectId, session, teams]);

  return {
    canEdit,
    project,
    loadingMap,
    savingMap,
    mapError,
    creatingTeam: managingTeam,
    teams,
    h3Resolution,
    activeTeamId,
    setActiveTeamId,
    loadMap,
    handleCellToggle,
    handleCreateTeam,
  };
}
