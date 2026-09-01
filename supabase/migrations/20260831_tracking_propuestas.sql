create or replace function public.registrar_apertura_propuesta(p_propuesta_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  filas_modificadas integer;
  fecha_actual timestamptz := now();
begin
  update public.propuestas
  set datos = jsonb_set(
    jsonb_set(
      jsonb_set(datos, '{propuesta,aperturas}', to_jsonb(coalesce((datos #>> '{propuesta,aperturas}')::integer, 0) + 1), true),
      '{propuesta,primeraApertura}', coalesce(datos #> '{propuesta,primeraApertura}', to_jsonb(fecha_actual)), true
    ),
    '{propuesta,ultimaApertura}', to_jsonb(fecha_actual), true
  )
  where datos #>> '{propuesta,id}' = p_propuesta_id;
  get diagnostics filas_modificadas = row_count;
  return filas_modificadas = 1;
end;
$$;

create or replace function public.revelar_bonificacion_propuesta(p_propuesta_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  filas_modificadas integer;
begin
  update public.propuestas
  set datos = jsonb_set(
    jsonb_set(datos, '{propuesta,bonificacionRevelada}', 'true'::jsonb, true),
    '{propuesta,fechaBonificacionRevelada}', to_jsonb(now()), true
  )
  where datos #>> '{propuesta,id}' = p_propuesta_id
    and coalesce((datos #>> '{propuesta,bonificacion}')::numeric, 0) > 0;
  get diagnostics filas_modificadas = row_count;
  return filas_modificadas = 1;
end;
$$;

revoke all on function public.registrar_apertura_propuesta(text) from public;
revoke all on function public.revelar_bonificacion_propuesta(text) from public;
grant execute on function public.registrar_apertura_propuesta(text) to anon, authenticated;
grant execute on function public.revelar_bonificacion_propuesta(text) to anon, authenticated;
