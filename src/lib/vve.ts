import { supabase } from './supabase';
import type { Profile } from '../types/database';

export const vveService = {
    /**
     * Gets the full profile of the current authenticated user, including memberships.
     */
    async getCurrentProfile(): Promise<Profile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                vve_memberships!fk_memberships_profiles_userid (
                    id,
                    role,
                    vve_id,
                    vves (
                        id,
                        name
                    )
                )
            `)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data as Profile;
    },

    /**
     * Gets the current user's VvE ID from their profile or memberships.
     * This is the standardized way to fetch the VvE context.
     */
    async getCurrentVveId(): Promise<string> {
        const profile = await this.getCurrentProfile();
        if (!profile) throw new Error('Not authenticated');

        // 1. Try profile first (cached/primary VvE)
        if (profile.vve_id) return profile.vve_id;

        // 2. Try memberships if profile field is missing
        const membership = profile.vve_memberships?.[0];
        if (membership?.vve_id) {
            const vveId = membership.vve_id;
            // "Heal" the profile if it's missing vve_id for better performance next time
            await supabase.from('profiles').update({ vve_id: vveId }).eq('id', profile.id);
            return vveId;
        }

        throw new Error('No VvE found for the current user.');
    }
};
