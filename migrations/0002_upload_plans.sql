create table if not exists upload_plans (
  file_id text primary key,
  storage_key text not null,
  filename text not null,
  content_type text not null,
  created_at text not null,
  completed_at text
);

create index if not exists idx_upload_plans_created_at on upload_plans(created_at desc);
