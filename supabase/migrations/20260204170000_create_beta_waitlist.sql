create extension if not exists "pgcrypto";

create table if not exists public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  beta_status text not null default 'open' check (beta_status in ('open', 'full')),
  request_source text,
  requested_at timestamptz not null default now(),
  last_request_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  activated_at timestamptz
);

create index if not exists beta_waitlist_status_idx on public.beta_waitlist (status);
