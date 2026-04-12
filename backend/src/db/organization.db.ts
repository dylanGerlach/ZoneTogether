import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type {
  CreateOrganizationResponse,
  GetOrganizationUsersResponse,
  JoinOrganizationResponse,
  MembershipRole,
  OrganizationMembership,
  OrganizationInvite,
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

    if (!error) return data as JoinOrganizationResponse;

    // Fallback for DBs that do not have a unique constraint on
    // (organization_id, user_id), which is required by ON CONFLICT.
    if (error.code !== "42P10") throw error;

    const { data: existing, error: existingError } = await this.client
      .from("organization_members")
      .select("organization_id, user_id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { data: updated, error: updateError } = await this.client
        .from("organization_members")
        .update({ role })
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .select("organization_id, user_id, role")
        .single();

      if (updateError) throw updateError;
      return updated as JoinOrganizationResponse;
    }

    const { data: inserted, error: insertError } = await this.client
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: userId, role })
      .select("organization_id, user_id, role")
      .single();

    if (insertError) throw insertError;
    return inserted as JoinOrganizationResponse;
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
    search?: string,
  ): Promise<GetOrganizationUsersResponse> {
    let query= this.client
      .from("organization_members")
      .select("user_id, role, profiles!inner(id, full_name)")
      .eq("organization_id", organizationId)
    if (search) {
      query = query.ilike("profiles.full_name", `%${search ?? ""}%`);
    }
    const { data, error } = await query;
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

  async createInvite(organizationId: UUID, email: string, inviter: UUID, role: MembershipRole): Promise<void> {
    const { data, error } = await this.client
      .from("organization_invites")
      .insert({ organization_id: organizationId, email: email, inviter: inviter, role: role})
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async fetchInvites(userId: UUID): Promise<OrganizationInvite[]> {
    const { data: profile } = await this.client.from("profiles").select("email").eq("id", userId).single();
    if (!profile) throw new Error("Profile not found");

    const { data, error } = await this.client
      .from("organization_invites")
      .select("id, organization_id, email, inviter, role, created_at, organization(name, description), profiles(id, full_name)")
      .eq("email", profile.email);
    if (error) throw error;
    return data as OrganizationInvite[];
  }

  async deleteInvite(inviteId: UUID): Promise<void> {
    const { error } = await this.client
      .from("organization_invites")
      .delete()
      .eq("id", inviteId);
    if (error) throw error;
  }

}
