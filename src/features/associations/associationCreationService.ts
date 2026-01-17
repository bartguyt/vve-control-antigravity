import { supabase } from '../../lib/supabase';
import type { Association } from '../../types/database';

export const associationCreationService = {
    /**
     * Creates a new Association and automatically makes the creator an Admin/Manager.
     */
    async createAssociation(name: string, kvkNumber?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Create the Association
        const { data: association, error: associationError } = await supabase
            .from('associations')
            .insert({
                name,
                kvk_number: kvkNumber
            })
            .select()
            .single();

        if (associationError) throw associationError;
        if (!association) throw new Error('Failed to create Association');

        // 2. Add creator as a Member with 'board' (or 'manager') role
        const { error: memberError } = await supabase
            .from('association_memberships')
            .insert({
                user_id: user.id,
                association_id: association.id,
                role: 'board', // Creator is Board member by default
                is_active: true
            });

        if (memberError) {
            console.error('Failed to create initial membership:', memberError);
            throw memberError;
        }

        return association as Association;
    }
};
