import { createClient } from "@supabase/supabase-js";
import { getResolution, isValidCell } from "h3-js";
import dotenv from "dotenv";

import type {
  GetProjectMapResponse,
  GetProjectTeamMembersResponse,
  GetProjectsResponse,
  ListProjectTeamsResponse,
  MembershipRole,
  Project,
  ProjectHexAssignment,
  ProjectMapTeamSnapshot,
  ProjectTeam,
  ProjectTeamMember,
  SetProjectTeamMembersRequest,
  UpdateProjectRequest,
  UpdateProjectTeamRequest,
  UUID,
} from "../contracts/backend-api.types.js";

dotenv.config();

type SupabaseError = { code?: string; message?: string } | null;

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeHexColor(colorHex: string): string {
  return colorHex.trim().toUpperCase();
}

export class ProjectsService {
  private client: any;

  constructor(token: string) {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );
  }

  async createProject(args: {
    organizationId: UUID;
    name: string;
    description?: string;
    h3Resolution: number;
    city: string;
    centerLat: number;
    centerLng: number;
    createdBy: UUID;
  }): Promise<Project> {
    const payload = {
      organization_id: args.organizationId,
      name: args.name,
      description: args.description ?? null,
      h3_resolution: args.h3Resolution,
      city: args.city,
      center_lat: args.centerLat,
      center_lng: args.centerLng,
      created_by: args.createdBy,
    };
    const { data, error } = await this.client
      .from("projects")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as Project;
  }

  async getOrganizationRole(
    organizationId: UUID,
    userId: UUID,
  ): Promise<MembershipRole | null> {
    const { data, error } = await this.client
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.role as MembershipRole | undefined) ?? null;
  }

  async listProjects(organizationId: UUID): Promise<GetProjectsResponse> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { projects: (data ?? []) as Project[] };
  }

  async getProject(projectId: UUID): Promise<Project | null> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    return (data as Project | null) ?? null;
  }

  async updateProject(projectId: UUID, payload: UpdateProjectRequest): Promise<Project | null> {
    const updatePayload: Record<string, unknown> = {};
    if (typeof payload.name === "string") updatePayload.name = payload.name;
    if (typeof payload.description === "string") updatePayload.description = payload.description;
    if (typeof payload.h3Resolution === "number") updatePayload.h3_resolution = payload.h3Resolution;

    const { data, error } = await this.client
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as Project | null) ?? null;
  }

  async deleteProject(projectId: UUID): Promise<boolean> {
    const { error, count } = await this.client
      .from("projects")
      .delete({ count: "exact" })
      .eq("id", projectId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async listTeams(projectId: UUID): Promise<ListProjectTeamsResponse> {
    const { data, error } = await this.client
      .from("project_teams")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { teams: (data ?? []) as ProjectTeam[] };
  }

  async getTeam(projectId: UUID, teamId: UUID): Promise<ProjectTeam | null> {
    const { data, error } = await this.client
      .from("project_teams")
      .select("*")
      .eq("project_id", projectId)
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    return (data as ProjectTeam | null) ?? null;
  }

  async createTeam(projectId: UUID, name: string, colorHex: string): Promise<ProjectTeam> {
    const { data, error } = await this.client
      .from("project_teams")
      .insert({
        project_id: projectId,
        name,
        color_hex: normalizeHexColor(colorHex),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as ProjectTeam;
  }

  async updateTeam(
    projectId: UUID,
    teamId: UUID,
    payload: UpdateProjectTeamRequest,
  ): Promise<ProjectTeam | null> {
    const updatePayload: Record<string, unknown> = {};
    if (typeof payload.name === "string") updatePayload.name = payload.name;
    if (typeof payload.colorHex === "string") {
      updatePayload.color_hex = normalizeHexColor(payload.colorHex);
    }

    const { data, error } = await this.client
      .from("project_teams")
      .update(updatePayload)
      .eq("id", teamId)
      .eq("project_id", projectId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as ProjectTeam | null) ?? null;
  }

  async deleteTeam(projectId: UUID, teamId: UUID): Promise<boolean> {
    const { error, count } = await this.client
      .from("project_teams")
      .delete({ count: "exact" })
      .eq("id", teamId)
      .eq("project_id", projectId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async setTeamMembers(args: {
    project: Project;
    teamId: UUID;
    payload: SetProjectTeamMembersRequest;
    assignedBy: UUID;
  }): Promise<GetProjectTeamMembersResponse> {
    const requestedUserIds = uniqueStrings(args.payload.userIds ?? []);
    if (requestedUserIds.length > 0) {
      const { data, error } = await this.client
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", args.project.organization_id)
        .in("user_id", requestedUserIds);
      if (error) throw error;
      const validUserIds = new Set(((data ?? []) as Array<{ user_id: UUID }>).map((row) => row.user_id));
      const invalidUserIds = requestedUserIds.filter((userId) => !validUserIds.has(userId));
      if (invalidUserIds.length > 0) {
        throw new Error(`Users are not in organization: ${invalidUserIds.join(", ")}`);
      }
    }

    const { error: clearError } = await this.client
      .from("project_team_members")
      .delete()
      .eq("project_id", args.project.id)
      .eq("team_id", args.teamId);
    if (clearError) throw clearError;

    if (requestedUserIds.length > 0) {
      const inserts = requestedUserIds.map((userId) => ({
        project_id: args.project.id,
        team_id: args.teamId,
        user_id: userId,
        assigned_by: args.assignedBy,
      }));
      const { error: upsertError } = await this.client
        .from("project_team_members")
        .upsert(inserts, { onConflict: "project_id,team_id,user_id" });
      if (upsertError) throw upsertError;
    }

    return this.listProjectMembers(args.project.id);
  }

  async listProjectMembers(projectId: UUID): Promise<GetProjectTeamMembersResponse> {
    const { data, error } = await this.client
      .from("project_team_members")
      .select("project_id, team_id, user_id, assigned_by, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { members: (data ?? []) as ProjectTeamMember[] };
  }

  async listDistinctProjectUserIds(projectId: UUID): Promise<UUID[]> {
    const { data, error } = await this.client
      .from("project_team_members")
      .select("user_id")
      .eq("project_id", projectId);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ user_id: UUID }>;
    return uniqueStrings(rows.map((row) => row.user_id)) as UUID[];
  }

  async getProjectMap(project: Project): Promise<GetProjectMapResponse> {
    const teamsResponse = await this.listTeams(project.id);
    const membersResponse = await this.listProjectMembers(project.id);
    const { data: assignmentRows, error: assignmentsError } = await this.client
      .from("project_hex_assignments")
      .select("project_id, h3_cell, team_id, assigned_by, created_at, updated_at")
      .eq("project_id", project.id);
    if (assignmentsError) throw assignmentsError;

    const assignments = (assignmentRows ?? []) as ProjectHexAssignment[];
    const cellsByTeam = new Map<UUID, string[]>();
    for (const assignment of assignments) {
      const current = cellsByTeam.get(assignment.team_id) ?? [];
      current.push(assignment.h3_cell);
      cellsByTeam.set(assignment.team_id, current);
    }

    const memberCounts = new Map<UUID, number>();
    for (const member of membersResponse.members) {
      memberCounts.set(member.team_id, (memberCounts.get(member.team_id) ?? 0) + 1);
    }

    const teamSnapshots: ProjectMapTeamSnapshot[] = teamsResponse.teams.map((team) => ({
      team,
      memberCount: memberCounts.get(team.id) ?? 0,
      h3Cells: cellsByTeam.get(team.id) ?? [],
    }));

    return {
      project,
      teams: teamSnapshots,
    };
  }

  async assignHexes(args: {
    project: Project;
    teamId: UUID;
    h3Cells: string[];
    assignedBy: UUID;
  }): Promise<number> {
    const uniqueCells = uniqueStrings(args.h3Cells);
    const validatedCells = uniqueCells.filter((cell) => isValidCell(cell));
    if (validatedCells.length !== uniqueCells.length) {
      throw new Error("One or more h3Cells are invalid");
    }

    if (validatedCells.some((cell) => getResolution(cell) !== args.project.h3_resolution)) {
      throw new Error(
        `All h3Cells must match project resolution ${args.project.h3_resolution}`,
      );
    }

    const inserts = validatedCells.map((cell) => ({
      project_id: args.project.id,
      h3_cell: cell,
      team_id: args.teamId,
      assigned_by: args.assignedBy,
    }));
    const { error } = await this.client
      .from("project_hex_assignments")
      .upsert(inserts, { onConflict: "project_id,h3_cell" });
    if (error) throw error;
    return validatedCells.length;
  }

  async unassignHexes(projectId: UUID, h3Cells: string[]): Promise<number> {
    const uniqueCells = uniqueStrings(h3Cells);
    if (uniqueCells.length === 0) return 0;
    const { error, count } = await this.client
      .from("project_hex_assignments")
      .delete({ count: "exact" })
      .eq("project_id", projectId)
      .in("h3_cell", uniqueCells);
    if (error) throw error;
    return count ?? 0;
  }

  isConstraintConflict(error: SupabaseError): boolean {
    return error?.code === "23505";
  }
}
