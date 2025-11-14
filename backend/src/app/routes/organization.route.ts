import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createOrganization, getOrganizationsById } from "../controllers/organization.controller.js";

const router = express.Router();

router.post('/', requireAuth, createOrganization);
router.get('/', requireAuth, getOrganizationsById);

export default router;