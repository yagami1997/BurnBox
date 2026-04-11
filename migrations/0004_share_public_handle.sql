alter table shares add column public_handle text;

create unique index if not exists idx_shares_public_handle on shares(public_handle);
