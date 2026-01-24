import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createSession, fetchAllUserSessions, createMessage, fetchAllMessages } from "../controllers/messaging.controller.js";

const router = express.Router();

router.post('/', requireAuth, createSession);
router.get('/', requireAuth, fetchAllUserSessions);
router.post('/message', requireAuth, createMessage);
router.get('/:sessionId', requireAuth, fetchAllMessages);
export default router;