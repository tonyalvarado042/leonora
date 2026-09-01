-- GraceDay · Fase 2 — Rachas, niveles y celebración
--
-- Tres tablas y unas columnas. Cuatro rachas separadas, no una: perder
-- cuarenta días de devocional por no ordenar el cuarto una vez desanima tanto
-- que la gente deja la app.
--
-- En la v3 del diseño se dijo que las rachas serían una consulta y no una
-- tabla. Con cuatro vías, niveles y día de gracia ya no aplica: se leen en
-- CADA apertura de la app, y hay que guardar cuándo se ganó cada insignia.

create type graceday_via_racha as enum ('apertura', 'dia', 'devocional', 'oracion');

-- ---------------------------------------------------------------- rachas

create table graceday_rachas (
  persona_id       uuid not null references graceday_personas (id) on delete cascade,
  via              graceday_via_racha not null,
  racha_actual     integer not null default 0 check (racha_actual >= 0),
  racha_mejor      integer not null default 0 check (racha_mejor >= 0),
  total_dias       integer not null default 0 check (total_dias >= 0),
  ultimo_dia       date,
  -- El primer día del mes en que se gastó el día de gracia. Una vez al mes,
  -- fallar un solo día no rompe la racha.
  gracia_usada_mes date,

  primary key (persona_id, via),
  constraint mejor_no_baja check (racha_mejor >= racha_actual)
);

-- ---------------------------------------------------------------- logros

-- El catálogo de insignias: cuatro escaleras iguales, de 3 días a un año.
-- Está en datos y no en código para que cambiar un nombre o mover un umbral
-- sea editar una fila.
create table graceday_logros (
  id              text primary key,
  via             graceday_via_racha not null,
  dias_requeridos integer not null check (dias_requeridos > 0),
  nombre          text not null,
  emoji           text not null,

  unique (via, dias_requeridos)
);

create table graceday_logros_ganados (
  persona_id uuid not null references graceday_personas (id) on delete cascade,
  logro_id   text not null references graceday_logros (id) on delete cascade,
  ganado_en  timestamptz not null default now(),
  -- null = todavía no se le enseñó la celebración a la persona.
  visto_en   timestamptz,

  primary key (persona_id, logro_id)
);

-- ------------------------------------------------------------- columnas

-- Qué vías se contaron ya hoy. Un día contado no se descuenta: si lo hiciste,
-- lo hiciste, aunque después desmarques algo.
alter table graceday_dias add column vias_contadas graceday_via_racha[] not null default '{}';

-- --------------------------------------------------------------- semilla

insert into graceday_logros (id, via, dias_requeridos, nombre, emoji) values
  ('fe-3',    'devocional', 3,   'Semilla', '🌱'),
  ('fe-7',    'devocional', 7,   'Raíz',    '🪴'),
  ('fe-14',   'devocional', 14,  'Brote',   '🌿'),
  ('fe-30',   'devocional', 30,  'Árbol',   '🌳'),
  ('fe-100',  'devocional', 100, 'Fruto',   '🍎'),
  ('fe-365',  'devocional', 365, 'Cosecha', '🌾'),

  ('dia-3',   'dia', 3,   'En marcha',  '🚶'),
  ('dia-7',   'dia', 7,   'Constante',  '🎯'),
  ('dia-14',  'dia', 14,  'Sin fallar', '⚙️'),
  ('dia-30',  'dia', 30,  'Imparable',  '🚀'),
  ('dia-100', 'dia', 100, 'De hierro',  '🛡️'),
  ('dia-365', 'dia', 365, 'Leyenda',    '👑'),

  ('ap-3',    'apertura', 3,   'Presente',       '👋'),
  ('ap-7',    'apertura', 7,   'Fiel',           '🤝'),
  ('ap-14',   'apertura', 14,  'Sin faltar',     '📌'),
  ('ap-30',   'apertura', 30,  'Siempre aquí',   '🏠'),
  ('ap-100',  'apertura', 100, 'Ancla',          '⚓'),
  ('ap-365',  'apertura', 365, 'Un año contigo', '🎂'),

  ('or-3',    'oracion', 3,   'Primer amén', '🕊️'),
  ('or-7',    'oracion', 7,   'En oración',  '🙏'),
  ('or-14',   'oracion', 14,  'De rodillas', '🤲'),
  ('or-30',   'oracion', 30,  'Sin descanso', '🔥'),
  ('or-100',  'oracion', 100, 'Centinela',   '⚔️'),
  ('or-365',  'oracion', 365, 'Sin soltar',  '🕯️');

-- Los nombres son todos neutros a propósito: la app se vende a familias
-- enteras, y a un papá no le puede salir «Disciplinada».

-- ------------------------------------------------------------------- RLS

alter table graceday_rachas         enable row level security;
alter table graceday_logros         enable row level security;
alter table graceday_logros_ganados enable row level security;

create policy propias on graceday_rachas
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

create policy propios on graceday_logros_ganados
  for all using (persona_id = (select auth.uid())) with check (persona_id = (select auth.uid()));

-- El catálogo lo puede leer cualquiera con sesión; nadie lo escribe desde la app.
create policy lectura on graceday_logros for select to authenticated using (true);

-- Las rachas nacen en cero junto con la persona.
create or replace function claude_graceday.crear_rachas_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into graceday_rachas (persona_id, via)
  select new.id, v from unnest(enum_range(null::graceday_via_racha)) as v;
  return new;
end;
$$;

create trigger al_crear_persona
  after insert on graceday_personas
  for each row execute function claude_graceday.crear_rachas_al_registrarse();
