-- Richmond Fire District Water System Management
-- Initial Schema Migration

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create enum for user roles
create type user_role as enum ('admin', 'editor', 'member');

-- Create enum for infrastructure types
create type infrastructure_type as enum ('shutoff_valve', 'hydrant', 'well', 'meter', 'reservoir');

-- Create enum for infrastructure status
create type infrastructure_status as enum ('active', 'inactive', 'maintenance', 'unknown');

-- ============================================
-- PROFILES TABLE
-- Extends Supabase Auth users
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role user_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- METERS TABLE
-- Reference table for water meters
-- ============================================
create table meters (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  serial_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger meters_updated_at
  before update on meters
  for each row execute function update_updated_at();

-- ============================================
-- RESERVOIRS TABLE
-- Reference table for reservoirs
-- ============================================
create table reservoirs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  capacity_gallons numeric,
  max_level_feet numeric,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reservoirs_updated_at
  before update on reservoirs
  for each row execute function update_updated_at();

-- ============================================
-- INFRASTRUCTURE POINTS TABLE
-- Map points for water system infrastructure
-- (Created before chlorine_readings which references it)
-- ============================================
create table infrastructure_points (
  id uuid primary key default uuid_generate_v4(),
  type infrastructure_type not null,
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  properties jsonb default '{}',
  status infrastructure_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger infrastructure_points_updated_at
  before update on infrastructure_points
  for each row execute function update_updated_at();

create index infrastructure_points_type_idx on infrastructure_points(type);

-- ============================================
-- WATER PRODUCTION READINGS TABLE
-- Meter readings for water production
-- ============================================
create table water_production_readings (
  id uuid primary key default uuid_generate_v4(),
  recorded_at timestamptz not null default now(),
  meter_id uuid references meters(id) on delete set null,
  reading_value numeric not null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index water_production_readings_recorded_at_idx on water_production_readings(recorded_at desc);
create index water_production_readings_meter_id_idx on water_production_readings(meter_id);

-- ============================================
-- CHLORINE READINGS TABLE
-- Chlorine level readings
-- ============================================
create table chlorine_readings (
  id uuid primary key default uuid_generate_v4(),
  recorded_at timestamptz not null default now(),
  location_id uuid references infrastructure_points(id) on delete set null,
  residual_level numeric not null check (residual_level >= 0 and residual_level <= 10),
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index chlorine_readings_recorded_at_idx on chlorine_readings(recorded_at desc);

-- ============================================
-- RESERVOIR READINGS TABLE
-- Reservoir level readings
-- ============================================
create table reservoir_readings (
  id uuid primary key default uuid_generate_v4(),
  recorded_at timestamptz not null default now(),
  reservoir_id uuid references reservoirs(id) on delete set null,
  level_feet numeric not null,
  level_percent numeric,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index reservoir_readings_recorded_at_idx on reservoir_readings(recorded_at desc);
create index reservoir_readings_reservoir_id_idx on reservoir_readings(reservoir_id);

-- ============================================
-- CONTACTS TABLE
-- Contact directory
-- ============================================
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  phone text,
  email text,
  contact_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

-- ============================================
-- PARCELS TABLE
-- GeoJSON parcel boundaries for map overlay
-- ============================================
create table parcels (
  id uuid primary key default uuid_generate_v4(),
  parcel_id text unique,
  owner_name text,
  address text,
  geometry jsonb not null,
  properties jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger parcels_updated_at
  before update on parcels
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table meters enable row level security;
alter table reservoirs enable row level security;
alter table water_production_readings enable row level security;
alter table chlorine_readings enable row level security;
alter table reservoir_readings enable row level security;
alter table infrastructure_points enable row level security;
alter table contacts enable row level security;
alter table parcels enable row level security;

-- Helper function to get user role
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- Helper function to check if user is admin
create or replace function is_admin()
returns boolean as $$
  select get_user_role() = 'admin';
$$ language sql security definer;

-- Helper function to check if user is editor or admin
create or replace function is_editor_or_admin()
returns boolean as $$
  select get_user_role() in ('admin', 'editor');
$$ language sql security definer;

-- PROFILES POLICIES
create policy "Users can view all profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on profiles for update
  to authenticated
  using (is_admin());

-- METERS POLICIES (View: all, Manage: admin)
create policy "All users can view meters"
  on meters for select
  to authenticated
  using (true);

create policy "Admins can manage meters"
  on meters for all
  to authenticated
  using (is_admin());

-- RESERVOIRS POLICIES (View: all, Manage: admin)
create policy "All users can view reservoirs"
  on reservoirs for select
  to authenticated
  using (true);

create policy "Admins can manage reservoirs"
  on reservoirs for all
  to authenticated
  using (is_admin());

-- WATER PRODUCTION READINGS POLICIES
create policy "All users can view water production readings"
  on water_production_readings for select
  to authenticated
  using (true);

create policy "Editors can insert water production readings"
  on water_production_readings for insert
  to authenticated
  with check (is_editor_or_admin());

create policy "Editors can update water production readings"
  on water_production_readings for update
  to authenticated
  using (is_editor_or_admin());

create policy "Admins can delete water production readings"
  on water_production_readings for delete
  to authenticated
  using (is_admin());

-- CHLORINE READINGS POLICIES
create policy "All users can view chlorine readings"
  on chlorine_readings for select
  to authenticated
  using (true);

create policy "Editors can insert chlorine readings"
  on chlorine_readings for insert
  to authenticated
  with check (is_editor_or_admin());

create policy "Editors can update chlorine readings"
  on chlorine_readings for update
  to authenticated
  using (is_editor_or_admin());

create policy "Admins can delete chlorine readings"
  on chlorine_readings for delete
  to authenticated
  using (is_admin());

-- RESERVOIR READINGS POLICIES
create policy "All users can view reservoir readings"
  on reservoir_readings for select
  to authenticated
  using (true);

create policy "Editors can insert reservoir readings"
  on reservoir_readings for insert
  to authenticated
  with check (is_editor_or_admin());

create policy "Editors can update reservoir readings"
  on reservoir_readings for update
  to authenticated
  using (is_editor_or_admin());

create policy "Admins can delete reservoir readings"
  on reservoir_readings for delete
  to authenticated
  using (is_admin());

-- INFRASTRUCTURE POINTS POLICIES (View: all, Manage: admin)
create policy "All users can view infrastructure points"
  on infrastructure_points for select
  to authenticated
  using (true);

create policy "Admins can manage infrastructure points"
  on infrastructure_points for all
  to authenticated
  using (is_admin());

-- CONTACTS POLICIES
create policy "All users can view contacts"
  on contacts for select
  to authenticated
  using (true);

create policy "Editors can insert contacts"
  on contacts for insert
  to authenticated
  with check (is_editor_or_admin());

create policy "Editors can update contacts"
  on contacts for update
  to authenticated
  using (is_editor_or_admin());

create policy "Admins can delete contacts"
  on contacts for delete
  to authenticated
  using (is_admin());

-- PARCELS POLICIES (View: all, Manage: admin)
create policy "All users can view parcels"
  on parcels for select
  to authenticated
  using (true);

create policy "Admins can manage parcels"
  on parcels for all
  to authenticated
  using (is_admin());
