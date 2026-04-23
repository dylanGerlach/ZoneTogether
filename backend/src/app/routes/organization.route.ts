import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createOrganization,
  getAllUsersInOrganization,
  getOrganizationInviteCandidates,
  getOrganizationsById,
  inviteOrganizationUser,
  joinOrganization,
} from "../controllers/organization.controller.js";

const router = express.Router();

router.post('/', requireAuth, createOrganization);
router.post('/member', requireAuth, joinOrganization);
router.get('/', requireAuth, getOrganizationsById);
router.get('/:organizationId/users', requireAuth, getAllUsersInOrganization);
router.get('/:organizationId/invite-candidates', requireAuth, getOrganizationInviteCandidates);
router.post('/:organizationId/invite', requireAuth, inviteOrganizationUser);

export default router;