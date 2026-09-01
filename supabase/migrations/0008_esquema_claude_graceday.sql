-- GraceDay · Las ayudas de las políticas, fuera de la API
--
-- La migración 0007 dejó seis funciones `security definer` en `public`, y todo
-- lo que vive en `public` sale publicado como endpoint REST: cualquiera con la
-- clave anónima podía llamar a `/rest/v1/rpc/soy_tutor_de`. No enseñaban nada
-- —todas contestan sobre `auth.uid()`—, pero una función que decide quién ve el
-- calendario de una niña no tiene por qué estar colgada de internet.
--
-- Se mudan a un esquema `claude_graceday`, que PostgREST no publica. Las
-- políticas las siguen llamando igual; lo único que desaparece es la puerta de
-- fuera. El nombre sigue la regla R7: todo lo que se crea en una base de datos
-- se llama `claude_<proyecto>`.
--
-- Igual que la 0003 hizo con los disparadores: la regla es la misma —lo que no
-- tiene que llamarse desde la app, no se puede llamar desde la app.

create schema if not exists claude_graceday;

-- Usar el esquema, no publicarlo. Hace falta porque las políticas se evalúan
-- con el rol de quien consulta.
grant usage on schema claude_graceday to anon, authenticated, service_role;

-- ------------------------------------------------- las mismas, ahí dentro

create or replace function claude_graceday.mis_grupos()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select grupo_id from graceday_miembros_grupo
  where persona_id = (select auth.uid()) and estado = 'activo'
$$;

create or replace function claude_graceday.mis_grupos_y_invitaciones()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select grupo_id from graceday_miembros_grupo
  where persona_id = (select auth.uid()) and estado <> 'salio'
$$;

create or replace function claude_graceday.administro(grupo uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from graceday_grupos g
    where g.id = grupo and g.creado_por = (select auth.uid())
  ) or exists (
    select 1 from graceday_miembros_grupo m
    where m.grupo_id = grupo and m.persona_id = (select auth.uid())
      and m.estado = 'activo' and m.rol = 'tutor'
  )
$$;

create or replace function claude_graceday.soy_tutor_de(otra uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from graceday_miembros_grupo yo
    join graceday_miembros_grupo suyo on suyo.grupo_id = yo.grupo_id
    join graceday_grupos g on g.id = yo.grupo_id
    where yo.persona_id = (select auth.uid())
      and yo.estado = 'activo' and yo.rol = 'tutor'
      and g.tipo = 'familia'
      and suyo.persona_id = otra
      and suyo.estado = 'activo' and suyo.rol = 'miembro'
  )
$$;

create or replace function claude_graceday.comparto_grupo_con(otra uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from graceday_miembros_grupo yo
    join graceday_miembros_grupo suyo on suyo.grupo_id = yo.grupo_id
    where yo.persona_id = (select auth.uid()) and yo.estado = 'activo'
      and suyo.persona_id = otra and suyo.estado = 'activo'
  )
$$;

create or replace function claude_graceday.puedo_ver_calendario_de(otra uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select otra = (select auth.uid())
      or claude_graceday.soy_tutor_de(otra)
      or exists (
        select 1
        from graceday_miembros_grupo yo
        join graceday_miembros_grupo suyo on suyo.grupo_id = yo.grupo_id
        where yo.persona_id = (select auth.uid()) and yo.estado = 'activo'
          and suyo.persona_id = otra and suyo.estado = 'activo'
          and suyo.ve_mi_calendario
      )
$$;

-- ------------------------------- las políticas, apuntando a las de dentro
--
-- Una política no se puede modificar en su sitio, así que se tira y se vuelve
-- a poner igual. Lo único que cambia es el nombre del esquema.

drop policy mios on graceday_grupos;
create policy mios on graceday_grupos
  for select using (id in (select claude_graceday.mis_grupos_y_invitaciones()));

drop policy administro_yo on graceday_grupos;
create policy administro_yo on graceday_grupos
  for update using (claude_graceday.administro(id)) with check (claude_graceday.administro(id));

drop policy de_mis_grupos on graceday_miembros_grupo;
create policy de_mis_grupos on graceday_miembros_grupo
  for select using (grupo_id in (select claude_graceday.mis_grupos_y_invitaciones()));

drop policy invito_yo on graceday_miembros_grupo;
create policy invito_yo on graceday_miembros_grupo
  for insert with check (
    claude_graceday.administro(grupo_id)
    or (persona_id = (select auth.uid())
        and exists (select 1 from graceday_grupos g
                    where g.id = grupo_id and g.creado_por = (select auth.uid())))
  );

drop policy mi_propia_fila on graceday_miembros_grupo;
create policy mi_propia_fila on graceday_miembros_grupo
  for update using (persona_id = (select auth.uid()) or claude_graceday.administro(grupo_id))
  with check (persona_id = (select auth.uid()) or claude_graceday.administro(grupo_id));

drop policy saco_yo on graceday_miembros_grupo;
create policy saco_yo on graceday_miembros_grupo
  for delete using (persona_id = (select auth.uid()) or claude_graceday.administro(grupo_id));

drop policy mando_a_los_mios on graceday_encargos;
create policy mando_a_los_mios on graceday_encargos
  for insert with check (
    de_persona_id = (select auth.uid()) and claude_graceday.soy_tutor_de(para_persona_id)
  );

drop policy visibles on graceday_eventos;
create policy visibles on graceday_eventos
  for select using (
    (persona_id is not null and claude_graceday.puedo_ver_calendario_de(persona_id))
    or (grupo_id is not null and grupo_id in (select claude_graceday.mis_grupos()))
  );

drop policy pongo_yo on graceday_eventos;
create policy pongo_yo on graceday_eventos
  for all using (
    (persona_id = (select auth.uid()))
    or (persona_id is not null and claude_graceday.soy_tutor_de(persona_id))
    or (grupo_id is not null and claude_graceday.administro(grupo_id))
  ) with check (
    (persona_id = (select auth.uid()))
    or (persona_id is not null and claude_graceday.soy_tutor_de(persona_id))
    or (grupo_id is not null and claude_graceday.administro(grupo_id))
  );

drop policy de_mi_gente on graceday_personas;
create policy de_mi_gente on graceday_personas
  for select using (id = (select auth.uid()) or claude_graceday.comparto_grupo_con(id));

drop policy de_quien_puedo_ver on graceday_ajustes;
create policy de_quien_puedo_ver on graceday_ajustes
  for select using (claude_graceday.puedo_ver_calendario_de(persona_id));

drop policy de_quien_puedo_ver on graceday_actividades;
create policy de_quien_puedo_ver on graceday_actividades
  for select using (claude_graceday.puedo_ver_calendario_de(persona_id));

drop policy de_quien_puedo_ver on graceday_rutina;
create policy de_quien_puedo_ver on graceday_rutina
  for select using (claude_graceday.puedo_ver_calendario_de(persona_id));

drop policy de_quien_puedo_ver on graceday_dias;
create policy de_quien_puedo_ver on graceday_dias
  for select using (claude_graceday.puedo_ver_calendario_de(persona_id));

drop policy de_quien_puedo_ver on graceday_tareas_dia;
create policy de_quien_puedo_ver on graceday_tareas_dia
  for select using (
    dia_id in (select id from graceday_dias where claude_graceday.puedo_ver_calendario_de(persona_id))
  );

drop policy de_quien_puedo_ver on graceday_rachas;
create policy de_quien_puedo_ver on graceday_rachas
  for select using (claude_graceday.puedo_ver_calendario_de(persona_id));

drop policy de_quien_puedo_ver on graceday_logros_ganados;
create policy de_quien_puedo_ver on graceday_logros_ganados
  for select using (claude_graceday.puedo_ver_calendario_de(persona_id));

-- ------------------------------------------------- fuera las de la puerta

drop function public.puedo_ver_calendario_de(uuid);
drop function public.comparto_grupo_con(uuid);
drop function public.soy_tutor_de(uuid);
drop function public.administro(uuid);
drop function public.mis_grupos_y_invitaciones();
drop function public.mis_grupos();
