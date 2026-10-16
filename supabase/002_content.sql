-- Run after 001_init.sql. No existing product or media rows are removed.

alter table public.categories
  add column if not exists image_id uuid references public.product_images(id) on delete set null;

create table if not exists public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  value text not null check (char_length(value) between 1 and 300),
  sort_order integer not null default 0,
  unique (product_id, name)
);
create index if not exists product_attributes_product_order_idx on public.product_attributes(product_id, sort_order);

create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_documents_product_order_idx on public.product_documents(product_id, sort_order);

create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  image_id uuid references public.product_images(id) on delete set null,
  cta_label text not null default '',
  cta_href text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_banners_active_order_idx on public.site_banners(is_active, sort_order);
drop trigger if exists site_banners_updated_at on public.site_banners;
create trigger site_banners_updated_at before update on public.site_banners
for each row execute function public.set_updated_at();

alter table public.product_attributes enable row level security;
alter table public.product_documents enable row level security;
alter table public.site_banners enable row level security;

create policy "public published product attributes" on public.product_attributes
for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy "admin product attributes" on public.product_attributes
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public published product documents" on public.product_documents
for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy "admin product documents" on public.product_documents
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public active banners" on public.site_banners
for select to anon, authenticated using (is_active);
create policy "admin site banners" on public.site_banners
for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-documents', 'product-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
allowed_mime_types = excluded.allowed_mime_types;
create policy "published product document files" on storage.objects for select to anon, authenticated using (
  bucket_id = 'product-documents' and exists (
    select 1 from public.product_documents document
    join public.products product on product.id = document.product_id
    where document.storage_path = storage.objects.name and product.status = 'published'
  )
);
create policy "admin read product document files" on storage.objects for select to authenticated
using (bucket_id = 'product-documents' and public.is_admin());
create policy "admin upload product documents" on storage.objects for insert to authenticated
with check (bucket_id = 'product-documents' and public.is_admin());
create policy "admin delete product documents" on storage.objects for delete to authenticated
using (bucket_id = 'product-documents' and public.is_admin());
