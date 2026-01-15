export type AppRole = 'admin' | 'manager' | 'board' | 'audit_comm' | 'tech_comm' | 'member';

export interface VvE {
    id: string;
    name: string;
    created_at: string;
}

export interface VveMembership {
    id: string;
    user_id: string;
    vve_id: string;
    role: AppRole;
    created_at: string;
    is_active?: boolean;
    vves?: VvE; // Joined VvE data
}

export interface Profile {
    id: string; // unique profile id
    user_id: string | null; // links to auth.users if registered
    // Legacy single-vve fields (deprecated but kept for backward compat)
    vve_id?: string;
    role?: AppRole;

    // New Multi-VvE fields
    is_super_admin?: boolean;
    vve_memberships?: VveMembership[];
    preferences?: {
        confirm_tags?: boolean;
    };

    first_name: string;
    last_name: string;
    lid_nummer: string | null;
    bouwnummer: string | null;
    straat: string | null;
    huisnummer: string | null;
    postcode: string | null;
    stad: string | null;
    telefoonnummer: string | null;
    email: string | null;
    updated_at: string | null;
    created_at: string;

    // Joined Data
    bank_transactions?: [{ count: number }];
}

export interface ContributionYear {
    id: string;
    vve_id: string;
    year: number;
    default_amount: number;
    base_rate_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MemberContribution {
    id: string;
    vve_id: string;
    year_id: string;
    member_id: string;
    amount_due: number;
    amount_paid: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
    notes?: string;
    created_at: string;
    updated_at: string;

    // Joins
    year?: ContributionYear;
    member?: Profile;
    group?: ContributionGroup;
}

export interface ContributionGroup {
    id: string;
    vve_id: string;
    name: string;
    created_at: string;
}

export interface ContributionYearAmount {
    id: string;
    year_id: string;
    group_id: string;
    amount: number;
    created_at: string;

    // Join
    group?: ContributionGroup;
}

export interface MemberGroupAssignment {
    id: string;
    member_id: string;
    group_id: string;
    assigned_at: string;

    // Join
    group?: ContributionGroup;
}
