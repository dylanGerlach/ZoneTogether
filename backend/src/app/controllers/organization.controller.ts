import type { Request, Response} from "express";
import { OrganizationService } from "../../db/organization.db.js";

export async function createOrganization(req: Request, res: Response) {
    const { name, description } = req.body;
    try {
        const organizationService = new OrganizationService(req.token as string);
        const organization = await organizationService.createOrganization(name, description);   
        if (!organization) {
            return res.status(400).json({ error: "Failed to create organization" });
        }
        await organizationService.joinOrganization(organization.id as string, req.user?.id as string, "owner");
        res.status(200).json(organization);
    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({ error: "Failed to create organization: " + error as string });
    }

}

export async function joinOrganization(req: Request, res: Response) {
    const { organizationId, role } = req.body;
    try {
        const organizationService = new OrganizationService(req.token as string);
        const organization = await organizationService.joinOrganization(organizationId, req.user?.id as string, role);
        res.status(200).json(organization);
    } catch (error) {
        res.status(500).json({ error: "Failed to join organization: " + error as string });
    }
}

export async function getOrganizationsById(req: Request, res: Response) {
    try {
        const organizationService = new OrganizationService(req.token as string);
        const all_user_organizations = await organizationService.getOrganizationsById(req.user?.id as string);
        return res.status(200).json({ organizations: all_user_organizations });
    } catch (error) {
        res.status(500).json({error: "Failed to fetch organizations by id: " + error});
    }
}

export async function getAllUsersInOrganization(req: Request, res: Response) {
    const { organizationId } = req.params;
    try {
        const organizationService = new OrganizationService(req.token as string);
        const allUsers = await organizationService.getAllUsersInOrganization(organizationId as string);
        res.status(200).json(allUsers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch all users in organization: " + error as string });
    }
}