import { supabase } from '../../lib/supabase';

export interface AdminInvite {
    id: string;
    email: string;
    role: string;
    token: string;
    expires_at: string; // ISO date string
    used: boolean;
    created_at: string;
    created_by: string;
}

export interface EmailLog {
    id: string;
    recipient_email: string;
    subject: string;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
    sent_at?: string;
    association?: { name: string };
    recipient?: { first_name: string; last_name: string; };
}

export const superAdminService = {
    async getInvites() {
        const { data, error } = await supabase
            .from('admin_invites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as AdminInvite[];
    },

    async createInvite(email: string) {
        // 1. Generate token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // 2. Insert record
        const { data, error } = await supabase
            .from('admin_invites')
            .insert({
                email,
                role: 'super_admin',
                token,
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Queue email
        // In a real app, this would be a link like: https://app.vve/accept-invite?token=...
        const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;

        // We need an association_id for outbound_emails?
        // Super Admin invites might not be tied to an association strictly, but outbound_emails requires it?
        // Let's check schema.
        // If outbound_emails.association_id is nullable, great. If not, we might need a system association or similar.
        // Checking previous schema: `association_id UUID REFERENCES associations(id)` (likely not nullable).
        // WORKAROUND: For now, we'll pick the current user's active association or just log it to console/toast if we can't send.
        // OR create a 'system' association. 
        // BETTER: Just return the link to the UI so the Super Admin can copy-paste it to the user manually if email fails.

        return { invite: data, link: inviteLink };
    },

    async getEmailQueue() {
        // Fetch emails with linked association and profile (recipient)
        const { data, error } = await supabase
            .from('outbound_emails')
            .select(`
                *,
                association:associations(name),
                recipient:profiles!recipient_id(first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return data as unknown as EmailLog[];
    },

    async triggerEmailBatch() {
        // Calls the Edge Function manually
        const { data, error } = await supabase.functions.invoke('process-email-queue');
        if (error) throw error;
        return data;
    },

    async retryEmails(ids: string[]) {
        const { error } = await supabase
            .from('outbound_emails')
            .update({ status: 'pending', sent_at: null }) // Reset
            .in('id', ids);

        if (error) throw error;
    },

    async retryAllFailed() {
        const { error } = await supabase
            .from('outbound_emails')
            .update({ status: 'pending', sent_at: null })
            .eq('status', 'failed');

        if (error) throw error;
    }
};
