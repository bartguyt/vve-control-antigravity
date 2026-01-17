import { supabase } from '../../lib/supabase';
import type { Association } from '../../types/database';

export interface AdminStats {
    totalAssociations: number;
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
    association_memberships?: {
        id: string;
        role: string;
        association_id: string;
        associations?: {
            id: string;
            name: string;
        };
    }[];
}

export const adminService = {
    /**
     * Fetches all Associations. 
     * Only works if the user is a Super Admin (RLS policy handles this).
     */
    async getAllAssociations() {
        // ... (existing)
        const { data, error } = await supabase
            .from('associations')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as Association[];
    },

    /**
     * Fetches all Users with their memberships.
     */
    async getAllUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                association_memberships (
                    id,
                    role,
                    association_id,
                    associations (
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
            .from('association_memberships')
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
        // Real count of Associations
        const { count: associationCount, error: associationError } = await supabase
            .from('associations')
            .select('*', { count: 'exact', head: true });

        if (associationError) throw associationError;

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
            totalAssociations: associationCount || 0,
            totalUsers: userCount || 0,
            activeLoginsLast30Days: loginCount || 0,
        };
    }
};
