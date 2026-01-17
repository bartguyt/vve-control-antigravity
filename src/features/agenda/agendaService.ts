import { supabase } from '../../lib/supabase';
import { activityService } from '../../services/activityService';

export interface EventCategory {
    id: string;
    association_id: string;
    name: string;
}

export interface AgendaEvent {
    id: string;
    association_id: string;
    title: string;
    description: string | null;
    category_id: string | null; // Kept for legacy/database compatibility
    start_time: string;
    end_time: string | null;
    location: string | null;
    image_url: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string | null;
    categories?: EventCategory[]; // New standard
    event_categories?: EventCategory; // Deprecated single category
    profiles?: {
        email: string;
        first_name?: string;
        last_name?: string;
    };
}

export const agendaService = {
    async getEvents() {
        const { data, error } = await supabase
            .from('agenda_events')
            .select(`
                *,
                agenda_event_categories (
                    event_categories (
                        id,
                        name,
                        association_id
                    )
                ),
                profiles:created_by (email)
            `)
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Transform the nested response into a clean flat array
        return data.map((event: any) => ({
            ...event,
            categories: event.agenda_event_categories?.map((junction: any) => junction.event_categories) || []
        })) as AgendaEvent[];
    },

    async getCategories() {
        const { data, error } = await supabase
            .from('event_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as EventCategory[];
    },

    async findOrCreateCategory(name: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('profiles')
            .select('association_id')
            .eq('user_id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        const cleanName = name.trim();
        const lowerName = cleanName.toLowerCase();

        // 1. Search for existing (case-insensitive)
        const { data: existing } = await supabase
            .from('event_categories')
            .select('*')
            .ilike('name', lowerName)
            .ilike('name', lowerName)
            .eq('association_id', profile.association_id)
            .maybeSingle();

        if (existing) return existing;

        // 2. Create new
        const { data, error } = await supabase
            .from('event_categories')
            .insert({ association_id: profile.association_id, name: cleanName })
            .select()
            .single();

        if (error) throw error;
        return data as EventCategory;
    },

    async createEvent(eventData: Omit<AgendaEvent, 'id' | 'created_at' | 'updated_at' | 'association_id' | 'created_by' | 'event_categories' | 'profiles' | 'category_id'> & { categoryNames: string[] }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, association_id')
            .eq('user_id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        // Resolve all categories (find or create)
        const categoryPromises = eventData.categoryNames.map(name => this.findOrCreateCategory(name));
        const categories = await Promise.all(categoryPromises);

        // Remove categoryNames from insert data
        const { categoryNames, ...insertData } = eventData;

        // Insert the event
        const { data: event, error: eventError } = await supabase
            .from('agenda_events')
            .insert({
                ...insertData,
                association_id: profile.association_id,
                created_by: profile.id
            })
            .select()
            .single();

        if (eventError) throw eventError;

        // Insert junction records for categories
        if (categories.length > 0) {
            const junctionData = categories.map(cat => ({
                event_id: event.id,
                category_id: cat.id
            }));

            const { error: junctionError } = await supabase
                .from('agenda_event_categories')
                .insert(junctionData);

            if (junctionError) throw junctionError;
        }

        // Log activity
        await activityService.logActivity({
            action: 'create',
            targetType: 'event',
            targetId: event.id,
            description: `Agenda item toegevoegd: ${event.title}`
        });

        return event as AgendaEvent;
    },

    async updateEvent(id: string, eventData: Partial<Omit<AgendaEvent, 'id' | 'created_at' | 'created_by' | 'association_id' | 'event_categories' | 'profiles'>> & { categoryNames?: string[] }) {
        // 1. Handle categories if provided
        if (eventData.categoryNames) {
            // Clear existing categories
            await supabase
                .from('agenda_event_categories')
                .delete()
                .eq('event_id', id);

            // Add new ones
            const categoryPromises = eventData.categoryNames.map(name => this.findOrCreateCategory(name));
            const categories = await Promise.all(categoryPromises);

            if (categories.length > 0) {
                const junctionData = categories.map(cat => ({
                    event_id: id,
                    category_id: cat.id
                }));
                await supabase.from('agenda_event_categories').insert(junctionData);
            }
        }

        // 2. Update event details
        const { categoryNames, ...updateData } = eventData;

        if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
                .from('agenda_events')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        }

        // Log activity
        await activityService.logActivity({
            action: 'update',
            targetType: 'event',
            targetId: id,
            description: `Agenda item gewijzigd: ${eventData.title || 'Onbekend'}`
        });
    },

    async deleteEvent(id: string, title: string) {
        const { error } = await supabase
            .from('agenda_events')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await activityService.logActivity({
            action: 'delete',
            targetType: 'event',
            targetId: id,
            description: `Agenda item verwijderd: ${title}`
        });
    }
};
