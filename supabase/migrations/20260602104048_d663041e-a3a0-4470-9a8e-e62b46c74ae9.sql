
-- Enum: tipo de serviço
create type public.pt_service_type as enum ('mensalidade', 'pack');

-- Enum: previsão do próximo mês
create type public.pt_forecast as enum ('continuar', 'parar', 'indefinido');

-- Tabela principal
create table public.pt_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  numero int not null,
  nome text not null,
  service_type public.pt_service_type not null default 'mensalidade',
  valor_acordado numeric(10,2) not null default 0,
  valor_recebido numeric(10,2) not null default 0,
  valor_attivo numeric(10,2) not null default 0,
  valor_ginasio numeric(10,2) not null default 0,
  treinos_pagos int not null default 0,
  treinos_dados int not null default 0,
  forecast public.pt_forecast not null default 'indefinido',
  forecast_valor numeric(10,2),
  forecast_notas text,
  ativo boolean not null default true,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero)
);

create index pt_clients_owner_idx on public.pt_clients (owner_id, numero);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pt_clients_set_updated_at
before update on public.pt_clients
for each row execute function public.set_updated_at();

-- Auto-numeração por owner
create or replace function public.pt_clients_set_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero is null or new.numero = 0 then
    select coalesce(max(numero), 0) + 1
      into new.numero
      from public.pt_clients
      where owner_id = new.owner_id;
  end if;
  return new;
end;
$$;

create trigger pt_clients_auto_numero
before insert on public.pt_clients
for each row execute function public.pt_clients_set_numero();

-- Grants
grant select, insert, update, delete on public.pt_clients to authenticated;
grant all on public.pt_clients to service_role;

-- RLS
alter table public.pt_clients enable row level security;

create policy "Owner can read own clients"
  on public.pt_clients for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Owner can insert own clients"
  on public.pt_clients for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owner can update own clients"
  on public.pt_clients for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owner can delete own clients"
  on public.pt_clients for delete
  to authenticated
  using (auth.uid() = owner_id);
