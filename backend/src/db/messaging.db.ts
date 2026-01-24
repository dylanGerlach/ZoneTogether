import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export class MessagingDB {
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

    async createSession(organizationId: string, title: string) {
        const { data, error } = await this.client
        .from('message_session')
        .insert({ organization_id: organizationId, title: title })
        .select()
        .single();

        if (error) throw error;
        return data;
    }

    async addUserSession(userId: string, messageSessionId: string) {
        const { data, error } = await this.client
        .from('message_session_users')
        .insert({ user_id: userId, message_session: messageSessionId });

        if (error) throw error;
        return data;
    }

    async fetchAllUserSessions(userId: string) {
        const { data, error } = await this.client
        .from('message_session_users')
        .select('*, message_session(*)')
        .eq('user_id', userId);

        if (error) throw error;
        return data;
    }

    async fetchAllMessages(sessionId: string) {
        const { data, error } = await this.client
        .from('message')
        .select('*, profiles(full_name)')
        .eq('message_session_id', sessionId)
        .order('timestamp', { ascending: true });

        if (error) throw error;
        return data.map(({ profiles, ...message }: any) => ({
            ...message,
            profile_id: profiles?.id,
            profile_full_name: profiles?.full_name,
        }));
    }

    async createMessage(sessionId: string, userId: string, content: string) {
        const { data, error } = await this.client
        .from('message')
        .insert({
            message_session_id: sessionId,
            user_id: userId,
            message: content,
            timestamp: new Date().toISOString()
        })
        .select()
        .single();

        if (error) throw error;
        return data;
    }

    async updateLastReadMessage(sessionId: string, message: string) {
        const {data, error} = await this.client
        .from('message_session')
        .update({ last_message_sent: message })
        .eq('id', sessionId)
        .select()
        .single();

        if (error) throw error;
        return data;
    }

}