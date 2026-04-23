import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthSession,
  Message,
  MessageSession,
  SessionCreatePayload,
  SessionUser,
  UUID,
} from "../types";
import {
  createMessage,
  createSession,
  ensureProjectChatSession,
  fetchSessionMessages,
  fetchSessionUsers,
  fetchUserSessions,
} from "../utils/backendApi";

type MessageContextValue = {
  sessionsById: Record<UUID, MessageSession>;
  sessionIdsByOrg: Record<UUID, UUID[]>;
  messagesBySession: Record<UUID, Message[]>;
  membersBySession: Record<UUID, SessionUser[]>;
  sessionsLoading: boolean;
  sessionsError: string | null;
  messagesLoadingBySession: Record<UUID, boolean>;
  messagesErrorBySession: Record<UUID, string | null>;
  membersLoadingBySession: Record<UUID, boolean>;
  membersErrorBySession: Record<UUID, string | null>;
  sendingBySession: Record<UUID, boolean>;
  creatingConversation: boolean;
  createConversationError: string | null;

  loadSessions: (session: AuthSession) => Promise<MessageSession[]>;
  loadMessagesForSession: (
    session: AuthSession,
    sessionId: UUID,
  ) => Promise<Message[]>;
  loadMembersForSession: (
    session: AuthSession,
    sessionId: UUID,
  ) => Promise<SessionUser[]>;
  sendMessage: (
    session: AuthSession,
    sessionId: UUID,
    content: string,
    options?: { h3Cell?: string },
  ) => Promise<Message | null>;
  createConversation: (
    session: AuthSession,
    payload: SessionCreatePayload,
  ) => Promise<MessageSession | null>;
  ensureProjectSession: (
    session: AuthSession,
    projectId: UUID,
  ) => Promise<MessageSession | null>;

  getSessionsForOrganization: (organizationId: UUID) => MessageSession[];
  getSessionForProject: (projectId: UUID) => MessageSession | null;
  getSession: (sessionId: UUID) => MessageSession | null;
  getMessages: (sessionId: UUID) => Message[];
  getMembers: (sessionId: UUID) => SessionUser[];
  invalidateSession: (sessionId: UUID) => void;
  invalidateAll: () => void;
};

const MessageContext = createContext<MessageContextValue | undefined>(undefined);

function sessionActivityTimestamp(entry: MessageSession): number {
  const value = entry.updated_at ?? entry.created_at;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortSessionIdsByActivity(
  ids: UUID[],
  sessionsById: Record<UUID, MessageSession>,
): UUID[] {
  return [...ids].sort((a, b) => {
    const aEntry = sessionsById[a];
    const bEntry = sessionsById[b];
    if (!aEntry) return 1;
    if (!bEntry) return -1;
    return sessionActivityTimestamp(bEntry) - sessionActivityTimestamp(aEntry);
  });
}

export const MessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionsById, setSessionsById] = useState<Record<UUID, MessageSession>>({});
  const [sessionIdsByOrg, setSessionIdsByOrg] = useState<Record<UUID, UUID[]>>({});
  const [messagesBySession, setMessagesBySession] = useState<Record<UUID, Message[]>>({});
  const [membersBySession, setMembersBySession] = useState<
    Record<UUID, SessionUser[]>
  >({});
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [messagesLoadingBySession, setMessagesLoadingBySession] = useState<
    Record<UUID, boolean>
  >({});
  const [messagesErrorBySession, setMessagesErrorBySession] = useState<
    Record<UUID, string | null>
  >({});
  const [membersLoadingBySession, setMembersLoadingBySession] = useState<
    Record<UUID, boolean>
  >({});
  const [membersErrorBySession, setMembersErrorBySession] = useState<
    Record<UUID, string | null>
  >({});
  const [sendingBySession, setSendingBySession] = useState<Record<UUID, boolean>>({});
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [createConversationError, setCreateConversationError] = useState<string | null>(
    null,
  );

  const upsertSession = useCallback((entry: MessageSession) => {
    setSessionsById((previous) => {
      const nextById = { ...previous, [entry.id]: entry };
      setSessionIdsByOrg((previousOrg) => {
        const currentIds = previousOrg[entry.organization_id] ?? [];
        const withEntry = currentIds.includes(entry.id)
          ? currentIds
          : [...currentIds, entry.id];
        return {
          ...previousOrg,
          [entry.organization_id]: sortSessionIdsByActivity(withEntry, nextById),
        };
      });
      return nextById;
    });
  }, []);

  const loadSessions = useCallback(async (session: AuthSession) => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const response = await fetchUserSessions(session);
      const nextById: Record<UUID, MessageSession> = {};
      for (const entry of response) {
        const messageSession = entry.message_session;
        if (!messageSession || typeof messageSession === "string") continue;
        nextById[messageSession.id] = messageSession;
      }
      const nextByOrg: Record<UUID, UUID[]> = {};
      for (const entry of Object.values(nextById)) {
        const bucket = nextByOrg[entry.organization_id] ?? [];
        bucket.push(entry.id);
        nextByOrg[entry.organization_id] = bucket;
      }
      for (const orgId of Object.keys(nextByOrg)) {
        nextByOrg[orgId] = sortSessionIdsByActivity(nextByOrg[orgId], nextById);
      }
      setSessionsById(nextById);
      setSessionIdsByOrg(nextByOrg);
      return Object.values(nextById);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load conversations.";
      setSessionsError(message);
      return [];
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadMessagesForSession = useCallback(
    async (session: AuthSession, sessionId: UUID) => {
      setMessagesLoadingBySession((previous) => ({ ...previous, [sessionId]: true }));
      setMessagesErrorBySession((previous) => ({ ...previous, [sessionId]: null }));
      try {
        const response = await fetchSessionMessages(session, sessionId);
        setMessagesBySession((previous) => ({ ...previous, [sessionId]: response }));
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load messages.";
        setMessagesErrorBySession((previous) => ({ ...previous, [sessionId]: message }));
        return [];
      } finally {
        setMessagesLoadingBySession((previous) => ({ ...previous, [sessionId]: false }));
      }
    },
    [],
  );

  const loadMembersForSession = useCallback(
    async (session: AuthSession, sessionId: UUID) => {
      setMembersLoadingBySession((previous) => ({ ...previous, [sessionId]: true }));
      setMembersErrorBySession((previous) => ({ ...previous, [sessionId]: null }));
      try {
        const response = await fetchSessionUsers(session, sessionId);
        setMembersBySession((previous) => ({ ...previous, [sessionId]: response }));
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load members.";
        setMembersErrorBySession((previous) => ({ ...previous, [sessionId]: message }));
        return [];
      } finally {
        setMembersLoadingBySession((previous) => ({ ...previous, [sessionId]: false }));
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (
      session: AuthSession,
      sessionId: UUID,
      content: string,
      options?: { h3Cell?: string },
    ) => {
      setSendingBySession((previous) => ({ ...previous, [sessionId]: true }));
      setMessagesErrorBySession((previous) => ({ ...previous, [sessionId]: null }));
      try {
        const created = await createMessage(session, {
          sessionId,
          content,
          ...(options?.h3Cell ? { h3Cell: options.h3Cell } : {}),
        });
        setMessagesBySession((previous) => ({
          ...previous,
          [sessionId]: [...(previous[sessionId] ?? []), created],
        }));
        setSessionsById((previous) => {
          const existing = previous[sessionId];
          if (!existing) return previous;
          const patched: MessageSession = {
            ...existing,
            last_message_sent: created.message,
            updated_at: created.timestamp,
          };
          const nextById = { ...previous, [sessionId]: patched };
          setSessionIdsByOrg((previousOrg) => {
            const ids = previousOrg[existing.organization_id] ?? [];
            return {
              ...previousOrg,
              [existing.organization_id]: sortSessionIdsByActivity(ids, nextById),
            };
          });
          return nextById;
        });
        return created;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to send message.";
        setMessagesErrorBySession((previous) => ({ ...previous, [sessionId]: message }));
        return null;
      } finally {
        setSendingBySession((previous) => ({ ...previous, [sessionId]: false }));
      }
    },
    [],
  );

  const createConversation = useCallback(
    async (session: AuthSession, payload: SessionCreatePayload) => {
      setCreatingConversation(true);
      setCreateConversationError(null);
      try {
        const created = await createSession(session, payload);
        upsertSession(created);
        return created;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to create conversation.";
        setCreateConversationError(message);
        return null;
      } finally {
        setCreatingConversation(false);
      }
    },
    [upsertSession],
  );

  const ensureProjectSession = useCallback(
    async (session: AuthSession, projectId: UUID) => {
      try {
        const entry = await ensureProjectChatSession(session, projectId);
        upsertSession(entry);
        return entry;
      } catch (error) {
        console.error("Failed to ensure project chat session", error);
        return null;
      }
    },
    [upsertSession],
  );

  const getSessionsForOrganization = useCallback(
    (organizationId: UUID): MessageSession[] => {
      const ids = sessionIdsByOrg[organizationId] ?? [];
      const result: MessageSession[] = [];
      for (const id of ids) {
        const entry = sessionsById[id];
        if (entry) result.push(entry);
      }
      return result;
    },
    [sessionIdsByOrg, sessionsById],
  );

  const getSessionForProject = useCallback(
    (projectId: UUID): MessageSession | null => {
      for (const entry of Object.values(sessionsById)) {
        if (entry.project_id && entry.project_id === projectId) return entry;
      }
      return null;
    },
    [sessionsById],
  );

  const getSession = useCallback(
    (sessionId: UUID) => sessionsById[sessionId] ?? null,
    [sessionsById],
  );

  const getMessages = useCallback(
    (sessionId: UUID) => messagesBySession[sessionId] ?? [],
    [messagesBySession],
  );

  const getMembers = useCallback(
    (sessionId: UUID) => membersBySession[sessionId] ?? [],
    [membersBySession],
  );

  const invalidateSession = useCallback((sessionId: UUID) => {
    setMessagesBySession((previous) => {
      const { [sessionId]: _removed, ...rest } = previous;
      return rest;
    });
    setMessagesErrorBySession((previous) => ({ ...previous, [sessionId]: null }));
    setMembersBySession((previous) => {
      const { [sessionId]: _removed, ...rest } = previous;
      return rest;
    });
    setMembersErrorBySession((previous) => ({ ...previous, [sessionId]: null }));
  }, []);

  const invalidateAll = useCallback(() => {
    setSessionsById({});
    setSessionIdsByOrg({});
    setMessagesBySession({});
    setMembersBySession({});
    setSessionsError(null);
    setMessagesLoadingBySession({});
    setMessagesErrorBySession({});
    setMembersLoadingBySession({});
    setMembersErrorBySession({});
    setSendingBySession({});
    setCreateConversationError(null);
  }, []);

  const value = useMemo<MessageContextValue>(
    () => ({
      sessionsById,
      sessionIdsByOrg,
      messagesBySession,
      membersBySession,
      sessionsLoading,
      sessionsError,
      messagesLoadingBySession,
      messagesErrorBySession,
      membersLoadingBySession,
      membersErrorBySession,
      sendingBySession,
      creatingConversation,
      createConversationError,
      loadSessions,
      loadMessagesForSession,
      loadMembersForSession,
      sendMessage,
      createConversation,
      ensureProjectSession,
      getSessionsForOrganization,
      getSessionForProject,
      getSession,
      getMessages,
      getMembers,
      invalidateSession,
      invalidateAll,
    }),
    [
      sessionsById,
      sessionIdsByOrg,
      messagesBySession,
      membersBySession,
      sessionsLoading,
      sessionsError,
      messagesLoadingBySession,
      messagesErrorBySession,
      membersLoadingBySession,
      membersErrorBySession,
      sendingBySession,
      creatingConversation,
      createConversationError,
      loadSessions,
      loadMessagesForSession,
      loadMembersForSession,
      sendMessage,
      createConversation,
      ensureProjectSession,
      getSessionsForOrganization,
      getSessionForProject,
      getSession,
      getMessages,
      getMembers,
      invalidateSession,
      invalidateAll,
    ],
  );

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

export function useMessageContext(): MessageContextValue {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
}
