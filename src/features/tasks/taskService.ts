import { supabase } from '../../lib/supabase';
// import type { Database } from '../../types/database';

export type TaskStatus = 'open' | 'scheduled' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface MaintenanceTask {
    id: string;
    association_id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assigned_to: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields (optional)
    assignee?: { email: string; full_name?: string } | null;
    creator?: { email: string; full_name?: string } | null;
}

export const taskService = {
    async getTasks(associationId: string) {
        const { data, error } = await supabase
            .from('maintenance_tasks')
            .select(`
                *,
                assignee:assigned_to(email),
                creator:created_by(email)
            `)
            .eq('association_id', associationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as MaintenanceTask[];
    },

    async createTask(task: Partial<MaintenanceTask>) {
        const { data, error } = await supabase
            .from('maintenance_tasks')
            .insert(task)
            .select()
            .single();

        if (error) throw error;
        return data as MaintenanceTask;
    },

    async updateTask(id: string, updates: Partial<MaintenanceTask>) {
        const { data, error } = await supabase
            .from('maintenance_tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as MaintenanceTask;
    },

    async deleteTask(id: string) {
        const { error } = await supabase
            .from('maintenance_tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
