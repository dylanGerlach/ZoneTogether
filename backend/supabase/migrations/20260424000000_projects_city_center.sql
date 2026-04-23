-- Add city and center coordinates to projects so the map can open centered on the selected city.

alter table public.projects
  add column if not exists city text,
  add column if not exists center_lat double precision,
  add column if not exists center_lng double precision;

-- Backfill any pre-existing rows with the prior hardcoded default center (San Francisco)
-- so we can safely apply NOT NULL below without breaking historical data.
update public.projects
set city = coalesce(city, 'San Francisco'),
    center_lat = coalesce(center_lat, 37.7749),
    center_lng = coalesce(center_lng, -122.4194);

alter table public.projects
  alter column city set not null,
  alter column center_lat set not null,
  alter column center_lng set not null;

alter table public.projects
  add constraint projects_center_lat_range check (center_lat between -90 and 90),
  add constraint projects_center_lng_range check (center_lng between -180 and 180);
