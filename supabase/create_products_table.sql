create extension if not exists pgcrypto;

create table if not exists products (
    id uuid primary key default gen_random_uuid(),
    product_title text,
    product_name text not null,
    price numeric(10,2),
    discount text,
    benefit text,
    affiliate_link text not null,
    image_url text not null,
    hashtags text,
    caption text,
    instagram_enabled boolean default true,
    telegram_enabled boolean default true,
    pinterest_enabled boolean default true,
    telegram_posted boolean default false,
    instagram_posted boolean default false,
    pinterest_posted boolean default false,
    created_at timestamptz default now()
);

-- Ensure columns exist if the table was already created
alter table products add column if not exists product_title text;
alter table products add column if not exists discount text;
alter table products add column if not exists benefit text;
alter table products add column if not exists hashtags text;
alter table products add column if not exists telegram_posted boolean default false;
alter table products add column if not exists instagram_posted boolean default false;
alter table products add column if not exists pinterest_posted boolean default false;

alter table products enable row level security;

drop policy if exists "Allow public read access to products" on products;
create policy "Allow public read access to products"
on products
for select
to public
using (true);

drop policy if exists "Allow public insert into products" on products;
create policy "Allow public insert into products"
on products
for insert
to public
with check (true);

drop policy if exists "Allow public update of products" on products;
create policy "Allow public update of products"
on products
for update
to public
using (true)
with check (true);

drop policy if exists "Allow public delete of products" on products;
create policy "Allow public delete of products"
on products
for delete
to public
using (true);

drop policy if exists "Allow public read access to product images" on storage.objects;
create policy "Allow public read access to product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Allow public upload to product images" on storage.objects;
create policy "Allow public upload to product images"
on storage.objects
for insert
to public
with check (bucket_id = 'product-images');

drop policy if exists "Allow public update product images" on storage.objects;
create policy "Allow public update product images"
on storage.objects
for update
to public
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');
