-- System messages for project chat join/leave events.
--
-- Adds message.kind to distinguish regular text messages from system
-- messages emitted when members are added/removed from a session.
-- Default 'text' keeps every existing row and every non-system write path
-- working without changes.

alter table public.message
  add column if not exists kind text not null default 'text';

alter table public.message
  drop constraint if exists message_kind_check;

alter table public.message
  add constraint message_kind_check
  check (kind in ('text', 'system_join', 'system_leave'));
