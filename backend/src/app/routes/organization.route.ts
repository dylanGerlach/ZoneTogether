import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createInvite, createOrganization, fetchInvites, getAllUsersInOrganization, getOrganizationsById, handleInviteAction, joinOrganization, } from "../controllers/organization.controller.js";

const router = express.Router();

router.post('/', requireAuth, createOrganization);
router.post('/member', requireAuth, joinOrganization);
router.get('/', requireAuth, getOrganizationsById);
router.get('/:organizationId/users', requireAuth, getAllUsersInOrganization);
router.post('/:organizationId/invite', requireAuth, createInvite);
router.get('/invites', requireAuth, fetchInvites);
router.post('/invites/:inviteId', requireAuth, handleInviteAction);
export default router;