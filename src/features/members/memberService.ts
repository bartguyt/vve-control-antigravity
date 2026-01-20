import { supabase } from '../../lib/supabase';
import { debugUtils } from '../../utils/debugUtils';
import type { Profile } from '../../types/database';
import { activityService } from '../../services/activityService';
import { associationService } from '../../lib/association';

export const memberService = {
    async getMembers() {
        const { data, error } = await supabase
            .from('members')
            .select(`
                *,
                profile:profile_id (
                    id, first_name, last_name, email, phone_number, user_id,
                    association_memberships (
                        id, role, is_active, association_id, function
                    )
                )
            `)
            .order('member_number', { ascending: true });

        if (error) throw error;

        // Transform for frontend compatibility
        return data.map((m: any) => {
            // Find membership for this association in the nested profile data
            const membership = m.profile?.association_memberships?.find(
                (am: any) => am.association_id === m.association_id
            );

            return {
                ...m.profile, // Spread profile first (so it doesn't overwrite id)

                id: m.id, // Return MEMBER (Unit) ID as the primary ID (overwrites profile.id)
                profile_id: m.profile?.id, // Keep reference to real profile ID

                // Address/Unit from members table overrides any profile legacy
                member_number: m.member_number,
                building_number: m.building_number,
                street: m.street,
                house_number: m.house_number,
                zip_code: m.zip_code,
                city: m.city,
                fraction: m.fraction,

                association_id: m.association_id,

                // Reconstruct memberships array for frontend compatibility
                association_memberships: membership ? [membership] : []
            };
        }) as Profile[];
    },

    async createMemberProfile(profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'association_id'>) {
        const associationId = await associationService.getCurrentAssociationId();

        // 1. Create Profile first (The Person)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                email: profileData.email,
                phone_number: profileData.phone_number,
                // No address fields here anymore
            })
            .select()
            .single();

        if (profileError) throw profileError;

        // 2. Create Member (The Unit) linked to Profile
        const { data: member, error: memberError } = await supabase
            .from('members')
            .insert({
                association_id: associationId,
                profile_id: profile.id,
                member_number: profileData.member_number,
                building_number: profileData.building_number,
                street: profileData.street,
                house_number: profileData.house_number,
                zip_code: profileData.zip_code,
                city: profileData.city,
                // fraction?
            })
            .select()
            .single();

        if (memberError) throw memberError;

        // 3. Create Membership (Role) if needed?
        // Usually creating a member implies they are a member role.
        // But membership is linked to USER_ID, and this fresh profile might not have a user_id yet?
        // If it's a dummy profile, we can't create association_membership (it needs user_id?). 
        // Or can association_membership link to profile_id? No, usually user_id.

        // Log activity
        await activityService.logActivity({
            action: 'create',
            targetType: 'member',
            targetId: member.id, // Use Member ID
            description: `Member added: ${profile.first_name} ${profile.last_name}`
        });

        // Return combined object
        return { ...profile, ...member, id: member.id, profile_id: profile.id } as any;
    },

    async updateMember(id: string, updates: Partial<Profile>) {
        // ID passed here is now MEMBER ID (from getMembers)

        // 1. Update Member (Unit) details
        const memberUpdates: any = {};
        if (updates.member_number !== undefined) memberUpdates.member_number = updates.member_number;
        if (updates.building_number !== undefined) memberUpdates.building_number = updates.building_number;
        if (updates.street !== undefined) memberUpdates.street = updates.street;
        if (updates.house_number !== undefined) memberUpdates.house_number = updates.house_number;
        if (updates.zip_code !== undefined) memberUpdates.zip_code = updates.zip_code;
        if (updates.city !== undefined) memberUpdates.city = updates.city;

        // Fetch current member to get profile_id
        const { data: currentMember } = await supabase
            .from('members')
            .select('profile_id')
            .eq('id', id)
            .single();

        if (!currentMember) throw new Error('Member not found');

        if (Object.keys(memberUpdates).length > 0) {
            const { error } = await supabase
                .from('members')
                .update(memberUpdates)
                .eq('id', id);
            if (error) throw error;
        }

        // 2. Update Profile (Person) details
        const profileUpdates: any = {};
        if (updates.first_name !== undefined) profileUpdates.first_name = updates.first_name;
        if (updates.last_name !== undefined) profileUpdates.last_name = updates.last_name;
        if (updates.email !== undefined) profileUpdates.email = updates.email;
        if (updates.phone_number !== undefined) profileUpdates.phone_number = updates.phone_number;

        if (currentMember.profile_id && Object.keys(profileUpdates).length > 0) {
            const { error } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', currentMember.profile_id);
            if (error) throw error;
        }

        return { id, ...updates } as any; // Mock return
    },

    async updateMembership(membershipId: string, updates: { role?: string; is_active?: boolean; function?: string }) {
        const { data, error } = await supabase
            .from('association_memberships')
            .update(updates)
            .eq('id', membershipId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePreferences(prefs: { confirm_tags?: boolean }) {
        const profile = await associationService.getCurrentProfile();
        if (!profile) throw new Error('Not authenticated');

        const currentPrefs = profile.preferences || {};
        const newPrefs = { ...currentPrefs, ...prefs };

        const { error } = await supabase
            .from('profiles')
            .update({ preferences: newPrefs })
            .eq('id', profile.id);

        if (error) throw error;
    },

    async getCurrentProfile() {
        return associationService.getCurrentProfileJoined();
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
    async resetAllFinanceLinks(associationId: string) {
        // 1. Remove all IBAN entries for this Association's members
        // We need to filter by Association matches.

        const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('association_id', associationId);

        if (!members || members.length === 0) return;

        const memberIds = members.map(m => m.id);

        const { error: ibanError } = await supabase
            .from('member_ibans')
            .delete()
            .in('user_id', memberIds);

        if (ibanError) throw ibanError;

        // 2. Unlink all transactions for this Association
        const { error: txError } = await supabase
            .from('bank_transactions')
            .update({ linked_member_id: null })
            .eq('association_id', associationId);

        if (txError) throw txError;
    },

    async deleteMember(memberId: string) {
        // memberId is now the UNIT ID (from members table)

        // 1. Get the Profile ID
        const { data: member, error: fetchError } = await supabase
            .from('members')
            .select('profile_id')
            .eq('id', memberId)
            .single();

        if (fetchError) throw fetchError;

        if (!member.profile_id) {
            // Unit is empty? Maybe delete the unit?
            debugUtils.warn('Deleting member unit which has no profile attached:', memberId);
            // If the user wants to delete the "Line", we delete the Unit.
            const { error } = await supabase.from('members').delete().eq('id', memberId);
            if (error) throw error;
            return;
        }

        // Log activity before delete
        await activityService.logActivity({
            action: 'delete',
            targetType: 'member',
            targetId: member.profile_id,
            description: `Lid verwijderd`
        });

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', member.profile_id); // Delete the Person

        if (error) throw error;

        // Note: The 'members' row will remain but with profile_id = NULL due to ON DELETE SET NULL.
        // If we want to remove the Unit itself, we should also delete the member row?
        // Usually "Delete Member" in the UI means "Remove this person from the list".
        // But if we leave an empty unit, it stays in the list (as empty).
        // Let's assume the user implies "Delete this Entry".
        // IF we delete the Profile, the Member unit stays "Empty".
        // If we want to clear the list item, we should delete the Member Unit too.
        // Let's Delete the Unit (Member) as well if the intention is "Remove from list".

        /* 
           DECISION: Keep the Unit (Address/Fraction) but clear the occupant?
           Or delete the Unit?
           If I created a Unit by mistake, I want to delete it.
           If I want to evict a user, I usually use "Unlink" or "Edit".
           "Delete" usually implies destruction of the record.
           In the new model, "Member" = "Unit". So deleting Member = Deleting Unit.
           BUT it also deletes the Profile attached?
           profiles.id is ON DELETE SET NULL.
           
           If I delete 'members' row -> Profile stays.
           If I delete 'profiles' row -> Member stays (empty).
           
           Let's do this: Delete the MEMBER (Unit).
           And IF proper cleanup is needed for the Profile (orphaned?), handle that.
           
           Wait, `createMemberProfile` creates both.
           So `deleteMember` should probably delete both?
           
           Let's delete the MEMBER (Unit).
           And then also delete the PROFILE if it has no other units? 
           That's complex.
           
           Let's stick to: Delete the MEMBER (Unit).
           The Profile will become orphaned (association_id is gone from profile schema properly soon).
        */

        // REVISED APPROACH:
        // Just delete the 'members' row.
        // But wait, earlier I said "Log activity... targetId: member.profile_id".
        // If I delete the unit, the person (Profile) still exists in the DB.
        // Is that what we want?
        // If I added "John Doe" and he got created in `profiles`, and I delete the Unit, 
        // "John Doe" is still in `profiles` table.
        // If I list all profiles, he is there.
        // Ideally we should clean him up if he is not used.

        // Let's go back to: Delete Profile. 
        // This clears the unit (Set Null).
        // If the user sees an empty unit, they can delete the unit separately?
        // No, UI usually has one button.

        // Let's doing both to be clean for now (assuming 1:1 mapping mostly).
        const profileId = member.profile_id;

        // Delete Member (Unit)
        const { error: deleteMemberError } = await supabase.from('members').delete().eq('id', memberId);
        if (deleteMemberError) throw deleteMemberError;

        // Delete Profile (Person)
        if (profileId) {
            const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('id', profileId);
            if (deleteProfileError) {
                debugUtils.warn('Failed to delete profile after member delete', deleteProfileError);
            }
        }
    },

    async bulkDeleteMembers(memberIds: string[]) {
        // memberIds are UNIT IDs.

        // 1. Resolve Profile IDs for these Units
        // We also need to check transactions linked to the Profile or Unit?
        // Bank Transactions link to... `linked_member_id` which WAS Profile ID.
        // We need to resolve Profile IDs to check transactions.

        const { data: members, error: fetchError } = await supabase
            .from('members')
            .select('id, profile_id')
            .in('id', memberIds);

        if (fetchError) throw fetchError;

        const validMembers = members || [];
        const profileIds = validMembers.map(m => m.profile_id).filter(id => id !== null) as string[];

        // 2. Check transactions linked to these PROFILES (legacy link)
        const { data: transactions, error: txError } = await supabase
            .from('bank_transactions')
            .select('linked_member_id')
            .in('linked_member_id', profileIds);

        if (txError) throw txError;

        const unsafeProfileIds = new Set(transactions?.map(t => t.linked_member_id));

        // Which Member/Unit IDs are safe?
        // A Unit is safe if its Profile is safe (not in unsafeProfileIds) OR if it has no profile.
        const safeMemberIds = validMembers
            .filter(m => !m.profile_id || !unsafeProfileIds.has(m.profile_id))
            .map(m => m.id);

        const failedMemberIds = memberIds.filter(id => !safeMemberIds.includes(id));

        if (safeMemberIds.length === 0) {
            return { deleted: [], failed: memberIds };
        }

        // 3. Log activity
        await Promise.all(safeMemberIds.map(id =>
            activityService.logActivity({
                action: 'delete',
                targetType: 'member',
                targetId: id,
                description: `Lid verwijderd (bulk)`
            })
        ));

        // 4. Delete Safe Members (Units)
        const { error: deleteMemberError } = await supabase
            .from('members')
            .delete()
            .in('id', safeMemberIds);

        if (deleteMemberError) throw deleteMemberError;

        // 5. Delete Orphaned Profiles
        // Only those that were associated with the deleted units
        const safeProfileIds = validMembers
            .filter(m => safeMemberIds.includes(m.id) && m.profile_id)
            .map(m => m.profile_id as string);

        if (safeProfileIds.length > 0) {
            const { error: deleteProfileError } = await supabase
                .from('profiles')
                .delete()
                .in('id', safeProfileIds);

            if (deleteProfileError) debugUtils.warn('Bulk delete profiles warning', deleteProfileError);
        }

        return {
            deleted: safeMemberIds,
            failed: failedMemberIds
        };
    },
    async transferOwnership(memberId: string, newProfileId: string, notes: string) {
        const { error } = await supabase.rpc('transfer_unit_ownership', {
            p_member_id: memberId,
            p_new_profile_id: newProfileId,
            p_notes: notes
        });

        if (error) throw error;

        // Log locally just in case, though DB logs it too.
        await activityService.logActivity({
            action: 'update',
            targetType: 'member',
            targetId: memberId,
            description: `Eigenaar gewijzigd via overdracht`
        });
    },

    async searchProfiles(query: string) {
        if (!query || query.length < 2) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return data;
    }
};
