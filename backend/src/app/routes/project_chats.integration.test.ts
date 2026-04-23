import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import request from "supertest";

import { app } from "../../app.js";
import {
  __setProjectsServiceFactoryForTests,
  __setMessagingServiceFactoryForTests,
} from "../controllers/projects.controller.js";
import { __setMessagingDBFactoryForTests } from "../controllers/messaging.controller.js";
import type {
  CreateProjectResponse,
  GetMessagesResponse,
  GetProjectTeamMembersResponse,
  GetProjectsResponse,
  ListProjectTeamsResponse,
  MembershipRole,
  Message,
  MessageSession,
  Project,
  ProjectTeam,
  ProjectTeamMember,
  SetProjectTeamMembersRequest,
  UpdateProjectRequest,
  UpdateProjectResponse,
  UpdateProjectTeamRequest,
  UUID,
} from "../../contracts/backend-api.types.js";

const ORG_ID = "22222222-2222-2222-2222-222222222222";

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

type SessionRecord = MessageSession & { memberIds: Set<UUID> };

class FakeMessagingStore {
  sessionsById = new Map<UUID, SessionRecord>();
  messagesBySession = new Map<UUID, Message[]>();

  deleteProjectSession(projectId: UUID): void {
    for (const [sessionId, entry] of this.sessionsById.entries()) {
      if (entry.project_id === projectId) {
        this.sessionsById.delete(sessionId);
        this.messagesBySession.delete(sessionId);
      }
    }
  }
}

function makeMessagingService(store: FakeMessagingStore) {
  return {
    async createSession(
      organizationId: UUID,
      title: string,
    ): Promise<MessageSession | null> {
      const id = randomUUID();
      const now = new Date().toISOString();
      const entry: SessionRecord = {
        id,
        organization_id: organizationId,
        title,
        last_message_sent: null,
        created_at: now,
        updated_at: now,
        memberIds: new Set(),
      };
      store.sessionsById.set(id, entry);
      return { ...entry };
    },
    async createProjectSession(
      projectId: UUID,
      organizationId: UUID,
      title: string,
    ): Promise<MessageSession | null> {
      const id = randomUUID();
      const now = new Date().toISOString();
      const entry: SessionRecord = {
        id,
        organization_id: organizationId,
        project_id: projectId,
        title,
        last_message_sent: null,
        created_at: now,
        updated_at: now,
        memberIds: new Set(),
      };
      store.sessionsById.set(id, entry);
      return { ...entry };
    },
    async getProjectSession(projectId: UUID): Promise<MessageSession | null> {
      for (const entry of store.sessionsById.values()) {
        if (entry.project_id === projectId) return { ...entry };
      }
      return null;
    },
    async updateSessionTitle(
      sessionId: UUID,
      title: string,
    ): Promise<MessageSession | null> {
      const entry = store.sessionsById.get(sessionId);
      if (!entry) return null;
      entry.title = title;
      entry.updated_at = new Date().toISOString();
      return { ...entry };
    },
    async addUserSession(userId: UUID, sessionId: UUID): Promise<unknown> {
      const entry = store.sessionsById.get(sessionId);
      if (!entry) return null;
      entry.memberIds.add(userId);
      return null;
    },
    async syncSessionMembers(
      sessionId: UUID,
      userIds: UUID[],
    ): Promise<{ added: UUID[]; removed: UUID[] }> {
      const entry = store.sessionsById.get(sessionId);
      if (!entry) return { added: [], removed: [] };
      const desired = new Set(userIds);
      const added: UUID[] = [];
      const removed: UUID[] = [];
      for (const id of desired) {
        if (!entry.memberIds.has(id)) added.push(id);
      }
      for (const id of entry.memberIds) {
        if (!desired.has(id)) removed.push(id);
      }
      entry.memberIds = desired;
      return { added, removed };
    },
    async createSystemMessage(
      sessionId: UUID,
      userId: UUID,
      kind: "system_join" | "system_leave",
    ): Promise<Message | null> {
      const entry = store.sessionsById.get(sessionId);
      if (!entry) return null;
      const message: Message = {
        id: randomUUID(),
        message_session_id: sessionId,
        user_id: userId,
        message: "",
        kind,
        timestamp: new Date().toISOString(),
      };
      const bucket = store.messagesBySession.get(sessionId) ?? [];
      bucket.push(message);
      store.messagesBySession.set(sessionId, bucket);
      return message;
    },
    async fetchAllUserSessions() {
      return [];
    },
    async fetchAllMessages(sessionId: UUID): Promise<GetMessagesResponse> {
      return store.messagesBySession.get(sessionId) ?? [];
    },
    async createMessage(
      sessionId: UUID,
      userId: UUID,
      content: string,
      h3Cell?: string | null,
    ): Promise<Message | null> {
      const entry = store.sessionsById.get(sessionId);
      if (!entry) return null;
      const message: Message = {
        id: randomUUID(),
        message_session_id: sessionId,
        user_id: userId,
        message: content,
        timestamp: new Date().toISOString(),
        kind: "text",
      ...(h3Cell ? { h3_cell: h3Cell } : {}),
      };
      const bucket = store.messagesBySession.get(sessionId) ?? [];
      bucket.push(message);
      store.messagesBySession.set(sessionId, bucket);
      return message;
    },
    async updateSessionPreview(
      sessionId: UUID,
      content: string,
    ): Promise<MessageSession | null> {
      const entry = store.sessionsById.get(sessionId);
      if (!entry) return null;
      entry.last_message_sent = content;
      entry.updated_at = new Date().toISOString();
      return { ...entry };
    },
  };
}

class FakeProjectsService {
  private readonly orgMemberships = new Map<UUID, Map<UUID, MembershipRole>>();
  private readonly projects = new Map<UUID, Project>();
  private readonly teams = new Map<UUID, ProjectTeam>();
  private members: ProjectTeamMember[] = [];

  constructor(private readonly store: FakeMessagingStore) {
    const roleMap = new Map<UUID, MembershipRole>();
    roleMap.set("admin-user", "owner");
    roleMap.set("alice", "member");
    roleMap.set("bob", "member");
    roleMap.set("carol", "member");
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
    // Simulate FK cascade on message_session(project_id) -> projects(id).
    this.store.deleteProjectSession(projectId);
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
    return true;
  }

  async setTeamMembers(args: {
    project: Project;
    teamId: UUID;
    payload: SetProjectTeamMembersRequest;
    assignedBy: UUID;
  }): Promise<GetProjectTeamMembersResponse> {
    this.members = this.members.filter(
      (member) =>
        !(
          member.project_id === args.project.id &&
          member.team_id === args.teamId
        ),
    );
    const createdAt = new Date().toISOString();
    const toInsert: ProjectTeamMember[] = args.payload.userIds.map((userId) => ({
      project_id: args.project.id,
      team_id: args.teamId,
      user_id: userId,
      assigned_by: args.assignedBy,
      created_at: createdAt,
    }));
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

  async listDistinctProjectUserIds(projectId: UUID): Promise<UUID[]> {
    const ids = new Set<UUID>();
    for (const member of this.members) {
      if (member.project_id === projectId) ids.add(member.user_id);
    }
    return Array.from(ids);
  }

  async getProjectMap() {
    throw new Error("not used in these tests");
  }

  async assignHexes() {
    return 0;
  }

  async unassignHexes() {
    return 0;
  }
}

let store: FakeMessagingStore;
let messagingService: ReturnType<typeof makeMessagingService>;
let projectsService: FakeProjectsService;

test.beforeEach(() => {
  store = new FakeMessagingStore();
  messagingService = makeMessagingService(store);
  projectsService = new FakeProjectsService(store);
  __setProjectsServiceFactoryForTests(() => projectsService as any);
  __setMessagingServiceFactoryForTests(() => messagingService as any);
  __setMessagingDBFactoryForTests(() => messagingService as any);
});

test.afterEach(() => {
  __setProjectsServiceFactoryForTests(null);
  __setMessagingServiceFactoryForTests(null);
  __setMessagingDBFactoryForTests(null);
});

function currentSessionFor(projectId: UUID) {
  for (const entry of store.sessionsById.values()) {
    if (entry.project_id === projectId) return entry;
  }
  return null;
}

test("project creation auto-provisions a project chat seeded with the creator and emits system_join", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({
      organizationId: ORG_ID,
      name: "Coastal Cleanup",
      h3Resolution: 9,
      ...projectCityFields(),
    });
  assert.equal(createRes.status, 200);
  const projectId = String(createRes.body.id);

  const session = currentSessionFor(projectId);
  assert.ok(session, "project session should exist");
  assert.equal(session!.title, "Coastal Cleanup - Team Chat");
  assert.deepEqual(Array.from(session!.memberIds).sort(), ["admin-user"]);

  const messages = store.messagesBySession.get(session!.id) ?? [];
  const joins = messages.filter((m) => m.kind === "system_join");
  assert.equal(joins.length, 1);
  assert.equal(joins[0]!.user_id, "admin-user");
});

test("setTeamMembers syncs project chat membership to the union of team members + creator", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Park Restoration", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);

  const teamRes = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "Volunteers", colorHex: "#3366FF" });
  const teamId = String(teamRes.body.id);

  const setMembersRes = await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["alice", "bob"] });
  assert.equal(setMembersRes.status, 200);

  const session = currentSessionFor(projectId);
  assert.ok(session);
  assert.deepEqual(
    Array.from(session!.memberIds).sort(),
    ["admin-user", "alice", "bob"].sort(),
  );
});

test("deleting a team removes users from chat when they have no other team membership", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Beach Day", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);

  const teamARes = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "A", colorHex: "#3366FF" });
  const teamAId = String(teamARes.body.id);
  const teamBRes = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "B", colorHex: "#22C55E" });
  const teamBId = String(teamBRes.body.id);

  await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamAId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["alice", "bob"] });
  await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamBId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["bob", "carol"] });

  let session = currentSessionFor(projectId);
  assert.deepEqual(
    Array.from(session!.memberIds).sort(),
    ["admin-user", "alice", "bob", "carol"].sort(),
  );

  const deleteTeamRes = await request(app)
    .delete(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamAId)}`,
    )
    .set(authHeader("admin-user"));
  assert.equal(deleteTeamRes.status, 200);

  session = currentSessionFor(projectId);
  assert.deepEqual(
    Array.from(session!.memberIds).sort(),
    ["admin-user", "bob", "carol"].sort(),
    "alice lost her only team and should be removed from the chat",
  );
});

test("deleting a project cascade-removes its chat session", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Short-lived", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);
  assert.ok(currentSessionFor(projectId));

  const deleteRes = await request(app)
    .delete(`/projects/${encodeURIComponent(projectId)}`)
    .set(authHeader("admin-user"));
  assert.equal(deleteRes.status, 200);

  assert.equal(
    currentSessionFor(projectId),
    null,
    "session should be gone when the project is deleted",
  );
});

test("renaming a project renames the associated chat title", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Old Name", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);

  const patchRes = await request(app)
    .patch(`/projects/${encodeURIComponent(projectId)}`)
    .set(authHeader("admin-user"))
    .send({ name: "New Name" });
  assert.equal(patchRes.status, 200);

  const session = currentSessionFor(projectId);
  assert.equal(session!.title, "New Name - Team Chat");
});

test("message with h3Cell round-trips through GET /sessions/:id", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Reefs", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);
  const session = currentSessionFor(projectId);
  assert.ok(session);
  const sessionId = session!.id;

  const validCell = "8828308281fffff";
  const sendRes = await request(app)
    .post("/sessions/message")
    .set(authHeader("admin-user"))
    .send({ sessionId, content: "Found a turtle here", h3Cell: validCell });
  assert.equal(sendRes.status, 200);
  assert.equal((sendRes.body as Message).h3_cell, validCell);

  const listRes = await request(app)
    .get(`/sessions/${encodeURIComponent(sessionId)}`)
    .set(authHeader("admin-user"));
  assert.equal(listRes.status, 200);
  const messages = listRes.body as Message[];
  const textMessages = messages.filter((m) => (m.kind ?? "text") === "text");
  assert.equal(textMessages.length, 1);
  assert.equal(textMessages[0]!.h3_cell, validCell);
});

test("adding/removing team members emits system_join / system_leave messages", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Join Leave", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);
  const sessionId = currentSessionFor(projectId)!.id;

  const teamRes = await request(app)
    .post(`/projects/${encodeURIComponent(projectId)}/teams`)
    .set(authHeader("admin-user"))
    .send({ name: "Core", colorHex: "#3366FF" });
  const teamId = String(teamRes.body.id);

  await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["alice", "bob"] });

  let messages = store.messagesBySession.get(sessionId) ?? [];
  let joins = messages.filter((m) => m.kind === "system_join");
  const joinedUserIds = joins.map((m) => m.user_id).sort();
  assert.deepEqual(joinedUserIds, ["admin-user", "alice", "bob"].sort());

  await request(app)
    .put(
      `/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members`,
    )
    .set(authHeader("admin-user"))
    .send({ userIds: ["alice"] });

  messages = store.messagesBySession.get(sessionId) ?? [];
  const leaves = messages.filter((m) => m.kind === "system_leave");
  assert.deepEqual(
    leaves.map((m) => m.user_id),
    ["bob"],
  );

  joins = messages.filter((m) => m.kind === "system_join");
  assert.equal(
    joins.length,
    3,
    "no extra joins should fire when alice stays on the team",
  );
});

test("message with invalid h3Cell is rejected", async () => {
  const createRes = await request(app)
    .post("/projects")
    .set(authHeader("admin-user"))
    .send({ organizationId: ORG_ID, name: "Invalid Cell Test", h3Resolution: 9, ...projectCityFields() });
  const projectId = String(createRes.body.id);
  const session = currentSessionFor(projectId);
  assert.ok(session);

  const sendRes = await request(app)
    .post("/sessions/message")
    .set(authHeader("admin-user"))
    .send({
      sessionId: session!.id,
      content: "bad cell",
      h3Cell: "not-an-h3-cell!!!",
    });
  assert.equal(sendRes.status, 400);
});
