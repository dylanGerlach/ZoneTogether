-- Add project-scoped group chats and H3 grid references on messages.
--
-- 1) message_session.project_id (nullable FK to projects). At most one session
--    per project is enforced with a partial unique index so existing org-only
--    sessions (project_id IS NULL) are unaffected.
-- 2) message.h3_cell (nullable). Holds an H3 cell index string for messages
--    that reference a specific grid cell on the project map.

alter table public.message_session
  add column if not exists project_id uuid;

alter table public.message_session
  drop constraint if exists message_session_project_id_fkey;

alter table public.message_session
  add constraint message_session_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

create unique index if not exists message_session_project_id_unique
  on public.message_session (project_id)
  where project_id is not null;

alter table public.message
  add column if not exists h3_cell text;
