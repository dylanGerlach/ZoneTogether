import { MessagingDB } from "../../db/messaging.db.js"
import type { Request, Response} from "express";

export async function createSession(req: Request, res: Response) {
    const { organizationId, users, title } = req.body;
    try {
        const messagingDB = new MessagingDB(req.token as string);
        const session = await messagingDB.createSession(organizationId, title);
        if (!session) {
            return res.status(400).json({ error: "Failed to create session" });
        }
        for (const user of users) {
            await messagingDB.addUserSession(user, session.id);
        }
        res.status(200).json(session);
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ error: "Failed to create organization: " + error as string });
    }
}

export async function fetchAllUserSessions(req: Request, res: Response) {
    try {
        const messagingDB = new MessagingDB(req.token as string);
        const sessions = await messagingDB.fetchAllUserSessions(req.user?.id as string);
        res.status(200).json(sessions);
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ error: "Failed to fetch sessions: " + error as string });
    }
}

export async function createMessage(req: Request, res: Response) {
    const { sessionId, content } = req.body;

    try {
        const messagingDB = new MessagingDB(req.token as string);
        const message = await messagingDB.createMessage(sessionId, req.user?.id as string, content);
        await messagingDB.updateLastReadMessage(sessionId, content);
        res.status(200).json(message);
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ error: "Failed to fetch sessions: " + error as string });
    }
}

export async function fetchAllMessages(req: Request, res: Response) {
    const { sessionId } = req.params;
    try {
        const messagingDB = new MessagingDB(req.token as string);
        const messages = await messagingDB.fetchAllMessages(sessionId as string);
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ error: "Failed to fetch messages: " + error as string });
    }
}