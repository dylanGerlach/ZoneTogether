-- Allow the same user to belong to multiple teams within a single project.
-- Previously the composite PK (project_id, user_id) enforced a single team per user per project.

alter table public.project_team_members
  drop constraint if exists project_team_members_pkey;

alter table public.project_team_members
  add constraint project_team_members_pkey
  primary key (project_id, team_id, user_id);
