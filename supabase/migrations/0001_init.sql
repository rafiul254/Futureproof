-- FutureProof: initial schema
-- Spec section 5. Runs on Supabase (Postgres 15 + pgvector).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ reference

create table skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_bn     text,
  category    text,
  source_id   text unique,
  embedding   vector(1536)
);

create table occupations (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  title_bn    text,
  onet_code   text,
  description text,
  embedding   vector(1536)
);

create table tasks (
  id                  uuid primary key default gen_random_uuid(),
  occupation_id       uuid not null references occupations(id) on delete cascade,
  description         text not null,
  importance          numeric,
  ai_exposure         numeric not null check (ai_exposure >= 0 and ai_exposure <= 1),
  exposure_source     text,
  exposure_method     text not null check (exposure_method in ('published_dataset','llm_estimated')),
  exposure_confidence numeric
);

create table occupation_skills (
  occupation_id uuid not null references occupations(id) on delete cascade,
  skill_id      uuid not null references skills(id) on delete cascade,
  importance    numeric not null,
  primary key (occupation_id, skill_id)
);

create table task_skills (
  task_id  uuid not null references tasks(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  primary key (task_id, skill_id)
);

create table job_postings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  company       text,
  source        text not null,
  source_url    text,
  posted_at     date,
  location      text,
  raw_text      text,
  occupation_id uuid references occupations(id) on delete set null,
  is_synthetic  boolean not null default false,
  embedding     vector(1536)
);

create table posting_skills (
  posting_id uuid not null references job_postings(id) on delete cascade,
  skill_id   uuid not null references skills(id) on delete cascade,
  primary key (posting_id, skill_id)
);

create table skill_demand (
  skill_id       uuid primary key references skills(id) on delete cascade,
  count_30d      integer not null default 0,
  count_prev_30d integer not null default 0,
  updated_at     timestamptz not null default now()
);

create table courses (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  provider       text,
  url            text,
  language       text,
  cost_usd       numeric,
  duration_hours numeric,
  level          text,
  skill_ids      uuid[],
  verified       boolean not null default false
);

-- ---------------------------------------------------------------------- user

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  locale     text not null default 'bn',
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table cv_uploads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  storage_path  text,
  scrubbed_text text,
  parsed_json   jsonb,
  created_at    timestamptz not null default now()
);

create table analyses (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  cv_id                uuid references cv_uploads(id) on delete set null,
  target_occupation_id uuid references occupations(id) on delete set null,
  score                numeric,
  result_json          jsonb,
  created_at           timestamptz not null default now()
);

create table llm_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  purpose     text not null,
  model       text not null,
  prompt_hash text,
  tokens_in   integer,
  tokens_out  integer,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- indexes

create index skills_name_idx          on skills (name);
create index skills_category_idx      on skills (category);
create index occupations_title_idx    on occupations (title);
create index tasks_occupation_idx     on tasks (occupation_id);
create index task_skills_skill_idx    on task_skills (skill_id);
create index occ_skills_skill_idx     on occupation_skills (skill_id);
create index postings_posted_at_idx   on job_postings (posted_at);
create index postings_occupation_idx  on job_postings (occupation_id);
create index posting_skills_skill_idx on posting_skills (skill_id);
create index courses_verified_idx     on courses (verified) where verified = true;
create index cv_uploads_user_idx      on cv_uploads (user_id, created_at desc);
create index analyses_user_idx        on analyses (user_id, created_at desc);
create index audit_created_idx        on llm_audit_log (created_at desc);

-- Vector indexes (hnsw; build after seeding for speed)
create index skills_embedding_idx      on skills using hnsw (embedding vector_cosine_ops);
create index occupations_embedding_idx on occupations using hnsw (embedding vector_cosine_ops);
create index postings_embedding_idx    on job_postings using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------- RLS

alter table profiles         enable row level security;
alter table cv_uploads       enable row level security;
alter table analyses         enable row level security;
alter table skills           enable row level security;
alter table occupations      enable row level security;
alter table tasks            enable row level security;
alter table occupation_skills enable row level security;
alter table task_skills      enable row level security;
alter table job_postings     enable row level security;
alter table posting_skills   enable row level security;
alter table skill_demand     enable row level security;
alter table courses          enable row level security;
alter table llm_audit_log    enable row level security;

-- Own rows only
create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "cv_uploads_self" on cv_uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "analyses_self" on analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference tables: read-only for everyone (the app works signed out)
create policy "reference_read" on skills           for select using (true);
create policy "reference_read" on occupations      for select using (true);
create policy "reference_read" on tasks            for select using (true);
create policy "reference_read" on occupation_skills for select using (true);
create policy "reference_read" on task_skills      for select using (true);
create policy "reference_read" on job_postings     for select using (true);
create policy "reference_read" on posting_skills   for select using (true);
create policy "reference_read" on skill_demand     for select using (true);
create policy "reference_read" on courses          for select using (true);

-- Audit log: insert-only for the service role
create policy "audit_service_insert" on llm_audit_log
  for insert to service_role with check (true);

grant usage on schema public to anon, authenticated;
grant select on skills, occupations, tasks, occupation_skills, task_skills,
                job_postings, posting_skills, skill_demand, courses to anon, authenticated;

-- ----------------------------------------------------------------- functions

/**
 * Nearest skills by cosine similarity.
 * Used for CV skill normalisation.
 */
create or replace function match_skills(
  query_embedding vector(1536),
  match_threshold float default 0.8,
  match_count int default 5
)
returns table (id uuid, name text, name_bn text, similarity float)
language sql stable as $$
  select s.id, s.name, s.name_bn,
         1 - (s.embedding <=> query_embedding) as similarity
  from skills s
  where s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) > match_threshold
  order by s.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_occupations(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (id uuid, title text, title_bn text, similarity float)
language sql stable as $$
  select o.id, o.title, o.title_bn,
         1 - (o.embedding <=> query_embedding) as similarity
  from occupations o
  where o.embedding is not null
    and 1 - (o.embedding <=> query_embedding) > match_threshold
  order by o.embedding <=> query_embedding
  limit match_count;
$$;

/**
 * Deletes CV records older than 30 days (retention rule).
 * Schedule with pg_cron or Supabase scheduled functions:
 *   select cron.schedule('cv-retention','0 3 * * *','select purge_expired_cv_uploads();');
 */
create or replace function purge_expired_cv_uploads()
returns integer
language plpgsql security definer as $$
declare
  removed integer;
begin
  delete from cv_uploads where created_at < now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;
