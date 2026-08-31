-- GraceDay · Escribirle a los tuyos
--
-- La política de la Fase 5 pedía ser tutor para **cualquier** recado. Con eso,
-- una niña abría «Recados» y no tenía ningún botón para mandar nada: ni a su
-- mamá, ni a su hermana. Un botón que no está y no dice por qué es el mismo
-- fallo que un botón apagado.
--
-- La línea correcta no es «quién puede escribir» sino **«quién puede meterle
-- algo en el horario a otro»**:
--
-- - **Un mensaje o un recordatorio** se lo manda cualquiera a cualquiera de sus
--   grupos. Se lee, se contesta, y no toca el día de nadie.
-- - **Una tarea** entra en el horario de quien la recibe, así que sigue siendo
--   cosa de un papá o una mamá.

create or replace function claude_graceday.comparto_grupo_con(otra uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from miembros_grupo yo
    join miembros_grupo suyo on suyo.grupo_id = yo.grupo_id
    where yo.persona_id = (select auth.uid()) and yo.estado = 'activo'
      and suyo.persona_id = otra and suyo.estado = 'activo'
  )
$$;

drop policy mando_a_los_mios on encargos;

create policy mando_a_los_mios on encargos
  for insert with check (
    de_persona_id = (select auth.uid())
    and claude_graceday.comparto_grupo_con(para_persona_id)
    -- Meterle una tarea en el horario a otro sí es cosa de un tutor.
    and (tipo <> 'tarea' or claude_graceday.soy_tutor_de(para_persona_id))
  );
