create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  description text,
  h3_resolution integer not null default 8 check (h3_resolution between 0 and 15),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists projects_org_name_key
  on public.projects (organization_id, lower(name));

create table if not exists public.project_teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_teams_project_name_key
  on public.project_teams (project_id, lower(name));

create unique index if not exists project_teams_project_color_key
  on public.project_teams (project_id, color_hex);

create table if not exists public.project_team_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  team_id uuid not null references public.project_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_team_members_team_idx
  on public.project_team_members (team_id);

create table if not exists public.project_hex_assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  h3_cell text not null,
  team_id uuid not null references public.project_teams(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, h3_cell)
);

create index if not exists project_hex_assignments_team_idx
  on public.project_hex_assignments (project_id, team_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists project_teams_set_updated_at on public.project_teams;
create trigger project_teams_set_updated_at
before update on public.project_teams
for each row execute procedure public.set_updated_at();

drop trigger if exists project_hex_assignments_set_updated_at on public.project_hex_assignments;
create trigger project_hex_assignments_set_updated_at
before update on public.project_hex_assignments
for each row execute procedure public.set_updated_at();

create or replace function public.user_is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.user_is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  );
$$;

alter table public.projects enable row level security;
alter table public.project_teams enable row level security;
alter table public.project_team_members enable row level security;
alter table public.project_hex_assignments enable row level security;

drop policy if exists "projects_select_org_members" on public.projects;
create policy "projects_select_org_members"
on public.projects
for select
using (public.user_is_org_member(organization_id));

drop policy if exists "projects_mutate_org_admins" on public.projects;
create policy "projects_mutate_org_admins"
on public.projects
for all
using (public.user_is_org_admin(organization_id))
with check (public.user_is_org_admin(organization_id));

drop policy if exists "project_teams_select_org_members" on public.project_teams;
create policy "project_teams_select_org_members"
on public.project_teams
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_teams.project_id
      and public.user_is_org_member(p.organization_id)
  )
);

drop policy if exists "project_teams_mutate_org_admins" on public.project_teams;
create policy "project_teams_mutate_org_admins"
on public.project_teams
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_teams.project_id
      and public.user_is_org_admin(p.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_teams.project_id
      and public.user_is_org_admin(p.organization_id)
  )
);

drop policy if exists "project_team_members_select_org_members" on public.project_team_members;
create policy "project_team_members_select_org_members"
on public.project_team_members
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_team_members.project_id
      and public.user_is_org_member(p.organization_id)
  )
);

drop policy if exists "project_team_members_mutate_org_admins" on public.project_team_members;
create policy "project_team_members_mutate_org_admins"
on public.project_team_members
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_team_members.project_id
      and public.user_is_org_admin(p.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_team_members.project_id
      and public.user_is_org_admin(p.organization_id)
  )
);

drop policy if exists "project_hex_assignments_select_org_members" on public.project_hex_assignments;
create policy "project_hex_assignments_select_org_members"
on public.project_hex_assignments
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_hex_assignments.project_id
      and public.user_is_org_member(p.organization_id)
  )
);

drop policy if exists "project_hex_assignments_mutate_org_admins" on public.project_hex_assignments;
create policy "project_hex_assignments_mutate_org_admins"
on public.project_hex_assignments
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_hex_assignments.project_id
      and public.user_is_org_admin(p.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_hex_assignments.project_id
      and public.user_is_org_admin(p.organization_id)
  )
);
