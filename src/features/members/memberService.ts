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
            .eq('id', user.id)
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
            .eq('id', user.id)
            .single();

        const currentPrefs = profile?.preferences || {};
        const newPrefs = { ...currentPrefs, ...prefs };

        const { error } = await supabase
            .from('profiles')
            .update({ preferences: newPrefs })
            .eq('id', user.id);

        if (error) throw error;
    },

    async getCurrentProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Fetch profile AND memberships
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
            .eq('user_id', user.id) // Correctly match auth.uid via FK column
            .limit(1)
            .single();

        if (error) return null;
        return data as Profile;
    },

    async getMemberIbans(userId: string) {
        const { data, error } = await supabase
            .from('member_ibans')
            .select('iban')
            .eq('user_id', userId);

        if (error) throw error;
        return data?.map(d => d.iban) || [];
    },

    async addMemberIban(userId: string, iban: string) {
        // First check if exists
        const { data: existing } = await supabase
            .from('member_ibans')
            .select('id')
            .eq('user_id', userId)
            .eq('iban', iban)
            .single();

        if (existing) return;

        const { error } = await supabase
            .from('member_ibans')
            .insert({ user_id: userId, iban });

        if (error) throw error;
    },

    // Unlink all finance data for a member
    async unlinkMemberFinance(memberId: string) {
        // 1. Remove IBAN entries
        const { error: ibanError } = await supabase
            .from('member_ibans')
            .delete()
            .eq('user_id', memberId);

        if (ibanError) throw ibanError;

        // 2. Unlink transactions
        const { error: txError } = await supabase
            .from('bank_transactions')
            .update({ linked_member_id: null })
            .eq('linked_member_id', memberId);

        if (txError) throw txError;
    },

    // SUPER ADMIN: Reset ALL finance links
    async resetAllFinanceLinks(vveId: string) {
        // 1. Remove all IBAN entries for this VvE's members
        // We need to filter by VvE matches.

        const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('vve_id', vveId);

        if (!members || members.length === 0) return;

        const memberIds = members.map(m => m.id);

        const { error: ibanError } = await supabase
            .from('member_ibans')
            .delete()
            .in('user_id', memberIds);

        if (ibanError) throw ibanError;

        // 2. Unlink all transactions for this VvE
        const { error: txError } = await supabase
            .from('bank_transactions')
            .update({ linked_member_id: null })
            .eq('vve_id', vveId);

        if (txError) throw txError;
    },

    async deleteMember(memberId: string) {
        // Log activity before delete (since data will be gone)
        // Ideally we fetch first to get name for log, but simplistic approach here
        await activityService.logActivity({
            action: 'delete',
            targetType: 'member',
            targetId: memberId,
            description: `Lid verwijderd`
        });

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', memberId);

        if (error) throw error;
    }
};
