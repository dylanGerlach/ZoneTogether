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
  UUID,
} from "../../contracts/backend-api.types.js";

function getAuthContext(req: Request): { token: string; userId: UUID } | null {
  if (!req.token || !req.user?.id) return null;
  return { token: req.token, userId: req.user.id as UUID };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
  if (!isNonEmptyString(organizationId)) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const organizationService = new OrganizationService(auth.token);
    const allUsers = await organizationService.getAllUsersInOrganization(
      organizationId
    );
    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Failed to fetch users in organization:", error);
    res.status(500).json({ error: "Failed to fetch all users in organization" });
  }
}