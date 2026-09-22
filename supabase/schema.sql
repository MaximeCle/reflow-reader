-- reflow-reader: multi-device sync schema.
--
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor).
-- It is safe to re-run: every statement is idempotent.
--
-- Model: there are no user accounts. A "sync code" generated on one device
-- and typed into another is the only credential. Each device signs in with
-- Supabase's anonymous auth (enable it first — see README.md) and calls
-- join_sync_group(code), which records that anonymous identity as a member
-- of the group named by that code. Row Level Security then only lets a
-- device read or write rows belonging to a group it has actually joined —
-- knowing the code is what proves membership, not a stored password.

create table if not exists sync_groups (
  code text primary key,
  created_at timestamptz not null default now()
);

create table if not exists sync_group_members (
  code text not null references sync_groups (code) on delete cascade,
  member uuid not null,
  joined_at timestamptz not null default now(),
  primary key (code, member)
);

create table if not exists library_entries (
  code text not null references sync_groups (code) on delete cascade,
  id text not null,
  title text not null,
  page_count integer not null,
  added_at bigint not null,
  last_read_at bigint not null,
  progress double precision not null,
  bookmark jsonb,
  reading_position jsonb,
  primary key (code, id)
);

create table if not exists document_content (
  code text not null references sync_groups (code) on delete cascade,
  id text not null,
  document jsonb not null,
  primary key (code, id)
);

alter table sync_groups enable row level security;
alter table sync_group_members enable row level security;
alter table library_entries enable row level security;
alter table document_content enable row level security;

-- No policies on sync_groups / sync_group_members: only the security-definer
-- functions below (owned by the table owner, which bypasses RLS) touch them.
-- A client can join a group; it can never list who else is in one.

create or replace function is_sync_member(target_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from sync_group_members
    where code = target_code and member = auth.uid()
  );
$$;

create or replace function join_sync_group(target_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into sync_groups (code) values (target_code)
    on conflict (code) do nothing;
  insert into sync_group_members (code, member) values (target_code, auth.uid())
    on conflict do nothing;
end;
$$;

revoke all on function join_sync_group(text) from public;
grant execute on function join_sync_group(text) to authenticated;

drop policy if exists "members read library entries" on library_entries;
create policy "members read library entries" on library_entries
  for select using (is_sync_member(code));

drop policy if exists "members write library entries" on library_entries;
create policy "members write library entries" on library_entries
  for insert with check (is_sync_member(code));

drop policy if exists "members update library entries" on library_entries;
create policy "members update library entries" on library_entries
  for update using (is_sync_member(code)) with check (is_sync_member(code));

drop policy if exists "members delete library entries" on library_entries;
create policy "members delete library entries" on library_entries
  for delete using (is_sync_member(code));

drop policy if exists "members read document content" on document_content;
create policy "members read document content" on document_content
  for select using (is_sync_member(code));

drop policy if exists "members write document content" on document_content;
create policy "members write document content" on document_content
  for insert with check (is_sync_member(code));

drop policy if exists "members update document content" on document_content;
create policy "members update document content" on document_content
  for update using (is_sync_member(code)) with check (is_sync_member(code));

drop policy if exists "members delete document content" on document_content;
create policy "members delete document content" on document_content
  for delete using (is_sync_member(code));

-- Live updates for the library list while two devices are open at once.
-- Document content is large and effectively static, so it is left out.
do $$
begin
  alter publication supabase_realtime add table library_entries;
exception
  when duplicate_object then null; -- already added by a previous run
end $$;
