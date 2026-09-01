-- GraceDay · Fase 5 — La familia, la campanita y el calendario
--
-- Cuatro tablas: grupos, miembros_grupo, encargos y eventos.
--
-- Una familia es un grupo de tipo `familia`. No hay tabla `familias` aparte,
-- así todo lo que sirve para la casa sirve igual para las amigas o la iglesia.
--
-- La capa 2 del modelo de tres capas, la que faltaba desde la Fase 1: los
-- eventos no borran la rutina, la tapan. Un feriado libra el día de colegio
-- pero deja el devocional y la cena, porque el colegio se cancela y la vida no.

-- ---------------------------------------------------------------- tipos

create type graceday_tipo_grupo    as enum ('familia', 'amigos', 'iglesia', 'otro');
-- Solo dos roles: quien cuida y quien es cuidado. Quién creó el grupo NO es un
-- rol —está en `grupos.creado_por`—, porque si lo fuera, la niña que monta la
-- app para su familia sería la jefa y su mamá no podría mandarle nada.
create type graceday_rol_grupo     as enum ('tutor', 'miembro');
create type graceday_estado_miembro as enum ('invitado', 'activo', 'salio');
create type graceday_tipo_encargo  as enum ('tarea', 'recordatorio', 'consejo');
create type graceday_estado_encargo as enum ('pendiente', 'hecho', 'archivado');
create type graceday_tipo_evento   as enum (
  'feriado', 'escolar', 'examen', 'entrega', 'cumpleanos', 'cita', 'viaje', 'personal'
);
create type graceday_efecto_evento as enum ('libra_el_dia', 'bloquea_horas', 'solo_avisa');
create type graceday_repeticion_evento as enum ('ninguna', 'anual');
create type graceday_origen_evento as enum ('manual', 'foto', 'sistema');

-- ---------------------------------------------------------------- grupos

create table graceday_grupos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) between 1 and 60),
  tipo        graceday_tipo_grupo not null default 'familia',
  emoji       text not null default '👥',
  creado_por  uuid not null references graceday_personas (id) on delete cascade,
  creado_en   timestamptz not null default now()
);

create index graceday_grupos_creador on graceday_grupos (creado_por);

create table graceday_miembros_grupo (
  grupo_id          uuid not null references graceday_grupos (id) on delete cascade,
  persona_id        uuid not null references graceday_personas (id) on delete cascade,
  rol               graceday_rol_grupo not null default 'miembro',
  -- Lo decide cada quien, por grupo, y lo puede apagar cuando quiera. En la
  -- familia no manda del todo: un tutor ve a sus hijos igual (ver
  -- `puedo_ver_calendario_de`), y la app se lo dice al hijo en su pantalla.
  ve_mi_calendario  boolean not null default false,
  estado            graceday_estado_miembro not null default 'invitado',
  entro_en          timestamptz not null default now(),
  primary key (grupo_id, persona_id)
);

create index graceday_miembros_por_persona on graceday_miembros_grupo (persona_id, estado);

-- ---------------------------------------------------------------- encargos

create table graceday_encargos (
  id                uuid primary key default gen_random_uuid(),
  de_persona_id     uuid not null references graceday_personas (id) on delete cascade,
  para_persona_id   uuid not null references graceday_personas (id) on delete cascade,
  titulo            text not null check (length(trim(titulo)) between 1 and 120),
  nota              text,
  fecha             date not null,
  hora_sugerida     time,
  tipo              graceday_tipo_encargo not null default 'tarea',
  estado            graceday_estado_encargo not null default 'pendiente',
  -- Lo que contesta quien lo recibe. Lo ve quien lo mandó.
  respuesta         text,
  respondido_en     timestamptz,
  visto_en          timestamptz,
  creado_en         timestamptz not null default now(),

  -- Nadie se manda recados a sí mismo: sería una tarea, y para eso está la
  -- pantalla de tareas.
  constraint a_otra_persona check (de_persona_id <> para_persona_id),
  -- Si hay respuesta hay fecha de respuesta, y al revés. Una respuesta sin
  -- fecha no se puede ordenar, y una fecha sin respuesta miente.
  constraint respuesta_coherente check (
    (respuesta is null) = (respondido_en is null)
  )
);

create index graceday_encargos_para on graceday_encargos (para_persona_id, estado, fecha);
create index graceday_encargos_de   on graceday_encargos (de_persona_id, creado_en desc);

-- La tarea del día se acuerda de qué recado la trajo: así, marcarla aquí se
-- ve allá, y quien la mandó se entera de que ya está.
alter table graceday_tareas_dia
  add column encargo_id uuid references graceday_encargos (id) on delete set null;

create index graceday_tareas_por_encargo on graceday_tareas_dia (encargo_id);

-- ---------------------------------------------------------------- eventos

create table graceday_eventos (
  id            uuid primary key default gen_random_uuid(),
  -- De un grupo entero (el feriado del país) o de una persona (su examen).
  grupo_id      uuid references graceday_grupos (id) on delete cascade,
  persona_id    uuid references graceday_personas (id) on delete cascade,
  tipo          graceday_tipo_evento not null default 'personal',
  titulo        text not null check (length(trim(titulo)) between 1 and 120),
  descripcion   text,
  fecha_inicio  date not null,
  fecha_fin     date not null,
  todo_el_dia   boolean not null default true,
  hora_inicio   time,
  hora_fin      time,
  -- `anual` es lo que hace que un cumpleaños vuelva cada año.
  repeticion    graceday_repeticion_evento not null default 'ninguna',
  efecto        graceday_efecto_evento not null default 'solo_avisa',
  origen        graceday_origen_evento not null default 'manual',
  confianza     real check (confianza between 0 and 1),
  -- Nada leído de una foto entra al horario sin que un humano lo apruebe.
  confirmado    boolean not null default true,
  creado_en     timestamptz not null default now(),

  constraint de_alguien check (grupo_id is not null or persona_id is not null),
  constraint fechas_ordenadas check (fecha_fin >= fecha_inicio),
  -- Un evento con hora necesita las dos, y ordenadas. Uno de todo el día no
  -- lleva ninguna: media hora suelta no se puede pintar en el horario.
  constraint horas_coherentes check (
    case
      when todo_el_dia then hora_inicio is null and hora_fin is null
      else hora_inicio is not null and hora_fin is not null and hora_fin > hora_inicio
    end
  ),
  -- Lo leído de una foto trae su confianza; lo escrito a mano, no.
  constraint confianza_solo_de_foto check (
    (origen = 'foto') or confianza is null
  )
);

create index graceday_eventos_por_fecha   on graceday_eventos (fecha_inicio, fecha_fin);
create index graceday_eventos_por_persona on graceday_eventos (persona_id);
create index graceday_eventos_por_grupo   on graceday_eventos (grupo_id);

-- -------------------------------------------------- quién ve qué (ayudas)
--
-- Estas funciones son `security definer` a propósito: una política sobre
-- `miembros_grupo` que consultara `miembros_grupo` se llamaría a sí misma sin
-- parar. Ninguna recibe datos de fuera que cambien lo que devuelve — todas
-- responden sobre `auth.uid()` —, así que no enseñan nada que la política no
-- fuera a enseñar igual.

create or replace function mis_grupos()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select grupo_id from graceday_miembros_grupo
  where persona_id = (select auth.uid()) and estado = 'activo'
$$;

-- Incluye los grupos a los que me invitaron: hay que poder ver el nombre de un
-- grupo para decidir si se entra.
create or replace function mis_grupos_y_invitaciones()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select grupo_id from graceday_miembros_grupo
  where persona_id = (select auth.uid()) and estado <> 'salio'
$$;

/** ¿Administro este grupo? Puede quien lo creó y puede un tutor. */
create or replace function administro(grupo uuid)
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

/** ¿Soy papá o mamá de esta persona? Solo cuenta dentro de una familia. */
create or replace function soy_tutor_de(otra uuid)
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

create or replace function comparto_grupo_con(otra uuid)
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

/**
 * ¿Puedo ver el calendario de esta persona?
 *
 * Es la misma regla que `graceday_grupos.ts` en la app, escrita aquí porque es aquí
 * donde de verdad se cumple: la app puede equivocarse, la base de datos no.
 */
create or replace function puedo_ver_calendario_de(otra uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select otra = (select auth.uid())
      or soy_tutor_de(otra)
      or exists (
        select 1
        from graceday_miembros_grupo yo
        join graceday_miembros_grupo suyo on suyo.grupo_id = yo.grupo_id
        where yo.persona_id = (select auth.uid()) and yo.estado = 'activo'
          and suyo.persona_id = otra and suyo.estado = 'activo'
          and suyo.ve_mi_calendario
      )
$$;

-- --------------------------------------------------------- quién ve qué

alter table graceday_grupos          enable row level security;
alter table graceday_miembros_grupo  enable row level security;
alter table graceday_encargos        enable row level security;
alter table graceday_eventos         enable row level security;

create policy mios on graceday_grupos
  for select using (id in (select mis_grupos_y_invitaciones()));

create policy creo_yo on graceday_grupos
  for insert with check (creado_por = (select auth.uid()));

create policy administro_yo on graceday_grupos
  for update using (administro(id)) with check (administro(id));

create policy borro_lo_que_cree on graceday_grupos
  for delete using (creado_por = (select auth.uid()));

create policy de_mis_grupos on graceday_miembros_grupo
  for select using (grupo_id in (select mis_grupos_y_invitaciones()));

create policy invito_yo on graceday_miembros_grupo
  for insert with check (
    administro(grupo_id)
    -- O me estoy metiendo yo en el grupo que acabo de crear.
    or (persona_id = (select auth.uid())
        and exists (select 1 from graceday_grupos g
                    where g.id = grupo_id and g.creado_por = (select auth.uid())))
  );

-- Mi propia fila la cambio yo: aceptar, apagar «que vean mi calendario», irme.
create policy mi_propia_fila on graceday_miembros_grupo
  for update using (persona_id = (select auth.uid()) or administro(grupo_id))
  with check (persona_id = (select auth.uid()) or administro(grupo_id));

create policy saco_yo on graceday_miembros_grupo
  for delete using (persona_id = (select auth.uid()) or administro(grupo_id));

create policy mios on graceday_encargos
  for select using (
    de_persona_id = (select auth.uid()) or para_persona_id = (select auth.uid())
  );

-- Solo un tutor manda encargos, y solo a los suyos.
create policy mando_a_los_mios on graceday_encargos
  for insert with check (
    de_persona_id = (select auth.uid()) and soy_tutor_de(para_persona_id)
  );

create policy los_dos_lados on graceday_encargos
  for update using (
    de_persona_id = (select auth.uid()) or para_persona_id = (select auth.uid())
  ) with check (
    de_persona_id = (select auth.uid()) or para_persona_id = (select auth.uid())
  );

create policy borra_quien_mando on graceday_encargos
  for delete using (de_persona_id = (select auth.uid()));

create policy visibles on graceday_eventos
  for select using (
    (persona_id is not null and puedo_ver_calendario_de(persona_id))
    or (grupo_id is not null and grupo_id in (select mis_grupos()))
  );

create policy pongo_yo on graceday_eventos
  for all using (
    (persona_id = (select auth.uid()))
    or (persona_id is not null and soy_tutor_de(persona_id))
    or (grupo_id is not null and administro(grupo_id))
  ) with check (
    (persona_id = (select auth.uid()))
    or (persona_id is not null and soy_tutor_de(persona_id))
    or (grupo_id is not null and administro(grupo_id))
  );

-- ------------------------------------- lo de antes, ahora también para el tutor
--
-- Las políticas de la Fase 1 decían «solo lo mío». Un papá tiene que poder
-- abrir el día de su hija, así que se AÑADEN políticas de solo lectura. Las de
-- escritura no se tocan: mirar no es escribir, y esto no le da a nadie permiso
-- para marcarle las tareas a otro.

create policy de_mi_gente on graceday_personas
  for select using (id = (select auth.uid()) or comparto_grupo_con(id));

create policy de_quien_puedo_ver on graceday_ajustes
  for select using (puedo_ver_calendario_de(persona_id));

create policy de_quien_puedo_ver on graceday_actividades
  for select using (puedo_ver_calendario_de(persona_id));

create policy de_quien_puedo_ver on graceday_rutina
  for select using (puedo_ver_calendario_de(persona_id));

create policy de_quien_puedo_ver on graceday_dias
  for select using (puedo_ver_calendario_de(persona_id));

create policy de_quien_puedo_ver on graceday_tareas_dia
  for select using (
    dia_id in (select id from graceday_dias where puedo_ver_calendario_de(persona_id))
  );

create policy de_quien_puedo_ver on graceday_rachas
  for select using (puedo_ver_calendario_de(persona_id));

create policy de_quien_puedo_ver on graceday_logros_ganados
  for select using (puedo_ver_calendario_de(persona_id));

-- ---------------------------------------------------------------- la casa

-- Al registrarse, cada quien nace con su familia: así se puede añadir a mamá
-- sin pasar antes por una pantalla de «crear un grupo».
create or replace function claude_graceday.crear_familia_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nueva uuid;
begin
  insert into graceday_grupos (nombre, tipo, emoji, creado_por)
  values ('Mi familia', 'familia', '🏠', new.id)
  returning id into nueva;

  -- Quien instala entra como miembro, no como tutor: montar la app para tu
  -- casa no te hace la mamá. Si eres papá, lo cambias en Familia.
  insert into graceday_miembros_grupo (grupo_id, persona_id, rol, ve_mi_calendario, estado)
  values (nueva, new.id, 'miembro', true, 'activo');

  return new;
end;
$$;

-- El nombre lleva apellido porque la migración 0002 ya usó `al_crear_persona`
-- para las rachas. Los dos disparadores conviven: Postgres los ejecuta en
-- orden de nombre.
create trigger al_crear_persona_su_familia
  after insert on graceday_personas
  for each row execute function claude_graceday.crear_familia_al_registrarse();

-- Igual que en la migración 0003: una función `security definer` no tiene por
-- qué poder llamarse a mano desde la app. Las de las políticas sí se quedan
-- —las llama la propia consulta—, pero el disparador no.
revoke execute on function claude_graceday.crear_familia_al_registrarse() from public, anon, authenticated;
