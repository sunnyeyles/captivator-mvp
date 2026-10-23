-- Example Postgres schema for a production version, not used by the MVP
create table customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  website_url text,
  created_at timestamptz not null default now()
);

create table rentals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Only a hash of the emailed token is stored, so a leaked row can't be used to sign in
create table magic_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  expires_at timestamptz not null
);

-- Config is the PortalConfig JSON the editor already validates with Zod
create table designs (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references rentals (id) on delete cascade,
  name text not null,
  template_id text not null,
  config jsonb not null,
  published_config jsonb,
  published_at timestamptz,
  slug text unique,
  updated_at timestamptz not null default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  s3_key text not null unique,
  content_type text not null,
  created_at timestamptz not null default now()
);
