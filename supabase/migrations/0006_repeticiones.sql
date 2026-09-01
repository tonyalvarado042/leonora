-- GraceDay · Repeticiones como en un calendario
--
-- Antes había dos sistemas: la rutina cubría lo semanal y todo lo demás no
-- existía. Ahora `rutina` es la tabla de reglas de repetición, y una sola
-- función decide si a un bloque le toca en una fecha.
--
-- Las reglas viejas eran todas semanales, así que la conversión es directa.

create type graceday_tipo_repeticion as enum (
  'diaria', 'semanal', 'cada_n_dias', 'mensual', 'anual'
);

alter table graceday_rutina
  add column repeticion graceday_tipo_repeticion not null default 'semanal',
  -- Solo en `cada_n_dias`. Se cuenta desde `desde`.
  add column cada_n smallint check (cada_n between 1 and 366),
  -- En `mensual` y `anual`. Si el mes es más corto, cae en su último día:
  -- quien puso «el 31» quiere decir «el último».
  add column dia_mes smallint check (dia_mes between 1 and 31),
  add column mes smallint check (mes between 1 and 12),
  -- Desde cuándo vale la regla, y ancla de `cada_n_dias`.
  add column desde date not null default '2020-01-01',
  add column hasta date;

-- `dia_semana` deja de ser obligatorio: solo lo usa la repetición semanal.
alter table graceday_rutina alter column dia_semana drop not null;

alter table graceday_rutina
  add constraint rango_ordenado check (hasta is null or hasta >= desde),
  -- Cada repetición necesita lo suyo y nada más. Sin esto se pueden guardar
  -- reglas que no significan nada, y el generador las ignora en silencio.
  add constraint repeticion_completa check (
    case repeticion
      when 'diaria'      then dia_semana is null and cada_n is null and dia_mes is null and mes is null
      when 'semanal'     then dia_semana is not null and cada_n is null and dia_mes is null and mes is null
      when 'cada_n_dias' then cada_n is not null and dia_semana is null and dia_mes is null and mes is null
      when 'mensual'     then dia_mes is not null and dia_semana is null and cada_n is null and mes is null
      when 'anual'       then dia_mes is not null and mes is not null and dia_semana is null and cada_n is null
    end
  );

-- El índice viejo solo servía para lo semanal.
drop index if exists graceday_rutina_busqueda_idx;
create index graceday_rutina_busqueda_idx on graceday_rutina (persona_id, modo, repeticion) where activo;
