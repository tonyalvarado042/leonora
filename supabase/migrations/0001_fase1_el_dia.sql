-- GraceDay · Fase 1 — El día, con alarmas
--
-- Siete tablas: personas, ajustes, actividades, rutina, dias, tareas_dia, avisos.
--
-- El modelo de tres capas del diseño:
--   1. rutina      → cómo es un lunes normal (casi nunca cambia)
--   2. (eventos)   → llega en la fase 5
--   3. dias + tareas_dia → el plan de una fecha concreta, generado desde la rutina.
--      Es una COPIA: mover algo hoy no toca la rutina.
--
-- Convención de días de la semana: 0 = domingo … 6 = sábado, igual que
-- Date.getDay() de JavaScript. La interfaz los muestra empezando en lunes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tipos

create type graceday_tipo_actividad as enum (
  'fe', 'estudio', 'casa', 'deporte', 'familia', 'descanso'
);

create type graceday_rol_persona   as enum ('tutor', 'hijo', 'adulto');
create type graceday_sexo_persona  as enum ('mujer', 'hombre', 'sin_decir');
create type graceday_tipo_cuenta   as enum ('completa', 'invitada');
create type graceday_ocupacion_tipo as enum ('colegio', 'trabajo', 'ambos', 'ninguno');
create type graceday_modo_rutina   as enum ('escolar', 'vacaciones');
create type graceday_tipo_dia      as enum ('escolar', 'fin_de_semana', 'feriado', 'vacaciones', 'especial');
create type graceday_estado_tarea  as enum ('pendiente', 'hecha', 'omitida', 'movida');
create type graceday_origen_tarea  as enum ('rutina', 'evento', 'encargo', 'ia', 'manual');
create type graceday_tipo_aviso    as enum ('tarea', 'recado', 'invitacion', 'oracion', 'evento', 'ciclo');
create type graceday_estado_aviso  as enum ('pendiente', 'programado', 'enviado', 'cancelado', 'fallido');
create type graceday_tema_app      as enum ('claro', 'oscuro', 'auto');

-- ---------------------------------------------------------------- personas

create table graceday_personas (
  id                uuid primary key references auth.users (id) on delete cascade,
  nombre            text not null check (length(trim(nombre)) between 1 and 60),
  email             text,
  fecha_nacimiento  date,
  rol               graceday_rol_persona  not null default 'hijo',
  sexo              graceday_sexo_persona not null default 'sin_decir',
  tipo_cuenta       graceday_tipo_cuenta  not null default 'completa',
  zona_horaria      text not null default 'America/Guatemala',
  -- El ícono por defecto; la foto es opcional y nunca sale en el Muro (fase 7).
  avatar_tipo       text not null default 'emoji' check (avatar_tipo in ('emoji','ilustracion','foto')),
  avatar_valor      text not null default '🙂',
  foto_url          text,
  creado_en         timestamptz not null default now()
);

-- ---------------------------------------------------------------- ajustes

create table graceday_ajustes (
  persona_id          uuid primary key references graceday_personas (id) on delete cascade,

  hora_despertar      time not null default '06:00',
  hora_dormir         time not null default '21:30',
  ocupacion           graceday_ocupacion_tipo not null default 'colegio',
  hora_fin_ocupacion  time not null default '14:00',
  -- Días de colegio/trabajo, como lista de 0-6.
  dias_ocupados       smallint[] not null default '{1,2,3,4,5}',

  avisos_activos      boolean not null default true,
  avisar_antes_min    smallint not null default 10 check (avisar_antes_min between 0 and 120),
  sonido_aviso        text not null default 'campana',
  sonido_devocional   text not null default 'arpa',
  vibrar              boolean not null default true,
  silencio_desde      time,
  silencio_hasta      time,

  tema                graceday_tema_app not null default 'auto',
  color_acento        text not null default 'morado',
  tamano_letra        text not null default 'normal',
  celebraciones       boolean not null default true,

  idioma              text not null default 'es',
  actualizado_en      timestamptz not null default now(),

  -- Las dos horas de silencio van juntas o no van.
  constraint silencio_completo check (
    (silencio_desde is null) = (silencio_hasta is null)
  )
);

-- ---------------------------------------------------------------- actividades

-- La lista única de cosas. Un hábito NO es otra tabla: es una actividad con
-- es_habito = true. Las rachas (fase 2) se cuentan sobre tareas_dia.
create table graceday_actividades (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references graceday_personas (id) on delete cascade,
  nombre        text not null check (length(trim(nombre)) between 1 and 80),
  tipo          graceday_tipo_actividad not null,
  emoji         text not null default '•',
  duracion_min  smallint not null default 30 check (duracion_min between 1 and 1440),
  es_habito     boolean not null default false,
  meta_semanal  smallint check (meta_semanal between 1 and 7),
  -- Ancla: la cena y el devocional no se mueven; "leer un rato" sí.
  es_fijo       boolean not null default false,
  -- null = usar ajustes.avisar_antes_min. Un valor propio le lleva la contraria.
  avisar        boolean not null default true,
  avisar_antes_min smallint check (avisar_antes_min between 0 and 120),
  activa        boolean not null default true,
  creado_en     timestamptz not null default now()
);

create index graceday_actividades_persona_idx on graceday_actividades (persona_id) where activa;

-- ---------------------------------------------------------------- rutina

-- Capa 1: cómo es un lunes normal.
create table graceday_rutina (
  id           uuid primary key default gen_random_uuid(),
  persona_id   uuid not null references graceday_personas (id) on delete cascade,
  actividad_id uuid not null references graceday_actividades (id) on delete cascade,
  modo         graceday_modo_rutina not null default 'escolar',
  dia_semana   smallint not null check (dia_semana between 0 and 6),
  hora_inicio  time not null,
  hora_fin     time not null,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),

  constraint rutina_horas_ordenadas check (hora_fin > hora_inicio)
);

create index graceday_rutina_busqueda_idx on graceday_rutina (persona_id, modo, dia_semana) where activo;

-- ---------------------------------------------------------------- dias

-- Capa 3: el plan de una fecha concreta.
create table graceday_dias (
  id                   uuid primary key default gen_random_uuid(),
  persona_id           uuid not null references graceday_personas (id) on delete cascade,
  fecha                date not null,
  tipo                 graceday_tipo_dia not null default 'escolar',
  modo_usado           graceday_modo_rutina not null default 'escolar',
  -- Por qué el día quedó así. Se llena cuando la IA lo ajusta (fase 3).
  nota_ia              text,
  porcentaje_cumplido  smallint not null default 0 check (porcentaje_cumplido between 0 and 100),
  generado_en          timestamptz not null default now(),

  unique (persona_id, fecha)
);

-- ---------------------------------------------------------------- tareas_dia

-- Lo que la persona marca. La app lee esta tabla todo el día.
create table graceday_tareas_dia (
  id             uuid primary key default gen_random_uuid(),
  dia_id         uuid not null references graceday_dias (id) on delete cascade,
  -- null cuando es una tarea suelta que no viene del catálogo.
  actividad_id   uuid references graceday_actividades (id) on delete set null,
  titulo         text not null check (length(trim(titulo)) between 1 and 120),
  emoji          text not null default '•',
  tipo           graceday_tipo_actividad not null,
  hora_inicio    time not null,
  hora_fin       time not null,
  orden          smallint not null default 0,
  es_fijo        boolean not null default false,
  origen         graceday_origen_tarea not null default 'rutina',

  estado         graceday_estado_tarea not null default 'pendiente',
  completado_en  timestamptz,
  nota           text,

  -- Fase 2 (rachas y premios): se llenan al marcar.
  minutos_reales     smallint,
  termino_de_verdad  boolean,
  puntos             smallint not null default 0,

  constraint tarea_horas_ordenadas check (hora_fin > hora_inicio),
  -- Una tarea hecha tiene fecha de cuándo; una pendiente no.
  constraint completado_coherente check (
    (estado = 'hecha') = (completado_en is not null)
  )
);

create index graceday_tareas_dia_dia_idx on graceday_tareas_dia (dia_id, hora_inicio, orden);

-- ---------------------------------------------------------------- avisos

-- Lo que alimenta la campanita (fase 5) y las alarmas del teléfono (fase 1).
create table graceday_avisos (
  id             uuid primary key default gen_random_uuid(),
  persona_id     uuid not null references graceday_personas (id) on delete cascade,
  tipo           graceday_tipo_aviso not null default 'tarea',
  referencia_id  uuid,
  momento        timestamptz not null,
  titulo         text not null,
  cuerpo         text,
  sonido         text,
  estado         graceday_estado_aviso not null default 'pendiente',
  -- El id que devuelve expo-notifications, para poder cancelarlo.
  id_local       text,
  enviado_en     timestamptz,
  leido_en       timestamptz,
  creado_en      timestamptz not null default now()
);

create index graceday_avisos_pendientes_idx on graceday_avisos (persona_id, momento)
  where estado in ('pendiente', 'programado');

-- ---------------------------------------------------------------- RLS
--
-- Fase 1: cada quien ve lo suyo y nada más. En la fase 5, cuando lleguen los
-- grupos, el tutor gana acceso a sus hijos — menos a `ciclo`, que no se abre
-- nunca.

alter table graceday_personas    enable row level security;
alter table graceday_ajustes     enable row level security;
alter table graceday_actividades enable row level security;
alter table graceday_rutina      enable row level security;
alter table graceday_dias        enable row level security;
alter table graceday_tareas_dia  enable row level security;
alter table graceday_avisos      enable row level security;

create policy propia on graceday_personas
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy propios on graceday_ajustes
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

create policy propias on graceday_actividades
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

create policy propia on graceday_rutina
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

create policy propios on graceday_dias
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

create policy propias on graceday_tareas_dia
  for all using (
    dia_id in (select id from graceday_dias where persona_id = (select auth.uid()))
  ) with check (
    dia_id in (select id from graceday_dias where persona_id = (select auth.uid()))
  );

create policy propios on graceday_avisos
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

-- ---------------------------------------------------------------- alta

-- Al crearse una cuenta, la persona y sus ajustes nacen con ella.
create or replace function claude_graceday.crear_persona_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into graceday_personas (id, nombre, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), 'Tú'),
    new.email
  );
  insert into graceday_ajustes (persona_id) values (new.id);
  return new;
end;
$$;

create trigger al_registrarse
  after insert on auth.users
  for each row execute function claude_graceday.crear_persona_al_registrarse();
