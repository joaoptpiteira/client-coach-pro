
-- Set search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Revoke EXECUTE from public/anon/authenticated on internal trigger functions
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.pt_clients_set_numero() from public, anon, authenticated;
