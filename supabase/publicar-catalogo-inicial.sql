-- Execute no SQL Editor do projeto Supabase da MG Borrachas, com acesso de proprietário.
-- Publica SOMENTE os 15 SKUs já importados; não insere nem altera outros dados.
begin;

do $$
declare
  total integer;
  categorias_inativas integer;
  estados_inesperados integer;
begin
  select count(*),
         count(*) filter (where not c.is_active),
         count(*) filter (where p.status not in ('draft', 'published'))
    into total, categorias_inativas, estados_inesperados
  from public.products p
  join public.categories c on c.id = p.category_id
  where p.sku = any (array[
    'MG001','MG002','MG003','MG004','MG005',
    'MG006','MG007','MG008','MG009','MG010',
    'MG011','MG012','MG013','MG014','MG015'
  ]);

  if total <> 15 then
    raise exception 'Esperados 15 produtos existentes; encontrados %. Nenhum produto foi publicado.', total;
  end if;
  if categorias_inativas > 0 then
    raise exception '% produtos estão em categorias inativas. Revise as categorias antes de publicar.', categorias_inativas;
  end if;
  if estados_inesperados > 0 then
    raise exception '% produtos estão arquivados ou em estado inesperado. Revise antes de publicar.', estados_inesperados;
  end if;

  update public.products
     set status = 'published'
   where sku = any (array[
     'MG001','MG002','MG003','MG004','MG005',
     'MG006','MG007','MG008','MG009','MG010',
     'MG011','MG012','MG013','MG014','MG015'
   ])
     and status = 'draft';
end $$;

commit;

-- Deve retornar published = 15 e total = 15. Esta consulta no SQL Editor usa
-- o acesso do proprietário; confira também pelo site, que usa a chave pública.
select count(*) as total,
       count(*) filter (where status = 'published') as published
from public.products
where sku = any (array[
  'MG001','MG002','MG003','MG004','MG005',
  'MG006','MG007','MG008','MG009','MG010',
  'MG011','MG012','MG013','MG014','MG015'
]);
