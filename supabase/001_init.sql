-- Execute in the Supabase SQL editor before running the import script.
create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_profiles where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^[A-Za-z0-9_-]{1,30}$'),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid not null references public.categories(id) on delete restrict,
  short_description text not null default '',
  description text not null default '',
  applications text not null default '',
  features text[] not null default '{}',
  technical jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  custom boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists one_primary_image_per_product on public.product_images(product_id) where is_primary;

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'MG Borrachas',
  whatsapp text not null default '5571981417081',
  instagram text not null default 'https://www.instagram.com/mgborrachas.oficial/',
  hero_title text not null default 'Soluções em borracha para sua indústria.',
  hero_description text not null default 'Peças técnicas, vedação, amortecimento, revestimentos e soluções sob medida para diferentes aplicações.',
  hero_skus text[] not null default '{}',
  about_text text not null default 'A MG Borrachas apresenta produtos de borracha para aplicações industriais, manutenção, vedação, amortecimento e peças técnicas.',
  seo_title text not null default 'MG Borrachas | Peças e Soluções em Borracha Industrial',
  seo_description text not null default 'Conheça a MG Borrachas. Produtos de borracha, vedação, coxins, rodas, lençóis, componentes industriais e soluções sob medida. Solicite orçamento.',
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1) on conflict (id) do nothing;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists settings_updated_at on public.site_settings;
create trigger settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create index if not exists products_category_status_idx on public.products(category_id, status);
create index if not exists products_status_order_idx on public.products(status, sort_order, created_at desc);
create index if not exists product_images_product_order_idx on public.product_images(product_id, sort_order);
create index if not exists categories_active_order_idx on public.categories(is_active, sort_order);

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.site_settings enable row level security;

create policy "admin profile own read" on public.admin_profiles for select to authenticated using (user_id = auth.uid());
create policy "public active categories" on public.categories for select to anon, authenticated using (is_active);
create policy "admin categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public published products" on public.products for select to anon, authenticated using (status = 'published');
create policy "admin products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public product images" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products where products.id = product_id and products.status = 'published'));
create policy "admin product images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admin site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "published product image files" on storage.objects for select to anon, authenticated using (
  bucket_id = 'product-images' and exists (
    select 1 from public.product_images image
    join public.products product on product.id = image.product_id
    where image.storage_path = storage.objects.name and product.status = 'published'
  )
);
create policy "admin read product image files" on storage.objects for select to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "admin upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
