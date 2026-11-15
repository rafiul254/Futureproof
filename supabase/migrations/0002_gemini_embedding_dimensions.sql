-- OPTIONAL: switch embedding columns to 768 dimensions for Gemini
-- text-embedding-004 / gemini-embedding-001.
--
-- Only run this if EMBEDDING_PROVIDER=gemini. The default schema uses 1536,
-- which matches OpenAI text-embedding-3-small (the spec default).
--
-- Run BEFORE generating embeddings, or re-run the embedding script after.

alter table skills       alter column embedding type vector(768) using embedding::vector(768);
alter table occupations  alter column embedding type vector(768) using embedding::vector(768);
alter table job_postings alter column embedding type vector(768) using embedding::vector(768);

drop index if exists skills_embedding_idx;
drop index if exists occupations_embedding_idx;
drop index if exists postings_embedding_idx;

create index skills_embedding_idx      on skills using hnsw (embedding vector_cosine_ops);
create index occupations_embedding_idx on occupations using hnsw (embedding vector_cosine_ops);
create index postings_embedding_idx    on job_postings using hnsw (embedding vector_cosine_ops);

create or replace function match_skills(
  query_embedding vector(768),
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
  query_embedding vector(768),
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
