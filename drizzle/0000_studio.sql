CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS examples (
  id serial PRIMARY KEY, revision integer NOT NULL DEFAULT 1, archived boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS example_revisions (
  example_id integer NOT NULL REFERENCES examples(id), revision integer NOT NULL,
  text text NOT NULL, normalized text NOT NULL, PRIMARY KEY (example_id, revision)
);
CREATE TABLE IF NOT EXISTS blueprints (
  id serial PRIMARY KEY, job_id uuid UNIQUE NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS batches (
  id serial PRIMARY KEY, topic text NOT NULL, mode text NOT NULL, version_id integer NOT NULL,
  profiles jsonb NOT NULL, blueprint jsonb NOT NULL, plan jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS drafts (
  batch_id integer NOT NULL REFERENCES batches(id), slot integer NOT NULL CHECK (slot BETWEEN 1 AND 25),
  profile text NOT NULL, angle text NOT NULL, device text NOT NULL, text text NOT NULL, assessment jsonb NOT NULL,
  PRIMARY KEY (batch_id, slot)
);
CREATE TABLE IF NOT EXISTS draft_archive (
  id bigserial PRIMARY KEY, batch_id integer NOT NULL REFERENCES batches(id), text text NOT NULL
);
CREATE TABLE IF NOT EXISTS embeddings (
  model text NOT NULL, hash text NOT NULL, value vector(3072) NOT NULL, PRIMARY KEY (model, hash)
);
CREATE TABLE IF NOT EXISTS studio_jobs (
  id uuid PRIMARY KEY, mode text NOT NULL, kind text NOT NULL,
  status text NOT NULL, batch_id integer REFERENCES batches(id), slot integer,
  input jsonb NOT NULL, phase text NOT NULL, completed integer NOT NULL DEFAULT 0, total integer,
  error text, result jsonb, created_at timestamptz NOT NULL DEFAULT now(), queued_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS studio_one_active_job ON studio_jobs (mode) WHERE status IN ('queued','working');
CREATE TABLE IF NOT EXISTS studio_migrations (file text PRIMARY KEY);
ALTER TABLE blueprints ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'demo';
