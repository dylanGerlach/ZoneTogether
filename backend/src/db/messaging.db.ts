import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type {
  CreateMessageResponse,
  CreateSessionResponse,
  GetMessagesResponse,
  GetUserSessionsResponse,
  ISODateString,
  MessageSession,
  MembershipRole,
  UUID,
} from "../contracts/backend-api.types.js";
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

  async addUserSession(userId: UUID, messageSessionId: UUID): Promise<unknown> {
    const { data, error } = await this.client
      .from("message_session_users")
      .upsert(
        { user_id: userId, message_session: messageSessionId },
        { onConflict: "user_id,message_session", ignoreDuplicates: true },
      );

    if (error) throw error;
    return data;
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
      profiles: { id?: UUID; full_name?: string } | null;
    }>;

    return messages.map(({ profiles, ...message }) => ({
      ...message,
      ...(profiles?.id ? { profile_id: profiles.id } : {}),
      ...(profiles?.full_name ? { profile_full_name: profiles.full_name } : {}),
    }));
  }

  async createMessage(
    sessionId: UUID,
    userId: UUID,
    content: string,
  ): Promise<CreateMessageResponse | null> {
    const { data, error } = await this.client
      .from("message")
      .insert({
        message_session_id: sessionId,
        user_id: userId,
        message: content,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as CreateMessageResponse | null;
  }

  async updateLastReadMessage(
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
