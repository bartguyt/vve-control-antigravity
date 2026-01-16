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
    member_number: string | null;
    building_number: string | null;
    street: string | null;
    house_number: string | null;
    zip_code: string | null;
    city: string | null;
    phone_number: string | null;
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

export interface BankTransaction {
    id: string;
    vve_id: string;
    account_id: string;
    external_id: string;
    booking_date: string;
    amount: number;
    description: string;
    creditor_name?: string;
    debtor_name?: string;
    counterparty_iban?: string;
    transaction_type: string;
    linked_member_id?: string | null;
    linked_assignment_id?: string | null;
    linked_document_id?: string | null;
    linked_supplier_id?: string | null;
    category?: string | null;
    contribution_year_id?: string | null;
    financial_category_id?: string | null;
    created_at: string;
}

export interface LedgerAccount {
    id: string;
    vve_id: string;
    code: number;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    is_system: boolean;
}

export interface FinancialCategory {
    id: string;
    vve_id: string;
    name: string;
    ledger_account_id: string;
    ledger_account?: LedgerAccount;
    vat_percentage: number;
}

export interface JournalEntry {
    id: string;
    vve_id: string;
    transaction_id?: string;
    booking_date: string;
    description: string;
    status: 'DRAFT' | 'POSTED';
    lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
    id: string;
    journal_entry_id: string;
    ledger_account_id: string;
    ledger_account?: LedgerAccount;
    debit: number;
    credit: number;
    description?: string;
}

export interface Supplier {
    id: string;
    vve_id: string;
    name: string;
    category: string;
    notes?: string;
    default_financial_category_id?: string | null;
}

export interface Document {
    id: string;
    vve_id: string;
    title: string;
    file_url: string;
}

export interface Assignment {
    id: string;
    vve_id: string;
    title: string;
    description: string;
    amount?: number;
    supplier_id?: string | null;
    document_id?: string | null;
    created_at: string;
    scheduled_date?: string | null;
}
