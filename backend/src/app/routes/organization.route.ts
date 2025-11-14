import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createOrganization } from "../controllers/organization.controller.js";

const router = express.Router();

router.post('/', requireAuth, createOrganization);

export default router;