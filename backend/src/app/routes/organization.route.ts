import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createOrganization, getOrganizationsById, joinOrganization } from "../controllers/organization.controller.js";

const router = express.Router();

router.post('/', requireAuth, createOrganization);
router.post('/member', requireAuth, joinOrganization);
router.get('/', requireAuth, getOrganizationsById);

export default router;