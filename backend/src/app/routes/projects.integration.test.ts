import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import request from "supertest";

import { app } from "../../app.js";
import { __setProjectsServiceFactoryForTests } from "../controllers/projects.controller.js";
import type {
  CreateProjectResponse,
  GetProjectMapResponse,
  GetProjectTeamMembersResponse,
  GetProjectsResponse,
  ListProjectTeamsResponse,
  MembershipRole,
  Project,
  ProjectTeam,
  ProjectTeamMember,
  SetProjectTeamMembersRequest,
  UpdateProjectRequest,
  UpdateProjectResponse,
  UpdateProjectTeamRequest,
  UUID,
} from "../../contracts/backend-api.types.js";

const ORG_ID = "11111111-1111-1111-1111-111111111111";

function authHeader(userId: string) {
  return { Authorization: `Bearer test-token:${userId}` };
}

const DEFAULT_CITY = "Phoenix";
const DEFAULT_CENTER_LAT = 33.4484;
const DEFAULT_CENTER_LNG = -112.074;

function projectCityFields() {
  return {
    city: DEFAULT_CITY,
    centerLat: DEFAULT_CENTER_LAT,
    centerLng: DEFAULT_CENTER_LNG,
  };
}

class FakeProjectsService {
  private readonly orgMemberships = new Map<UUID, Map<UUID, MembershipRole>>();
  private readonly projects = new Map<UUID, Project>();
  private readonly teams = new Map<UUID, ProjectTeam>();
  private members: ProjectTeamMember[] = [];
  private assignments = new Map<
    string,
    { projectId: UUID; teamId: UUID; h3Cell: string }
  >();

  constructor() {
    const roleMap = new Map<UUID, MembershipRole>();
    roleMap.set("admin-user", "owner");
    roleMap.set("member-user", "member");
    this.orgMemberships.set(ORG_ID, roleMap);
  }

  isConstraintConflict(_error: { code?: string } | null): boolean {
    return false;
  }

  async getOrganizationRole(
    organizationId: UUID,
    userId: UUID,
  ): Promise<MembershipRole | null> {
    return this.orgMemberships.get(organizationId)?.get(userId) ?? null;
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
  }): Promise<CreateProjectResponse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      organization_id: args.organizationId,
      name: args.name,
      description: args.description ?? null,
      h3_resolution: args.h3Resolution,
      city: args.city,
      center_lat: args.centerLat,
      center_lng: args.centerLng,
      created_by: args.createdBy,
      created_at: now,
      updated_at: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async listProjects(organizationId: UUID): Promise<GetProjectsResponse> {
    return {
      projects: Array.from(this.projects.values()).filter(
        (project) => project.organization_id === organizationId,
      ),
    };
  }

  async getProject(projectId: UUID): Promise<Project | null> {
    return this.projects.get(projectId) ?? null;
  }

  async updateProject(
    projectId: UUID,
    payload: UpdateProjectRequest,
  ): Promise<UpdateProjectResponse | null> {
    const existing = this.projects.get(projectId);
    if (!existing) return null;
    const updated: Project = {
      ...existing,
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
      ...(payload.h3Resolution !== undefined
        ? { h3_resolution: payload.h3Resolution }
        : {}),
      updated_at: new Date().toISOString(),
    };
    this.projects.set(projectId, updated);
    return updated;
  }

  async deleteProject(projectId: UUID): Promise<boolean> {
    const existed = this.projects.delete(projectId);
    if (!existed) return false;
    for (const [teamId, team] of this.teams.entries()) {
      if (team.project_id === projectId) this.teams.delete(teamId);
    }
    this.members = this.members.filter(
      (member) => member.project_id !== projectId,
    );
    for (const [key, assignment] of this.assignments.entries()) {
      if (assignment.projectId === projectId) this.assignments.delete(key);
    }
    return true;
  }

  async listTeams(projectId: UUID): Promise<ListProjectTeamsResponse> {
    return {
      teams: Array.from(this.teams.values()).filter(
        (team) => team.project_id === projectId,
      ),
    };
  }

  async getTeam(projectId: UUID, teamId: UUID): Promise<ProjectTeam | null> {
    const team = this.teams.get(teamId) ?? null;
    if (!team || team.project_id !== projectId) return null;
    return team;
  }

  async createTeam(
    projectId: UUID,
    name: string,
    colorHex: string,
  ): Promise<ProjectTeam> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const team: ProjectTeam = {
      id,
      project_id: projectId,
      name,
      color_hex: colorHex.toUpperCase(),
      created_at: now,
      updated_at: now,
    };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(
    projectId: UUID,
    teamId: UUID,
    payload: UpdateProjectTeamRequest,
  ): Promise<ProjectTeam | null> {
    const team = this.teams.get(teamId);
    if (!team || team.project_id !== projectId) return null;
    const updated: ProjectTeam = {
      ...team,
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.colorHex !== undefined
        ? { color_hex: payload.colorHex.toUpperCase() }
        : {}),
      updated_at: new Date().toISOString(),
    };
    this.teams.set(teamId, updated);
    return updated;
  }

  async deleteTeam(projectId: UUID, teamId: UUID): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team || team.project_id !== projectId) return false;
    this.teams.delete(teamId);
    this.members = this.members.filter((member) => member.team_id !== teamId);
    for (const [key, assignment] of this.assignments.entries()) {
      if (assignment.teamId === teamId) this.assignments.delete(key);
    }
    return true;
  }

  async setTeamMembers(args: {
    project: Project;
    teamId: UUID;
    payload: SetProjectTeamMembersRequest;
    assignedBy: UUID;
  }): Promise<GetProjectTeamMembersResponse> {
    const roleMap =
      this.orgMemberships.get(args.project.organization_id) ?? new Map();
    for (const userId of args.payload.userIds) {
      if (!roleMap.has(userId)) {
        throw new Error(`Users are not in organization: ${userId}`);
      }
    }

    this.members = this.members.filter(
      (member) =>
        !(
          member.project_id === args.project.id &&
          member.team_id === args.teamId
        ),
    );
    const createdAt = new Date().toISOString();
    const toInsert: ProjectTeamMember[] = args.payload.userIds.map(
      (userId) => ({
        project_id: args.project.id,
        team_id: args.teamId,
        user_id: userId,
        assigned_by: args.assignedBy,
        created_at: createdAt,
      }),
    );
    this.members = this.members.concat(toInsert);

    return this.listProjectMembers(args.project.id);
  }

  async listProjectMembers(
    projectId: UUID,
  ): Promise<GetProjectTeamMembersResponse> {
    return {
      members: this.members.filter((member) => member.project_id === projectId),
    };
  }

  async getProjectMap(project: Project): Promise<GetProjectMapResponse> {
    const teams = (await this.listTeams(project.id)).teams;
    const members = (await this.listProjectMembers(project.id)).members;
    const memberCountByTeam = new Map<UUID, number>();
    for (const member of members) {
      memberCountByTeam.set(
        member.team_id,
        (memberCountByTeam.get(member.team_id) ?? 0) + 1,
      );
    }
    const cellsByTeam = new Map<UUID, string[]>();
    for (const assignment of this.assignments.values()) {
      if (assignment.projectId !== project.id) continue;
      const existing = cellsByTeam.get(assignment.teamId) ?? [];
      existing.push(assignment.h3Cell);
      cellsByTeam.set(assignment.teamId, existing);
    }
    return {
      project,
      teams: teams.map((team) => ({
        team,
        memberCount: memberCountByTeam.get(team.id) ?? 0,
        h3Cells: cellsByTeam.get(team.id) ?? [],
      })),
    };
  }

  async assignHexes(args: {
    project: Project;
    teamId: UUID;
    h3Cells: string[];
    assignedBy: UUID;
  }): Promise<number> {
    const _assignedBy = args.assignedBy;
    void _assignedBy;
    const uniqueCells = Array.from(new Set(args.h3Cells));
    for (const cell of uniqueCells) {
      this.assignments.set(`${args.project.id}:${cell}`, {
        projectId: args.project.id,
        teamId: args.teamId,
        h3Cell: cell,
      });
    }
    return uniqueCells.length;
  }

  async unassignHexes(projectId: UUID, h3Cells: string[]): Promise<number> {
    let removed = 0;
    for (const cell of Array.from(new Set(h3Cells))) {
      const key = `${projectId}:${cell}`;
      if (this.assignments.delete(key)) removed += 1;
    }
    return removed;
  }
}

test.beforeEach(() => {
  const fake = new FakeProjectsService();
  __setProjectsServiceFactoryForTests(() => fake as any);
});

test.afterEach(() => {
  __setProjectsServiceFactoryForTests(null);
});

test("project endpoints: admin full flow + member read-only access", async () => {
  const createProjectRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Phoenix Cleanup",
      description: "Pilot project",
      h3Resolution: 9,
      ...projectCityFields(),
    });
  assert.equal(createProjectRes.status, 200);
  const projectId = String(createProjectRes.body.id);

  const createTeamRes = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "Team Red", colorHex: "#FF5733" });
  assert.equal(createTeamRes.status, 200);
  const teamId = String(createTeamRes.body.id);

  const setMembersRes = await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["member-user"] });
  assert.equal(setMembersRes.status, 200);
  assert.equal(setMembersRes.body.members.length, 1);

  const assignHexesRes = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/map/assign`)
    .set(authHeader("admin-user"))
    .send({ teamId, h3Cells: ["8828308281fffff", "8828308285fffff"] });
  assert.equal(assignHexesRes.status, 200);
  assert.equal(assignHexesRes.body.assignedCount, 2);

  const listProjectsAsMember = await request(app)
    .get("/projects")
    .query({ organizationId: ORG_ID })
    .set(authHeader("member-user"));
  assert.equal(listProjectsAsMember.status, 200);
  assert.equal(listProjectsAsMember.body.projects.length, 1);

  const mapAsMember = await request(app)
    .get(`/projects/${encodeURIComponent(projectId)}/map`)
    .set(authHeader("member-user"));
  assert.equal(mapAsMember.status, 200);
  assert.equal(mapAsMember.body.teams.length, 1);
  assert.equal(mapAsMember.body.teams[0].memberCount, 1);
  assert.equal(mapAsMember.body.teams[0].h3Cells.length, 2);
});

test("project endpoints: same user can belong to multiple teams in one project", async () => {
  const createProjectRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Multi Team Project",
      h3Resolution: 9,
      ...projectCityFields(),
    });
  assert.equal(createProjectRes.status, 200);
  const projectId = String(createProjectRes.body.id);

  const teamAlpha = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "Team Alpha", colorHex: "#3366FF" });
  assert.equal(teamAlpha.status, 200);
  const teamAlphaId = String(teamAlpha.body.id);

  const teamBeta = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "Team Beta", colorHex: "#22C55E" });
  assert.equal(teamBeta.status, 200);
  const teamBetaId = String(teamBeta.body.id);

  const addToAlpha = await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamAlphaId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["member-user"] });
  assert.equal(addToAlpha.status, 200);

  const addToBeta = await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamBetaId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["member-user"] });
  assert.equal(addToBeta.status, 200);

  const mapRes = await request(app)
    .get(`/projects/${encodeURIComponent(projectId)}/map`)
    .set(authHeader("admin-user"));
  assert.equal(mapRes.status, 200);
  const alphaSnapshot = mapRes.body.teams.find(
    (snapshot: { team: ProjectTeam }) => snapshot.team.id === teamAlphaId,
  );
  const betaSnapshot = mapRes.body.teams.find(
    (snapshot: { team: ProjectTeam }) => snapshot.team.id === teamBetaId,
  );
  assert.equal(alphaSnapshot.memberCount, 1);
  assert.equal(betaSnapshot.memberCount, 1);

  const memberships = (addToBeta.body.members as ProjectTeamMember[]).filter(
    (member) => member.user_id === "member-user",
  );
  assert.equal(memberships.length, 2);
  const teamIds = memberships.map((member) => member.team_id).sort();
  assert.deepEqual(teamIds, [teamAlphaId, teamBetaId].sort());
});

test("project endpoints: member cannot mutate admin-only resources", async () => {
  const createProjectRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "LA Cleanup",
      h3Resolution: 9,
      ...projectCityFields(),
    });
  assert.equal(createProjectRes.status, 200);
  const projectId = String(createProjectRes.body.id);

  const memberCreateProject = await request(app)
    .post("/projects")
    .set(authHeader("member-user"))
    .send({
      organizationId: ORG_ID,
      name: "Should Fail",
      h3Resolution: 9,
      ...projectCityFields(),
    });
  assert.equal(memberCreateProject.status, 403);

  const memberCreateTeam = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("member-user"))
    .send({ name: "Team Blue", colorHex: "#3366FF" });
  assert.equal(memberCreateTeam.status, 403);

  const memberAssignHex = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/map/assign`)
    .set(authHeader("member-user"))
    .send({ teamId: randomUUID(), h3Cells: ["8828308281fffff"] });
  assert.equal(memberAssignHex.status, 403);
});

test("project create defaults h3Resolution to 8 when omitted", async () => {
  const createProjectRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Default Resolution Project",
      ...projectCityFields(),
    });
  assert.equal(createProjectRes.status, 200);
  assert.equal(createProjectRes.body.h3_resolution, 8);
});

test("project endpoints reject h3Resolution outside 8..10", async () => {
  const createTooLow = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Too Low",
      h3Resolution: 7,
    });
  assert.equal(createTooLow.status, 400);
  assert.match(String(createTooLow.body.error ?? ""), /between 8 and 10/i);

  const createTooHigh = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Too High",
      h3Resolution: 11,
    });
  assert.equal(createTooHigh.status, 400);
  assert.match(String(createTooHigh.body.error ?? ""), /between 8 and 10/i);

  const validProject = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Valid Resolution",
      h3Resolution: 9,
      ...projectCityFields(),
    });
  assert.equal(validProject.status, 200);
  const projectId = String(validProject.body.id);

  const patchTooLow = await request(app)
    .patch(`/projects/${encodeURIComponent(projectId)}`)
    .set(authHeader("admin-user"))
    .send({ h3Resolution: 7 });
  assert.equal(patchTooLow.status, 400);
  assert.match(String(patchTooLow.body.error ?? ""), /between 8 and 10/i);

  const patchTooHigh = await request(app)
    .patch(`/projects/${encodeURIComponent(projectId)}`)
    .set(authHeader("admin-user"))
    .send({ h3Resolution: 11 });
  assert.equal(patchTooHigh.status, 400);
  assert.match(String(patchTooHigh.body.error ?? ""), /between 8 and 10/i);
});
