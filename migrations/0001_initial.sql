create table if not exists files (
  id text primary key,
  filename text not null,
  storage_key text not null,
  size integer not null,
  content_type text not null,
  tags_json text,
  note text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists shares (
  id text primary key,
  file_id text not null,
  token_hash text not null,
  expires_at text not null,
  max_downloads integer,
  download_count integer not null default 0,
  revoked_at text,
  created_at text not null,
  foreign key (file_id) references files(id)
);

create table if not exists audit_logs (
  id text primary key,
  actor text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  meta_json text,
  created_at text not null
);

create index if not exists idx_files_created_at on files(created_at desc);
create index if not exists idx_shares_file_id on shares(file_id);
create index if not exists idx_shares_token_hash on shares(token_hash);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
