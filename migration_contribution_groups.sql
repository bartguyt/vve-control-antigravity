-- Create contribution_groups table
CREATE TABLE IF NOT EXISTS contribution_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vve_id UUID REFERENCES vves(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(vve_id, name)
);

-- Create contribution_year_amounts table
-- Links a group to a specific amount for a specific year
CREATE TABLE IF NOT EXISTS contribution_year_amounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  year_id UUID REFERENCES contribution_years(id) ON DELETE CASCADE,
  group_id UUID REFERENCES contribution_groups(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(year_id, group_id)
);

-- Create member_group_assignments table
-- Assigns a member to a group (current assignment)
CREATE TABLE IF NOT EXISTS member_group_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES contribution_groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(member_id) -- A member can only be in one group at a time implies "primary" group
);

-- Modify member_contributions to track which group they were in
ALTER TABLE member_contributions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES contribution_groups(id) ON DELETE SET NULL;


-- Enable RLS
ALTER TABLE contribution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_year_amounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_group_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for contribution_groups
CREATE POLICY "Users can view contribution groups for their VvE"
  ON contribution_groups FOR SELECT
  USING (
    exists (
      select 1 from vve_memberships
      where vve_memberships.vve_id = contribution_groups.vve_id
      and vve_memberships.user_id = auth.uid()
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/Board can manage contribution groups"
  ON contribution_groups FOR ALL
  USING (
    exists (
      select 1 from vve_memberships
      where vve_memberships.vve_id = contribution_groups.vve_id
      and vve_memberships.user_id = auth.uid()
      and vve_memberships.role IN ('admin', 'board', 'manager')
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

-- Policies for contribution_year_amounts
CREATE POLICY "Users can view contribution year amounts"
  ON contribution_year_amounts FOR SELECT
  USING (
    exists (
      select 1 from contribution_years
      join vve_memberships on vve_memberships.vve_id = contribution_years.vve_id
      where contribution_years.id = contribution_year_amounts.year_id
      and vve_memberships.user_id = auth.uid()
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/Board can manage contribution year amounts"
  ON contribution_year_amounts FOR ALL
  USING (
    exists (
        select 1 from contribution_years
        join vve_memberships on vve_memberships.vve_id = contribution_years.vve_id
        where contribution_years.id = contribution_year_amounts.year_id
        and vve_memberships.user_id = auth.uid()
        and vve_memberships.role IN ('admin', 'board', 'manager')
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );

-- Policies for member_group_assignments
CREATE POLICY "Users can view member group assignments"
  ON member_group_assignments FOR SELECT
  USING (
    exists (
      select 1 from contribution_groups
      join vve_memberships on vve_memberships.vve_id = contribution_groups.vve_id
      where contribution_groups.id = member_group_assignments.group_id
      and vve_memberships.user_id = auth.uid()
    ) OR
    exists (
       select 1 from app_admins where app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/Board can manage member group assignments"
  ON member_group_assignments FOR ALL
  USING (
    exists (
        select 1 from contribution_groups
        join vve_memberships on vve_memberships.vve_id = contribution_groups.vve_id
        where contribution_groups.id = member_group_assignments.group_id
        and vve_memberships.user_id = auth.uid()
        and vve_memberships.role IN ('admin', 'board', 'manager')
    ) OR
    exists (
      select 1 from app_admins
      where app_admins.user_id = auth.uid()
    )
  );
