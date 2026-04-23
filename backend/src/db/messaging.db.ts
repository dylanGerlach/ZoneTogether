import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type {
  CreateMessageResponse,
  CreateSessionResponse,
  GetMessagesResponse,
  GetSessionUsersResponse,
  GetUserSessionsResponse,
  ISODateString,
  MessageKind,
  MessageSession,
  MembershipRole,
  UUID,
} from "../contracts/backend-api.types.js";

export type SessionMemberDiff = {
  added: UUID[];
  removed: UUID[];
};
dotenv.config();

export class MessagingDB {
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

  async createSession(
    organizationId: UUID,
    title: string,
  ): Promise<CreateSessionResponse | null> {
    const { data, error } = await this.client
      .from("message_session")
      .insert({ organization_id: organizationId, title: title })
      .select()
      .single();

    if (error) throw error;
    return data as CreateSessionResponse | null;
  }

  async createProjectSession(
    projectId: UUID,
    organizationId: UUID,
    title: string,
  ): Promise<CreateSessionResponse | null> {
    const { data, error } = await this.client
      .from("message_session")
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        title,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CreateSessionResponse | null;
  }

  async getProjectSession(projectId: UUID): Promise<MessageSession | null> {
    const { data, error } = await this.client
      .from("message_session")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as MessageSession | null;
  }

  async updateSessionTitle(
    sessionId: UUID,
    title: string,
  ): Promise<MessageSession | null> {
    const { data, error } = await this.client
      .from("message_session")
      .update({ title })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data as MessageSession | null;
  }

  async addUserSession(userId: UUID, messageSessionId: UUID): Promise<unknown> {
    // message_session_users has no unique(user_id, message_session), so we
    // can't rely on ON CONFLICT. Check first, then insert if missing.
    const { data: existing, error: selectError } = await this.client
      .from("message_session_users")
      .select("id")
      .eq("message_session", messageSessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError) throw selectError;
    if (existing) return existing;

    const { data, error } = await this.client
      .from("message_session_users")
      .insert({ user_id: userId, message_session: messageSessionId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async syncSessionMembers(
    messageSessionId: UUID,
    userIds: UUID[],
  ): Promise<SessionMemberDiff> {
    const desired = new Set(userIds.filter((id) => typeof id === "string" && id.length > 0));

    const { data: existing, error: fetchError } = await this.client
      .from("message_session_users")
      .select("user_id")
      .eq("message_session", messageSessionId);

    if (fetchError) throw fetchError;

    const current = new Set(
      (existing ?? []).map((row: { user_id: UUID }) => row.user_id),
    );

    const added: UUID[] = [];
    for (const id of desired) {
      if (!current.has(id)) added.push(id);
    }

    const removed: UUID[] = [];
    for (const id of current) {
      if (!desired.has(id as UUID)) removed.push(id as UUID);
    }

    if (added.length > 0) {
      const { error: insertError } = await this.client
        .from("message_session_users")
        .insert(
          added.map((userId) => ({
            user_id: userId,
            message_session: messageSessionId,
          })),
        );
      if (insertError) throw insertError;
    }

    if (removed.length > 0) {
      const { error: deleteError } = await this.client
        .from("message_session_users")
        .delete()
        .eq("message_session", messageSessionId)
        .in("user_id", removed);
      if (deleteError) throw deleteError;
    }

    return { added, removed };
  }

  async fetchSessionUsers(sessionId: UUID): Promise<GetSessionUsersResponse> {
    // Note: message_session_users.user_id has no direct FK to public.profiles
    // (only to auth.users), so PostgREST cannot auto-embed profiles here.
    // Fetch memberships first, then resolve profile display names in a second
    // query.
    const { data: membershipRows, error: membershipError } = await this.client
      .from("message_session_users")
      .select("user_id, created_at")
      .eq("message_session", sessionId);

    if (membershipError) throw membershipError;

    const memberships = (membershipRows ?? []) as Array<{
      user_id: UUID;
      created_at?: ISODateString;
    }>;

    if (memberships.length === 0) return [];

    const userIds = Array.from(new Set(memberships.map((row) => row.user_id)));

    const { data: profileRows, error: profilesError } = await this.client
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    const profilesById = new Map<UUID, { id: UUID; full_name?: string }>();
    for (const row of (profileRows ?? []) as Array<{
      id: UUID;
      full_name?: string;
    }>) {
      profilesById.set(row.id, row);
    }

    return memberships.map(({ user_id, created_at }) => {
      const profile = profilesById.get(user_id);
      return {
        user_id,
        ...(created_at ? { created_at } : {}),
        ...(profile?.id ? { profile_id: profile.id } : {}),
        ...(profile?.full_name
          ? { profile_full_name: profile.full_name }
          : {}),
      };
    });
  }

  async fetchAllUserSessions(userId: UUID): Promise<GetUserSessionsResponse> {
    const { data, error } = await this.client
      .from("message_session_users")
      .select("*, message_session(*)")
      .eq("user_id", userId);

    if (error) throw error;
    const sessions = (data ?? []) as Array<{
      user_id: UUID;
      message_session: UUID | MessageSession | null;
      created_at?: ISODateString;
      role?: MembershipRole;
    }>;

    return sessions.map(({ role: _unusedRole, ...session }) => session);
  }

  async fetchAllMessages(sessionId: UUID): Promise<GetMessagesResponse> {
    const { data, error } = await this.client
      .from("message")
      .select("*, profiles(id, full_name)")
      .eq("message_session_id", sessionId)
      .order("timestamp", { ascending: true });

    if (error) throw error;
    const messages = (data ?? []) as Array<{
      id: UUID;
      message_session_id: UUID;
      user_id: UUID;
      message: string;
      timestamp: ISODateString;
      created_at?: ISODateString;
      updated_at?: ISODateString;
      h3_cell?: string | null;
      kind?: MessageKind | null;
      profiles: { id?: UUID; full_name?: string } | null;
    }>;

    return messages.map(({ profiles, kind, ...message }) => ({
      ...message,
      kind: (kind ?? "text") as MessageKind,
      ...(profiles?.id ? { profile_id: profiles.id } : {}),
      ...(profiles?.full_name ? { profile_full_name: profiles.full_name } : {}),
    }));
  }

  async createMessage(
    sessionId: UUID,
    userId: UUID,
    content: string,
    h3Cell?: string | null,
  ): Promise<CreateMessageResponse | null> {
    const payload: Record<string, unknown> = {
      message_session_id: sessionId,
      user_id: userId,
      message: content,
      kind: "text",
      timestamp: new Date().toISOString(),
    };
    if (typeof h3Cell === "string" && h3Cell.length > 0) {
      payload.h3_cell = h3Cell;
    }

    const { data, error } = await this.client
      .from("message")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as CreateMessageResponse | null;
  }

  async createSystemMessage(
    sessionId: UUID,
    userId: UUID,
    kind: Exclude<MessageKind, "text">,
  ): Promise<CreateMessageResponse | null> {
    const { data, error } = await this.client
      .from("message")
      .insert({
        message_session_id: sessionId,
        user_id: userId,
        message: "",
        kind,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as CreateMessageResponse | null;
  }

  async updateSessionPreview(
    sessionId: UUID,
    message: string,
  ): Promise<MessageSession | null> {
    const { data, error } = await this.client
      .from("message_session")
      .update({ last_message_sent: message })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data as MessageSession | null;
  }
}
