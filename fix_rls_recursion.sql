
-- FIX MICRO-RECURSIE & RLS
-- Probleem: De functie 'get_my_association_ids' checkt 'association_memberships'.
-- Maar 'association_memberships' heeft ook RLS. Dit zorgt soms voor een oneindige loop,
-- waardoor Supabase uit veiligheid "0 resultaten" teruggeeft.

-- Oplossing: Maak de functie SECURITY DEFINER.
-- Dit betekent: "Voer uit met rechten van de maker (admin)", dus negeer RLS tijdens deze check.

CREATE OR REPLACE FUNCTION get_my_association_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER -- <--- DIT IS DE FIX
SET search_path = public -- Veiligheid: forceer public schema
STABLE
AS $$
  SELECT array_agg(association_id)
  FROM association_memberships
  WHERE user_id = auth.uid();
$$;

-- Veiligheidshalve ook de access policy voor bank transancties simpeler maken
-- We droppen de oude ingewikkelde policies en maken 1 simpele 'Leden' policy
DROP POLICY IF EXISTS "Select_bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can view bank transactions for their association" ON bank_transactions;

CREATE POLICY "Users can view bank transactions for their association"
ON bank_transactions FOR SELECT
TO authenticated
USING (
    association_id = ANY(get_my_association_ids())
);

-- Verifieer dat de functie nu SECURITY DEFINER is
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'get_my_association_ids';
