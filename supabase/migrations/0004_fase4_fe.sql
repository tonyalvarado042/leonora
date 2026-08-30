-- GraceDay · Fase 4 — Fe: devocionales y versículo del día
--
-- Sobre los derechos de autor: el texto que trae la app es de la
-- Reina-Valera 1909, que es de dominio público. Las traducciones modernas
-- —NVI, NTV, RVR1960, DHH— tienen derechos y hace falta licencia del editor
-- para distribuirlas en una app que se vende.
--
-- Por eso `versiculos_versiones` es una tabla aparte y no una columna: añadir
-- una versión licenciada es meter filas, sin tocar la app ni el esquema.

create table devocionales (
  id         text primary key,
  titulo     text not null,
  pasaje     text not null,
  texto      text not null,
  -- Sin la pregunta, «Devocional 6:30-7:30» vuelve a ser una casilla vacía.
  pregunta   text not null,
  minutos    smallint not null default 15 check (minutos between 1 and 240),
  edad_min   smallint not null default 8,
  edad_max   smallint not null default 99,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),

  constraint edades_ordenadas check (edad_max > edad_min)
);

create table versiculos (
  id          text primary key,
  referencia  text not null,
  tema        text not null,
  -- 1-366. Null mientras el juego no llegue a un año entero: la app da la
  -- vuelta a la lista, que es mejor que dejar días en blanco.
  dia_del_anio smallint check (dia_del_anio between 1 and 366),
  activo      boolean not null default true,

  unique (dia_del_anio)
);

create table versiculos_versiones (
  versiculo_id text not null references versiculos (id) on delete cascade,
  -- 'RV1909' es la que se distribuye. Las demás, con licencia.
  version      text not null,
  texto        text not null check (length(trim(texto)) > 5),

  primary key (versiculo_id, version)
);

create table versiculos_guardados (
  persona_id   uuid not null references personas (id) on delete cascade,
  versiculo_id text not null references versiculos (id) on delete cascade,
  guardado_en  timestamptz not null default now(),

  primary key (persona_id, versiculo_id)
);

-- Qué devocional le tocó a cada tarea de fe, para poder mirar atrás.
alter table tareas_dia add column devocional_id text references devocionales (id) on delete set null;

-- ------------------------------------------------------------------- RLS

alter table devocionales          enable row level security;
alter table versiculos            enable row level security;
alter table versiculos_versiones  enable row level security;
alter table versiculos_guardados  enable row level security;

-- El contenido es catálogo: lo lee cualquiera con sesión, nadie lo escribe
-- desde la app.
create policy lectura on devocionales         for select to authenticated using (activo);
create policy lectura on versiculos           for select to authenticated using (activo);
create policy lectura on versiculos_versiones for select to authenticated using (true);

-- Los guardados sí son de cada quien.
create policy propios on versiculos_guardados
  for all using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));
