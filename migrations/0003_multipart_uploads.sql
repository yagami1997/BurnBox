alter table upload_plans add column declared_size integer;
alter table upload_plans add column chunk_size integer;
alter table upload_plans add column multipart_upload_id text;
alter table upload_plans add column status text not null default 'created';
alter table upload_plans add column updated_at text;

update upload_plans
set
  declared_size = coalesce(declared_size, 0),
  chunk_size = coalesce(chunk_size, 5242880),
  multipart_upload_id = coalesce(multipart_upload_id, ''),
  status = coalesce(status, 'ready'),
  updated_at = coalesce(updated_at, created_at);

create table if not exists upload_parts (
  file_id text not null,
  part_number integer not null,
  etag text not null,
  size integer not null,
  created_at text not null,
  primary key (file_id, part_number),
  foreign key (file_id) references upload_plans(file_id)
);

create index if not exists idx_upload_parts_file_id on upload_parts(file_id);
