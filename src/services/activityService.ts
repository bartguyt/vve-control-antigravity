import { supabase } from '../lib/supabase';
import { associationService } from '../lib/association';

export type ActivityAction = 'create' | 'update' | 'delete' | 'login';
export type ActivityTarget = 'member' | 'document' | 'event';

export const activityService = {
    async logActivity(params: {
        action: ActivityAction;
        targetType: ActivityTarget;
        targetId?: string;
        description: string;
    }) {
        const profile = await associationService.getCurrentProfile();
        if (!profile) return;

        await supabase.from('activity_logs').insert({
            association_id: profile.association_id,
            profile_id: profile.id, // Changed from user_id to profile_id
            action_type: params.action,
            target_type: params.targetType,
            target_id: params.targetId,
            description: params.description
        });
    },

    async getRecentActivities() {
        // Now we can join profiles properly because 'profile_id' is a FK to 'profiles.id'
        const { data, error } = await supabase
            .from('activity_logs')
            .select(`
                *,
                profiles:profile_id (email, role)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    },

    async getRecentLogins() {
        const { data, error } = await supabase
            .from('activity_logs')
            .select(`
                *,
                profiles:profile_id (email)
            `)
            .eq('action_type', 'login')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        return data;
    }
};
