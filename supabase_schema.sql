-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create VvE (Tenants) Table
create table public.vves (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Profiles Table (Linked to Auth)
create type public.app_role as enum ('admin', 'bestuur', 'kascommissie', 'techcommissie', 'lid');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  vve_id uuid references public.vves,
  role public.app_role default 'lid'::public.app_role,
  
  -- Member Details
  lid_nummer text,
  bouwnummer text,
  straat text,
  huisnummer text,
  postcode text,
  stad text,
  telefoon text,
  email text, -- synced from auth for convenience
  
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Row Level Security (RLS) Configuration

-- Enable RLS
alter table public.vves enable row level security;
alter table public.profiles enable row level security;

-- Function to get current user's VvE ID (bypassing RLS to avoid recursion)
create or replace function public.get_my_vve_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select vve_id from profiles where id = auth.uid();
$$;

-- Policy: Users can view their own VvE
create policy "Users can view their own VvE"
  on public.vves for select
  using (
    id = get_my_vve_id()
  );

-- Policy: Users can ALWAYS see their own profile (simple, fast, non-recursive)
create policy "Users can view own profile"
  on public.profiles for select
  using (
    id = auth.uid()
  );

-- Policy: Users can see profiles within their VvE
create policy "Users can view members of their VvE"
  on public.profiles for select
  using (
    vve_id = get_my_vve_id()
  );

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( id = auth.uid() );
