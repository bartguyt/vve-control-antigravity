import { supabase } from '../../lib/supabase';

export interface Supplier {
    id: string;
    association_id: string;
    name: string;
    category: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export const supplierService = {
    async getSuppliers(associationId: string): Promise<Supplier[]> {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('association_id', associationId)
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
        const { data, error } = await supabase
            .from('suppliers')
            .insert(supplier)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
        const { data, error } = await supabase
            .from('suppliers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSupplier(id: string): Promise<void> {
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
