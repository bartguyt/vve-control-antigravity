import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
    },
};

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
    supabase: mockSupabaseClient,
}));

// Mock association service
vi.mock('@/lib/association', () => ({
    associationService: {
        getCurrentAssociationId: vi.fn().mockResolvedValue('test-association-id'),
    },
}));
