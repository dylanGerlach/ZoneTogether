import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type {
  CreateOrganizationResponse,
  GetOrganizationUsersResponse,
  JoinOrganizationResponse,
  MembershipRole,
  OrganizationMembership,
  UUID,
} from "../contracts/backend-api.types.js";
dotenv.config();

export class OrganizationService {
  private client: any;

  constructor(token: string) {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );
  }

  async createOrganization(
    name: string,
    description: string,
  ): Promise<CreateOrganizationResponse | null> {
    const { data, error } = await this.client
      .from("organization")
      .insert({ name, description })
      .select("id")
      .single();

    if (error) throw error;
    return data as CreateOrganizationResponse | null;
  }

  async joinOrganization(
    organizationId: UUID,
    userId: UUID,
    role: MembershipRole = "member",
  ): Promise<JoinOrganizationResponse> {
    const { data, error } = await this.client
      .from("organization_members")
      .upsert(
        { organization_id: organizationId, user_id: userId, role },
        { onConflict: "organization_id,user_id" },
      )
      .select("organization_id, user_id, role")
      .single();

    if (error) throw error;
    return data as JoinOrganizationResponse;
  }

  async getOrganizationsById(userId: UUID): Promise<OrganizationMembership[]> {
    const { data, error } = await this.client
      .from("organization_members")
      .select("organization_id, role, organization(name, description)")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as OrganizationMembership[];
  }

  async getAllUsersInOrganization(
    organizationId: UUID,
  ): Promise<GetOrganizationUsersResponse> {
    const { data, error } = await this.client
      .from("organization_members")
      .select("user_id, role, profiles(id, full_name)")
      .eq("organization_id", organizationId);
    if (error) throw error;
    const members = (data ?? []) as Array<{
      user_id: UUID;
      role: MembershipRole;
      profiles: { id?: UUID; full_name?: string } | null;
    }>;

    return members.map(({ profiles, ...organizationMember }) => ({
      ...organizationMember,
      ...(profiles?.id ? { profile_id: profiles.id } : {}),
      ...(profiles?.full_name ? { profile_full_name: profiles.full_name } : {}),
    }));
  }
}
