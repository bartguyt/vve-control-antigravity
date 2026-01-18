import { supabase } from '../lib/supabase';
import { associationService } from '../lib/association';

export interface AppNotification {
    id: string;
    association_id: string;
    type: 'financial_dispute' | 'system' | 'reminder';
    title: string;
    message: string;
    priority: 'normal' | 'urgent';
    status: 'unread' | 'read' | 'processed' | 'archived';
    metadata?: any;
    created_at: string;
}

export const notificationService = {
    async getNotifications() {
        const associationId = await associationService.getCurrentAssociationId();
        if (!associationId) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('association_id', associationId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data as AppNotification[];
    },

    async getUnreadCount() {
        const associationId = await associationService.getCurrentAssociationId();
        if (!associationId) return 0;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('association_id', associationId)
            .eq('status', 'unread');

        if (error) throw error;
        return count || 0;
    },

    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ status: 'read' })
            .eq('id', id);

        if (error) throw error;
    },

    async markAsUnread(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ status: 'unread' })
            .eq('id', id);

        if (error) throw error;
    },

    async convertToTask(notification: AppNotification) {
        // Create a task in maintenance_tasks based on notification
        const { error } = await supabase
            .from('maintenance_tasks')
            .insert({
                association_id: notification.association_id,
                title: notification.title,
                description: `Created from notification: ${notification.message}`,
                priority: notification.priority === 'urgent' ? 'high' : 'medium',
                status: 'open'
            });

        if (error) throw error;

        // Update notification status
        await supabase
            .from('notifications')
            .update({ status: 'processed' })
            .eq('id', notification.id);
    },

    async createDispute(memberId: string, senderName: string, associationName: string, itemDescription: string, amount?: number) {
        const associationId = await associationService.getCurrentAssociationId();

        const { error } = await supabase
            .from('notifications')
            .insert({
                association_id: associationId,
                type: 'financial_dispute',
                title: `Betalingsgeschil: ${associationName}`,
                message: `${senderName} betwist betaling voor: ${itemDescription}. Bedrag: €${amount || '?'}`,
                priority: 'urgent',
                status: 'unread',
                metadata: {
                    member_id: memberId,
                    sender_name: senderName,
                    association_name: associationName,
                    amount,
                    item: itemDescription,
                    dispute_date: new Date().toISOString()
                }
            });

        if (error) throw error;
    }
};
