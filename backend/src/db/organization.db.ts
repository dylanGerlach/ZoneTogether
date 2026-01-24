import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export class OrganizationService {
  private client: any;

  constructor(token: string) {
    this.client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
  }

  async createOrganization(name: string, description: string) {
    const { data, error } = await this.client
      .from('organization')
      .insert({ name, description })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async joinOrganization(organizationId: string, userId: string, role: string) {
    const { data, error } = await this.client
      .from('organization_members')
      .insert({ organization_id: organizationId, user_id: userId, role: role});

    if (error) throw error;
    return data;
  }

  async getOrganizationsById(userId: string) {
    const { data, error } = await this.client
    .from('organization_members')
    .select('organization_id, role, organization(name, description)')
    .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  async getAllUsersInOrganization(organizationId: string) {
    const { data, error } = await this.client
    .from('organization_members')
    .select('user_id, role, profiles(full_name)')
    .eq('organization_id', organizationId);
    if (error) throw error;
    return data.map(({ profiles, ...organizationMember }: any) => ({
        ...organizationMember,
        profile_id: profiles?.id,
        profile_full_name: profiles?.full_name,
    }));
  }

}