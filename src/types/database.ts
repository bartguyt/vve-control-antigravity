export type AppRole = 'admin' | 'bestuur' | 'kascommissie' | 'techcommissie' | 'lid';

export interface Profile {
    id: string; // unique profile id
    user_id: string | null; // links to auth.users if registered
    vve_id: string;
    role: AppRole;
    lid_nummer: string | null;
    bouwnummer: string | null;
    straat: string | null;
    huisnummer: string | null;
    postcode: string | null;
    stad: string | null;
    telefoon: string | null;
    email: string | null;
    updated_at: string | null;
    created_at: string;
}

export interface VvE {
    id: string;
    name: string;
    created_at: string;
}
