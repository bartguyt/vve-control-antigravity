
import { supabase } from './supabase';
import type { Profile } from '../types/database';

export const associationService = {
    async getCurrentAssociationId(): Promise<string> {
        // First try to get from local storage or state
        const storedId = localStorage.getItem('active_association_id');
        if (storedId) return storedId;

        // Fallback: get first association from profile
        const profile = await this.getCurrentProfile();
        const firstMembership = profile?.association_memberships?.[0];

        if (firstMembership) {
            this.setActiveAssociationId(firstMembership.association_id);
            return firstMembership.association_id;
        }

        throw new Error('No active association found');
    },

    setActiveAssociationId(id: string) {
        localStorage.setItem('active_association_id', id);
        // Trigger an event so components can react?
        window.dispatchEvent(new Event('association-changed'));
    },

    async getCurrentProfile(): Promise<Profile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                association_memberships (
                    *,
                    associations (*)
                )
            `)
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data as Profile;
    },

    async getCurrentProfileJoined(): Promise<Profile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Get Profile + Memberships
        // AND we need to get the "Member" (Unit) details for the ACTIVE association.
        // This is circular. We need active association ID.
        const activeId = localStorage.getItem('active_association_id');

        // Base Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select(`
                 *,
                 association_memberships (
                     *,
                     associations (*)
                 )
             `)
            .eq('user_id', user.id)
            .single();

        if (!profile) return null;

        // If we have an active association, try to find the Member Unit for this profile in that association
        if (activeId) {
            const { data: memberUnit } = await supabase
                .from('members')
                .select('*')
                .eq('profile_id', profile.id)
                .eq('association_id', activeId)
                .maybeSingle();

            if (memberUnit) {
                // Merge unit details into profile for frontend
                return {
                    ...profile,
                    member_number: memberUnit.member_number,
                    building_number: memberUnit.building_number,
                    street: memberUnit.street,
                    house_number: memberUnit.house_number,
                    zip_code: memberUnit.zip_code,
                    city: memberUnit.city,
                    fraction: memberUnit.fraction,
                    // Use Member ID? Or stay with Profile ID?
                    // getCurrentProfile usually implies User Profile. 
                    // Let's keep ID as Profile ID for this specific call, 
                    // but fields are enriched.
                } as Profile;
            }
        }

        return profile as Profile;
    },

    async createAssociation(name: string): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Create Association
        const { data: assoc, error: assocError } = await supabase
            .from('associations')
            .insert({ name })
            .select()
            .single();

        if (assocError) throw assocError;

        // 2. Create Membership (Admin)
        const { error: memberError } = await supabase
            .from('association_memberships')
            .insert({
                user_id: user.id,
                association_id: assoc.id,
                role: 'admin'
            });

        if (memberError) throw memberError;

        return assoc.id;
    },

    async updateAssociation(id: string, updates: Partial<Association>) {
        const { error } = await supabase
            .from('associations')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // Trigger generic update event if needed
        window.dispatchEvent(new Event('association-changed'));
    }
};
