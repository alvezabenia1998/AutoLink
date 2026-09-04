do $$
declare
  propuesta_prueba text;
  fila_prueba bigint;
  datos_originales jsonb;
  visitante_prueba uuid := gen_random_uuid();
  primera jsonb;
  segunda jsonb;
begin
  select id, datos #>> '{propuesta,id}', datos
    into fila_prueba, propuesta_prueba, datos_originales
  from public.propuestas
  where user_id is not null
  order by created_at desc
  limit 1;

  if propuesta_prueba is null then
    raise exception 'No hay una propuesta disponible para verificar el debounce';
  end if;

  primera := public.registrar_visita_cotizacion(propuesta_prueba, visitante_prueba, 30);
  segunda := public.registrar_visita_cotizacion(propuesta_prueba, visitante_prueba, 30);

  if coalesce((primera ->> 'significativa')::boolean, false) is not true then
    raise exception 'La primera visita debería ser significativa';
  end if;

  if coalesce((segunda ->> 'significativa')::boolean, true) is not false then
    raise exception 'La segunda visita debería quedar dentro del debounce';
  end if;

  delete from public.visitantes_cotizacion where id = visitante_prueba;
  update public.propuestas set datos = datos_originales where id = fila_prueba;
end;
$$;
