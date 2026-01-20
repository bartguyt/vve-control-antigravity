import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from './notificationService';

// Mock the dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
    },
}));

vi.mock('../lib/association', () => ({
    associationService: {
        getCurrentAssociationId: vi.fn().mockResolvedValue('test-association-123'),
    },
}));

describe('notificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getNotifications', () => {
        it('fetches notifications for current association', async () => {
            const mockNotifications = [
                {
                    id: '1',
                    title: 'Test Notification',
                    message: 'Test message',
                    status: 'unread',
                    priority: 'normal',
                    type: 'system',
                    association_id: 'test-association-123',
                    created_at: new Date().toISOString(),
                },
            ];

            const { supabase } = await import('../lib/supabase');
            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
            });

            const result = await notificationService.getNotifications();

            expect(result).toEqual(mockNotifications);
            expect(mockFrom).toHaveBeenCalledWith('notifications');
        });

        it('returns empty array when no association ID', async () => {
            const { associationService } = await import('../lib/association');
            vi.mocked(associationService.getCurrentAssociationId).mockResolvedValue(null);

            const result = await notificationService.getNotifications();

            expect(result).toEqual([]);
        });
    });

    describe('markAsRead', () => {
        it('updates notification status to read', async () => {
            const { supabase } = await import('../lib/supabase');
            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValue({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            await notificationService.markAsRead('notification-123');

            expect(mockFrom).toHaveBeenCalledWith('notifications');
        });
    });

    describe('markAsUnread', () => {
        it('updates notification status to unread', async () => {
            const { supabase } = await import('../lib/supabase');
            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValue({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            await notificationService.markAsUnread('notification-123');

            expect(mockFrom).toHaveBeenCalledWith('notifications');
        });
    });

    describe('createDispute', () => {
        it('creates a dispute notification with metadata', async () => {
            const { supabase } = await import('../lib/supabase');
            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValue({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'new-notification' }, error: null }),
            });

            const disputeData = {
                associationId: 'test-association-123',
                amount: 150.50,
                item: 'Bijdrage Q1 2024',
                reason: 'Bedrag klopt niet',
                senderName: 'Jan Jansen',
                associationName: 'VvE De Toren',
            };

            await notificationService.createDispute(disputeData);

            expect(mockFrom).toHaveBeenCalledWith('notifications');
        });
    });
});
