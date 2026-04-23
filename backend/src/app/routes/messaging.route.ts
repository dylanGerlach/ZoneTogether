import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createMessage,
  createSession,
  fetchAllMessages,
  fetchAllUserSessions,
  fetchSessionUsers,
} from "../controllers/messaging.controller.js";

const router = express.Router();

router.post('/', requireAuth, createSession);
router.get('/', requireAuth, fetchAllUserSessions);
router.post('/message', requireAuth, createMessage);
router.get('/:sessionId/users', requireAuth, fetchSessionUsers);
router.get('/:sessionId', requireAuth, fetchAllMessages);
export default router;