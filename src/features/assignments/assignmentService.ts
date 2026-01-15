import { supabase } from '../../lib/supabase';


// Define types based on our schema
// TODO: Generate types from DB, but for now manual
export type AssignmentStatus = 'concept' | 'sent' | 'accepted' | 'completed' | 'paid' | 'refused';

export interface Assignment {
    id: string;
    vve_id: string;
    supplier_id: string | null;
    document_id: string | null;
    title: string;
    description: string | null;
    status: AssignmentStatus;
    amount: number | null;
    scheduled_date: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    suppliers?: {
        id: string;
        name: string;
    };
    documents?: {
        id: string;
        title: string;
        file_url: string;
    };
}

export const assignmentService = {
    async getAssignments(vveId: string) {
        const { data, error } = await supabase
            .from('assignments')
            .select(`
                *,
                suppliers ( id, name ),
                documents ( id, title, file_url )
            `)
            .eq('vve_id', vveId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Assignment[];
    },

    async createAssignment(assignment: Partial<Assignment>) {
        const { data, error } = await supabase
            .from('assignments')
            .insert(assignment)
            .select()
            .single();

        if (error) throw error;
        return data as Assignment;
    },

    async updateAssignment(id: string, updates: Partial<Assignment>) {
        const { data, error } = await supabase
            .from('assignments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Assignment;
    },

    async deleteAssignment(id: string) {
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
