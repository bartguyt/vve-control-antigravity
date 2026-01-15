-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vve_id UUID NOT NULL REFERENCES public.vves(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Policies

-- Read: All members of the VvE can view suppliers (Address book functionality)
CREATE POLICY "Users can view suppliers in their VvEs"
ON public.suppliers FOR SELECT
USING (
    vve_id IN (
        SELECT vve_id 
        FROM public.vve_memberships 
        WHERE user_id = auth.uid()
    )
);

-- Write: Only Tech Comm, Board, Manager, Admin can manage suppliers
CREATE POLICY "Tech Comm and Board can manage suppliers"
ON public.suppliers FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.vve_memberships 
        WHERE user_id = auth.uid() 
        AND vve_id = public.suppliers.vve_id
        AND role IN ('tech_comm', 'board', 'manager', 'admin')
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
