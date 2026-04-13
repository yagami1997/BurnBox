create table if not exists owner_account (
  id text primary key,
  email text not null unique,
  recovery_email text,
  password_hash text not null,
  password_algo text not null,
  password_updated_at text not null,
  workspace_claimed_at text not null,
  email_otp_enabled integer not null default 0,
  last_login_at text,
  last_login_ip text,
  failed_login_count integer not null default 0,
  locked_until text,
  session_version integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists claim_tokens (
  id text primary key,
  token_hash text not null unique,
  source text not null,
  expires_at text not null,
  used_at text,
  created_at text not null
);

create table if not exists password_reset_tokens (
  id text primary key,
  owner_id text not null,
  token_hash text not null unique,
  expires_at text not null,
  used_at text,
  created_at text not null,
  foreign key (owner_id) references owner_account(id)
);

create table if not exists recovery_codes (
  id text primary key,
  owner_id text not null,
  code_hash text not null unique,
  used_at text,
  created_at text not null,
  foreign key (owner_id) references owner_account(id)
);

create table if not exists auth_events (
  id text primary key,
  event_type text not null,
  success integer not null,
  ip text,
  country text,
  user_agent text,
  detail_json text,
  created_at text not null
);

create index if not exists idx_claim_tokens_active on claim_tokens(expires_at, used_at);
create index if not exists idx_password_reset_tokens_active on password_reset_tokens(expires_at, used_at);
create index if not exists idx_recovery_codes_owner_id on recovery_codes(owner_id);
create index if not exists idx_auth_events_created_at on auth_events(created_at desc);
