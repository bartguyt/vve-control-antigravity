import { supabase } from '../../lib/supabase';
import type { VvE } from '../../types/database';

export interface AdminStats {
    totalVves: number;
    totalUsers: number; // Placeholder for now
    activeLoginsLast30Days: number; // Placeholder
}


export interface AdminUser {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
    is_super_admin: boolean;
    vve_memberships?: {
        id: string;
        role: string;
        vve_id: string;
        vves?: {
            id: string;
            name: string;
        };
    }[];
}

export const adminService = {
    /**
     * Fetches all VvEs. 
     * Only works if the user is a Super Admin (RLS policy handles this).
     */
    async getAllVves() {
        // ... (existing)
        const { data, error } = await supabase
            .from('vves')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as VvE[];
    },

    /**
     * Fetches all Users with their memberships.
     */
    async getAllUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                vve_memberships (
                    id,
                    role,
                    vve_id,
                    vves (
                        id,
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as AdminUser[];
    },

    /**
     * Updates a membership role.
     */
    async updateMembershipRole(membershipId: string, newRole: string) {
        const { error } = await supabase
            .from('vve_memberships')
            .update({ role: newRole })
            .eq('id', membershipId);

        if (error) throw error;
    },

    /**
     * Fetches dashboard statistics.
     * Currently mocked or partially real depending on available tables.
     */
    async getStats(): Promise<AdminStats> {
        // ... (existing)
        // Real count of VvEs
        const { count: vveCount, error: vveError } = await supabase
            .from('vves')
            .select('*', { count: 'exact', head: true });

        if (vveError) throw vveError;

        // Real count of Users (Profiles)
        // Note: This requires RLS allowing Super Admin to read all profiles
        const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (userError) throw userError;

        // Real count of Logins (Activity) in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: loginCount, error: loginError } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('action_type', 'login')
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (loginError) console.error('Error fetching login stats:', loginError);

        return {
            totalVves: vveCount || 0,
            totalUsers: userCount || 0,
            activeLoginsLast30Days: loginCount || 0,
        };
    }
};
