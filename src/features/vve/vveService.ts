import { supabase } from '../../lib/supabase';
import type { VvE } from '../../types/database';

export const vveService = {
    /**
     * Creates a new VvE and automatically makes the creator an Admin/Manager.
     */
    async createVve(name: string, kvkNumber?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Create the VvE
        const { data: vve, error: vveError } = await supabase
            .from('vves')
            .insert({
                name,
                kvk_number: kvkNumber
            })
            .select()
            .single();

        if (vveError) throw vveError;
        if (!vve) throw new Error('Failed to create VvE');

        // 2. Add creator as a Member with 'board' (or 'manager') role
        // Note: 'board' is a safe default for the creator.
        const { error: memberError } = await supabase
            .from('vve_memberships')
            .insert({
                user_id: user.id,
                vve_id: vve.id,
                role: 'board', // Creator is Board member by default
                is_active: true
            });

        if (memberError) {
            // Cleanup VvE if membership fails (optional, but good practice)
            console.error('Failed to create initial membership:', memberError);
            // await supabase.from('vves').delete().eq('id', vve.id); 
            throw memberError;
        }

        return vve as VvE;
    }
};
