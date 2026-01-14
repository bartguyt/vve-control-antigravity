import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import { activityService } from '../../services/activityService';

export const memberService = {
    async getMembers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('lid_nummer', { ascending: true });

        if (error) throw error;
        return data as Profile[];
    },

    async createMemberProfile(profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'vve_id'>) {
        // 1. Get current user's VvE ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // We can use the rpc call to get our VvE ID safely, or just fetch our own profile
        const { data: myProfile, error: profileError } = await supabase
            .from('profiles')
            .select('vve_id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !myProfile) throw new Error('Could not fetch your VvE ID');

        // 2. Insert new profile
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                ...profileData,
                vve_id: myProfile.vve_id,
                // user_id is left NULL initially (unclaimed profile)
            })
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await activityService.logActivity({
            action: 'create',
            targetType: 'member',
            targetId: data.id,
            description: `Lid toegevoegd: ${data.straat} ${data.huisnummer}`
        });

        return data as Profile;
    },

    async updateMember(id: string, updates: Partial<Profile>) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await activityService.logActivity({
            action: 'update',
            targetType: 'member',
            targetId: data.id,
            description: `Lid gewijzigd: ${data.straat} ${data.huisnummer}`
        });

        return data as Profile;
    },

    async updatePreferences(prefs: { confirm_tags?: boolean }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get current preferences first
        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('user_id', user.id)
            .single();

        const currentPrefs = profile?.preferences || {};
        const newPrefs = { ...currentPrefs, ...prefs };

        const { error } = await supabase
            .from('profiles')
            .update({ preferences: newPrefs })
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async getCurrentProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) return null;
        return data as Profile;
    }
};
