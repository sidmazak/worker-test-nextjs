create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  complexity text not null default 'medium' check (complexity in ('low', 'medium', 'high')),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  worker_id text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  step text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_heartbeats (
  worker_id text primary key,
  status text not null default 'idle' check (status in ('idle', 'processing', 'stopping', 'offline')),
  jobs_processed integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);

create index if not exists jobs_status_created_idx on public.jobs (status, created_at);
create index if not exists job_events_job_id_created_idx on public.job_events (job_id, created_at);
create index if not exists worker_heartbeats_last_seen_idx on public.worker_heartbeats (last_seen_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create or replace function public.claim_next_job(worker_name text)
returns setof public.jobs
language plpgsql
security definer
as $$
begin
  return query
  with candidate as (
    select j.id
    from public.jobs j
    where j.status = 'pending'
    order by j.created_at asc
    for update skip locked
    limit 1
  )
  update public.jobs j
  set status = 'processing',
      worker_id = worker_name,
      claimed_at = now(),
      progress = greatest(j.progress, 5)
  from candidate
  where j.id = candidate.id
  returning j.*;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert on public.jobs to anon, authenticated;
grant select on public.job_events to anon, authenticated;
grant insert on public.job_events to anon, authenticated, service_role;
grant select on public.worker_heartbeats to anon, authenticated;
grant all on public.jobs to service_role;
grant all on public.worker_heartbeats to service_role;

alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.worker_heartbeats enable row level security;

drop policy if exists "jobs_select_public" on public.jobs;
create policy "jobs_select_public" on public.jobs
for select
to anon, authenticated
using (true);

drop policy if exists "jobs_insert_public" on public.jobs;
create policy "jobs_insert_public" on public.jobs
for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "job_events_select_public" on public.job_events;
create policy "job_events_select_public" on public.job_events
for select
to anon, authenticated
using (true);

drop policy if exists "job_events_insert_public" on public.job_events;
create policy "job_events_insert_public" on public.job_events
for insert
to anon, authenticated, service_role
with check (true);

drop policy if exists "worker_heartbeats_select_public" on public.worker_heartbeats;
create policy "worker_heartbeats_select_public" on public.worker_heartbeats
for select
to anon, authenticated
using (true);

drop policy if exists "service_role_jobs_update" on public.jobs;
create policy "service_role_jobs_update" on public.jobs
for update
to service_role
using (true)
with check (true);

drop policy if exists "service_role_worker_heartbeats_write" on public.worker_heartbeats;
create policy "service_role_worker_heartbeats_write" on public.worker_heartbeats
for all
to service_role
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'job_events'
  ) then
    alter publication supabase_realtime add table public.job_events;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'worker_heartbeats'
  ) then
    alter publication supabase_realtime add table public.worker_heartbeats;
  end if;
end $$;

insert into public.jobs (title, status, complexity, input, result, progress, completed_at)
values (
  'Seeded sample job',
  'completed',
  'low',
  '{"source":"seed"}'::jsonb,
  '{"durationMs":450,"summary":"Seed data ready"}'::jsonb,
  100,
  now()
)
on conflict do nothing;
