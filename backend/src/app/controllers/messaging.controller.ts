import { MessagingDB } from "../../db/messaging.db.js";
import type { SessionMemberDiff } from "../../db/messaging.db.js";
import type { Request, Response } from "express";
import type {
  ApiErrorResponse,
  CreateMessageRequest,
  CreateMessageResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  GetMessagesResponse,
  GetSessionUsersResponse,
  GetUserSessionsResponse,
  Message,
  MessageSession,
  GetUserSessionsResponse as UserSessions,
  UUID,
} from "../../contracts/backend-api.types.js";

type MessagingDBLike = {
  createSession: (
    organizationId: UUID,
    title: string,
  ) => Promise<MessageSession | null>;
  createProjectSession: (
    projectId: UUID,
    organizationId: UUID,
    title: string,
  ) => Promise<MessageSession | null>;
  getProjectSession: (projectId: UUID) => Promise<MessageSession | null>;
  updateSessionTitle: (
    sessionId: UUID,
    title: string,
  ) => Promise<MessageSession | null>;
  addUserSession: (userId: UUID, messageSessionId: UUID) => Promise<unknown>;
  syncSessionMembers: (
    messageSessionId: UUID,
    userIds: UUID[],
  ) => Promise<SessionMemberDiff>;
  fetchAllUserSessions: (userId: UUID) => Promise<UserSessions>;
  fetchSessionUsers: (sessionId: UUID) => Promise<GetSessionUsersResponse>;
  fetchAllMessages: (sessionId: UUID) => Promise<GetMessagesResponse>;
  createMessage: (
    sessionId: UUID,
    userId: UUID,
    content: string,
    h3Cell?: string | null,
  ) => Promise<Message | null>;
  updateSessionPreview: (
    sessionId: UUID,
    message: string,
  ) => Promise<MessageSession | null>;
};

let createMessagingDB: (token: string) => MessagingDBLike = (token) =>
  new MessagingDB(token) as MessagingDBLike;

export function __setMessagingDBFactoryForTests(
  factory: ((token: string) => MessagingDBLike) | null,
) {
  createMessagingDB = factory ?? ((token) => new MessagingDB(token) as MessagingDBLike);
}

function getAuthContext(req: Request): { token: string; userId: UUID } | null {
  if (!req.token || !req.user?.id) return null;
  return { token: req.token, userId: req.user.id as UUID };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function createSession(
  req: Request<
    {},
    CreateSessionResponse | ApiErrorResponse,
    CreateSessionRequest
  >,
  res: Response<CreateSessionResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const organizationId = req.body?.organizationId;
  const title = req.body?.title?.trim();
  const users = Array.isArray(req.body?.users) ? req.body.users : [];

  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }
  if (!isNonEmptyString(title)) {
    return res.status(400).json({ error: "title is required" });
  }

  const uniqueUsers = new Set<UUID>();
  for (const userId of users) {
    if (isNonEmptyString(userId)) {
      uniqueUsers.add(userId);
    }
  }
  uniqueUsers.add(auth.userId);

  try {
    const messagingDB = createMessagingDB(auth.token);
    const session = await messagingDB.createSession(organizationId, title);
    if (!session) {
      return res.status(400).json({ error: "Failed to create session" });
    }

    await Promise.all(
      Array.from(uniqueUsers).map((userId) =>
        messagingDB.addUserSession(userId, session.id),
      ),
    );

    res.status(200).json(session);
  } catch (error) {
    console.error("Failed to create session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
}

export async function fetchAllUserSessions(
  req: Request,
  res: Response<GetUserSessionsResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  try {
    const messagingDB = createMessagingDB(auth.token);
    const sessions = await messagingDB.fetchAllUserSessions(auth.userId);
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
}

export async function createMessage(
  req: Request<
    {},
    CreateMessageResponse | ApiErrorResponse,
    CreateMessageRequest
  >,
  res: Response<CreateMessageResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const sessionId = req.body?.sessionId;
  const content = req.body?.content?.trim();
  const rawH3Cell = req.body?.h3Cell;
  if (!isNonEmptyString(sessionId)) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  if (!isNonEmptyString(content)) {
    return res.status(400).json({ error: "content is required" });
  }
  let h3Cell: string | undefined;
  if (rawH3Cell !== undefined && rawH3Cell !== null) {
    if (!isNonEmptyString(rawH3Cell)) {
      return res
        .status(400)
        .json({ error: "h3Cell must be a non-empty string when provided" });
    }
    const trimmed = rawH3Cell.trim();
    if (!/^[0-9a-fA-F]{5,20}$/.test(trimmed)) {
      return res.status(400).json({ error: "h3Cell is not a valid H3 cell index" });
    }
    h3Cell = trimmed;
  }

  try {
    const messagingDB = createMessagingDB(auth.token);
    const message = await messagingDB.createMessage(
      sessionId,
      auth.userId,
      content,
      h3Cell,
    );
    if (!message) {
      return res.status(400).json({ error: "Failed to create message" });
    }
    await messagingDB.updateSessionPreview(sessionId, content);
    res.status(200).json(message);
  } catch (error) {
    console.error("Failed to create message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
}

export async function fetchSessionUsers(
  req: Request<{ sessionId: UUID }>,
  res: Response<GetSessionUsersResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId } = req.params;
  if (!isNonEmptyString(sessionId)) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const messagingDB = createMessagingDB(auth.token);
    const users = await messagingDB.fetchSessionUsers(sessionId);
    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch session users:", error);
    res.status(500).json({ error: "Failed to fetch session users" });
  }
}

export async function fetchAllMessages(
  req: Request<{ sessionId: UUID }>,
  res: Response<GetMessagesResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId } = req.params;
  if (!isNonEmptyString(sessionId)) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const messagingDB = createMessagingDB(auth.token);
    const messages = await messagingDB.fetchAllMessages(sessionId);
    res.status(200).json(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}
