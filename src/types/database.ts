export type AppRole = 'admin' | 'manager' | 'board' | 'audit_comm' | 'tech_comm' | 'member';

export interface Association {
    id: string;
    name: string;
    created_at: string;
    voting_strategy?: 'HEAD' | 'FRACTION';
    quorum_required?: boolean;
    quorum_percentage?: number;
}

export interface AssociationMembership {
    id: string;
    user_id: string;
    association_id: string;
    role: AppRole;
    created_at: string;
    is_active?: boolean;
    associations?: Association; // Joined Association data
}

export interface Profile {
    id: string; // unique profile id
    user_id: string | null; // links to auth.users if registered
    // Legacy single-association fields (deprecated but kept for backward compat until migration)
    association_id?: string;
    role?: AppRole;

    // New Multi-Association fields
    is_super_admin?: boolean;
    association_memberships?: AssociationMembership[];
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
    association_id: string;
    year: number;
    default_amount: number;
    base_rate_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MemberContribution {
    id: string;
    association_id: string;
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
    association_id: string;
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
    association_id: string;
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
    association_id: string;
    code: number;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    is_system: boolean;
}

export interface FinancialCategory {
    id: string;
    association_id: string;
    name: string;
    ledger_account_id: string;
    ledger_account?: LedgerAccount;
    vat_percentage: number;
}

export interface JournalEntry {
    id: string;
    association_id: string;
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
    association_id: string;
    name: string;
    category: string;
    notes?: string;
    default_financial_category_id?: string | null;
}

export interface Document {
    id: string;
    association_id: string;
    title: string;
    file_url: string;
}

export interface Assignment {
    id: string;
    association_id: string;
    title: string;
    description: string;
    amount?: number;
    supplier_id?: string | null;
    document_id?: string | null;
    created_at: string;
    scheduled_date?: string | null;
}

export interface Member {
    id: string;
    association_id: string;
    profile_id?: string | null;
    member_number?: string | null;
    building_number?: string | null;
    street?: string | null;
    house_number?: string | null;
    zip_code?: string | null;
    city?: string | null;
    fraction: number;
    created_at: string;
}

export type MeetingStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Meeting {
    id: string;
    association_id: string;
    date: string;
    name: string;
    description?: string | null;
    location?: string | null;
    status: MeetingStatus;
    created_at: string;
}

export type ProposalType = 'NORMAL' | 'SPECIAL' | 'UNANIMOUS';
export type ProposalStatus = 'DRAFT' | 'OPEN' | 'ACCEPTED' | 'REJECTED';

export interface Proposal {
    id: string;
    association_id: string;
    meeting_id?: string | null;
    title: string;
    description?: string | null;
    type: ProposalType;
    status: ProposalStatus;
    created_at: string;

    // Virtual/Joined fields
    meeting?: Meeting;
    votes?: Vote[];
}

export type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN';

export interface Vote {
    id: string;
    proposal_id: string;
    member_id: string;
    user_id: string;
    choice: VoteChoice;
    weight: number;
    created_at: string;

    // Joined
    member?: Member;
    user?: Profile;
}
