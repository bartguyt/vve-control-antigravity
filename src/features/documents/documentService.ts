import { supabase } from '../../lib/supabase';
import { activityService } from '../../services/activityService';
import { associationService } from '../../lib/association';

export interface Document {
    id: string;
    association_id: string;
    title: string;
    description: string | null;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
    profiles?: {
        email: string;
    };
}

export const documentService = {
    async getDocuments() {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                profiles:uploaded_by (email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Document[];
    },

    async uploadDocument(file: File, title: string, description: string) {
        // 1. Get current user profile
        const profile = await associationService.getCurrentProfile();
        if (!profile) throw new Error('Not authenticated or no profile found');

        // 2. Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        // Use association_id for the folder path
        const filePath = `${profile.association_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('vve-documents') // Keeping bucket name as is for now
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('vve-documents')
            .getPublicUrl(filePath);

        // 4. Insert record into database
        const { data, error } = await supabase
            .from('documents')
            .insert({
                association_id: profile.association_id,
                title,
                description,
                file_url: publicUrl,
                file_type: file.type,
                file_size: file.size,
                uploaded_by: profile.id
            })
            .select()
            .single();

        if (error) throw error;

        // 5. Log activity
        await activityService.logActivity({
            action: 'create',
            targetType: 'document',
            targetId: data.id,
            description: `Document geüpload: ${title}`
        });

        return data as Document;
    },

    async deleteDocument(id: string, fileUrl: string, title: string) {
        // 1. Delete from Storage
        // Extract path from URL (simple approach assuming consistent format)
        const pathParts = fileUrl.split('vve-documents/');
        if (pathParts.length > 1) {
            const filePath = pathParts[1];
            await supabase.storage.from('vve-documents').remove([filePath]);
        }

        // 2. Delete from Database
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Log activity
        await activityService.logActivity({
            action: 'delete',
            targetType: 'document',
            targetId: id,
            description: `Document verwijderd: ${title}`
        });
    }
};
