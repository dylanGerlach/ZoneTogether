import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { test } from "../controllers/auth.controller.js";

const router = express.Router();

router.get('/test', requireAuth, test);

export default router;