import type { Request, Response } from "express";
import { OrganizationService } from "../../db/organization.db.js";
import type {
  ApiErrorResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  GetOrganizationsResponse,
  GetOrganizationUsersResponse,
  JoinOrganizationRequest,
  JoinOrganizationResponse,
  MembershipRole,
  OrganizationInvite,
  OrganizationUser,
  UUID,
} from "../../contracts/backend-api.types.js";

function getAuthContext(req: Request): { token: string; userId: UUID } | null {
  if (!req.token || !req.user?.id) return null;
  return { token: req.token, userId: req.user.id as UUID };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isMembershipRole(value: unknown): value is MembershipRole {
  return value === "owner" || value === "admin" || value === "member";
}

function isAdminRole(role: MembershipRole | null): boolean {
  return role === "owner" || role === "admin";
}

export async function createOrganization(
  req: Request<{}, CreateOrganizationResponse | ApiErrorResponse, CreateOrganizationRequest>,
  res: Response<CreateOrganizationResponse | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const name = req.body?.name?.trim();
  const description = req.body?.description?.trim() ?? "";
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Organization name is required" });
  }

  try {
    const organizationService = new OrganizationService(auth.token);
    const organization = await organizationService.createOrganization(name, description);
    if (!organization) {
      return res.status(400).json({ error: "Failed to create organization" });
    }
    await organizationService.joinOrganization(organization.id, auth.userId, "owner");
    res.status(200).json(organization);
  } catch (error) {
    console.error("Failed to create organization:", error);
    res.status(500).json({ error: "Failed to create organization" });
  }
}

export async function joinOrganization(
  req: Request<{}, JoinOrganizationResponse | ApiErrorResponse, JoinOrganizationRequest>,
  res: Response<JoinOrganizationResponse | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { organizationId } = req.body;
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const organizationService = new OrganizationService(auth.token);
    const organization = await organizationService.joinOrganization(
      organizationId,
      auth.userId,
      "member",
    );
    res.status(200).json(organization);
  } catch (error) {
    console.error("Failed to join organization:", error);
    res.status(500).json({ error: "Failed to join organization" });
  }
}

export async function getOrganizationsById(
  req: Request,
  res: Response<GetOrganizationsResponse | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  try {
    const organizationService = new OrganizationService(auth.token);
    const allUserOrganizations = await organizationService.getOrganizationsById(
      auth.userId
    );
    return res.status(200).json({ organizations: allUserOrganizations });
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    res.status(500).json({ error: "Failed to fetch organizations by id" });
  }
}

export async function getAllUsersInOrganization(
  req: Request<{ organizationId: UUID }>,
  res: Response<GetOrganizationUsersResponse | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { organizationId } = req.params;
  const { search } = req.query;
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const organizationService = new OrganizationService(auth.token);
    const allUsers = await organizationService.getAllUsersInOrganization(
      organizationId,
      search as string | undefined
    );
    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Failed to fetch users in organization:", error);
    res.status(500).json({ error: "Failed to fetch all users in organization" });
  }
}

export async function getOrganizationInviteCandidates(
  req: Request<{ organizationId: UUID }, { users: OrganizationUser[] } | ApiErrorResponse>,
  res: Response<{ users: OrganizationUser[] } | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { organizationId } = req.params;
  const { search } = req.query;
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const organizationService = new OrganizationService(auth.token);
    const requesterRole = await organizationService.getOrganizationRole(organizationId, auth.userId);
    if (!requesterRole) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const users = await organizationService.listInviteCandidates(
      organizationId,
      typeof search === "string" ? search : undefined,
    );
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Failed to fetch organization invite candidates:", error);
    return res.status(500).json({ error: "Failed to fetch organization invite candidates" });
  }
}

export async function inviteOrganizationUser(
  req: Request<
    { organizationId: UUID },
    JoinOrganizationResponse | ApiErrorResponse,
    { userId?: UUID; role?: MembershipRole }
  >,
  res: Response<JoinOrganizationResponse | ApiErrorResponse>,
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { organizationId } = req.params;
  const { userId, role } = req.body ?? {};
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }
  if (!isNonEmptyString(userId)) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (role !== undefined && !isMembershipRole(role)) {
    return res.status(400).json({ error: "role must be owner, admin, or member" });
  }
  if (role === "owner") {
    return res.status(400).json({ error: "Invites cannot assign owner role" });
  }

  const targetRole: MembershipRole = role ?? "member";

  try {
    const organizationService = new OrganizationService(auth.token);
    const requesterRole = await organizationService.getOrganizationRole(organizationId, auth.userId);
    if (!requesterRole) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (targetRole === "admin" && !isAdminRole(requesterRole)) {
      return res.status(403).json({ error: "Only owners/admins can assign admin role" });
    }

    const member = await organizationService.inviteUserToOrganization(
      organizationId,
      userId,
      targetRole,
    );
    return res.status(200).json(member);
  } catch (error) {
    console.error("Failed to invite organization user:", error);
    return res.status(500).json({ error: "Failed to invite user to organization" });
  }
}

export async function createInvite(
  req: Request<{ organizationId: UUID }, {}, { email: string, role: MembershipRole }>,
  res: Response<void | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { organizationId } = req.params;
  const { email, role } = req.body;
  if (!isNonEmptyString(email) || !isNonEmptyString(role)) {
    return res.status(400).json({ error: "email and role are required" });
  }

  try {
    const organizationService = new OrganizationService(auth.token);
    await organizationService.createInvite(organizationId, email, auth.userId, role);
    res.status(200).json();
  } catch (error) {
    console.error("Failed to create invite:", error);
    res.status(500).json({ error: "Failed to create invite" });
  }
}

export async function fetchInvites(
  req: Request<{ userId: UUID }>,
  res: Response<OrganizationInvite[] | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  try {
    const organizationService = new OrganizationService(auth.token);
    const invites = await organizationService.fetchInvites(auth.userId);
    res.status(200).json(invites);
  } catch (error) {
    console.error("Failed to fetch invites:", error);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
}

export async function handleInviteAction(
  req: Request<{ inviteId: UUID }, void | ApiErrorResponse, { action: "accept" | "reject", organizationId: UUID, role: MembershipRole }>,
  res: Response<void | ApiErrorResponse>
) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { inviteId } = req.params;
  const { action, organizationId, role} = req.body;
  if (!isNonEmptyString(inviteId) || !isNonEmptyString(action)) {
    return res.status(400).json({ error: "inviteId and action are required" });
  }
  const organizationService = new OrganizationService(auth.token);
  if (action === "accept") {
    await organizationService.joinOrganization(organizationId, auth.userId, role);
    await organizationService.deleteInvite(inviteId);
  } else {
    await organizationService.deleteInvite(inviteId);
  }
  res.status(200).json();
}
