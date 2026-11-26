create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  birth_date date not null check (birth_date <= current_date),
  photo_path text,
  created_at timestamptz not null default now(),
  constraint dogs_one_per_user unique (user_id)
);

alter table public.dogs enable row level security;

grant select, insert, update on table public.dogs to authenticated;

drop policy if exists "Users can read their own dog" on public.dogs;
create policy "Users can read their own dog"
  on public.dogs for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own dog" on public.dogs;
create policy "Users can create their own dog"
  on public.dogs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own dog" on public.dogs;
create policy "Users can update their own dog"
  on public.dogs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'dog-photos',
  'dog-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users can read their own dog photos" on storage.objects;
create policy "Users can read their own dog photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own dog photos" on storage.objects;
create policy "Users can upload their own dog photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own dog photos" on storage.objects;
create policy "Users can update their own dog photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own dog photos" on storage.objects;
create policy "Users can delete their own dog photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
