-- Create contribution_years table
CREATE TABLE IF NOT EXISTS contribution_years (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vve_id UUID REFERENCES vves(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  default_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(vve_id, year)
);

-- Create member_contributions table
CREATE TABLE IF NOT EXISTS member_contributions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vve_id UUID REFERENCES vves(id) ON DELETE CASCADE,
  year_id UUID REFERENCES contribution_years(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(year_id, member_id)
);

-- Enable RLS
ALTER TABLE contribution_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_contributions ENABLE ROW LEVEL SECURITY;

-- Policies for contribution_years
CREATE POLICY "Users can view contribution years for their VvE"
  ON contribution_years FOR SELECT
  USING (
    exists (
      select 1 from vve_memberships
      where vve_memberships.vve_id = contribution_years.vve_id
      and vve_memberships.user_id = auth.uid()
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/Board can manage contribution years"
  ON contribution_years FOR ALL
  USING (
    exists (
      select 1 from vve_memberships
      where vve_memberships.vve_id = contribution_years.vve_id
      and vve_memberships.user_id = auth.uid()
      and vve_memberships.role IN ('admin', 'board', 'manager')
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

-- Policies for member_contributions
CREATE POLICY "Users can view their own contributions"
  ON member_contributions FOR SELECT
  USING (
    member_id = auth.uid() OR
    exists (
      select 1 from vve_memberships
      where vve_memberships.vve_id = member_contributions.vve_id
      and vve_memberships.user_id = auth.uid()
      and vve_memberships.role IN ('admin', 'board', 'manager', 'audit_comm') -- Audit comm needs access too
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/Board can manage member contributions"
  ON member_contributions FOR ALL
  USING (
    exists (
      select 1 from vve_memberships
      where vve_memberships.vve_id = member_contributions.vve_id
      and vve_memberships.user_id = auth.uid()
      and vve_memberships.role IN ('admin', 'board', 'manager')
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );
