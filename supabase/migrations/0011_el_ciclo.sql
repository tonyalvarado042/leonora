-- GraceDay · El calendario del ciclo
--
-- **Esta es la única tabla de toda la app que no ve nadie más que su dueña.**
--
-- Las migraciones 0007 y 0009 abrieron lecturas para el tutor: un papá tiene
-- que poder ver el día de su hija. Aquí no. Un papá puede necesitar ver el
-- horario de su hija; su ciclo no es información suya. No hay excepción de
-- tutor, no hay excepción de grupo, y no hay una función `puedo_ver_ciclo_de`
-- porque si existiera, alguien acabaría llamándola.
--
-- Se decidió así desde el diseño, en la Fase 0, y se cumple aquí.

create type intensidad_ciclo as enum ('poco', 'normal', 'mucho');

create table ciclo (
  persona_id   uuid not null references personas (id) on delete cascade,
  fecha        date not null,
  -- Si ese día hubo sangrado. Lo demás es opcional: apuntar es de ella.
  sangrado     boolean not null default true,
  intensidad   intensidad_ciclo,
  animo        text check (animo is null or length(animo) <= 40),
  nota         text check (nota is null or length(nota) <= 500),
  creado_en    timestamptz not null default now(),
  primary key (persona_id, fecha)
);

alter table ciclo enable row level security;

-- Sin tutor, sin grupo, sin nadie. Solo ella.
create policy solo_mio on ciclo
  for all using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

comment on table ciclo is
  'El calendario del ciclo. Única tabla sin excepción de tutor: un papá puede
   necesitar ver el horario de su hija, su ciclo no es información suya.';

-- El interruptor vive en los ajustes, junto a los demás. Apagarlo **no borra**
-- lo apuntado: apagar una cosa y perderla son dos acciones distintas, y la app
-- no puede hacer la segunda cuando le piden la primera.
alter table ajustes add column ciclo_activo boolean not null default false;

-- El sexo ya existía en `personas` desde la Fase 1, y sigue sirviendo para una
-- sola cosa: decidir si se le ofrece este calendario.
comment on column personas.sexo is
  'Solo se usa para ofrecer el calendario del ciclo. No cambia nada más.';
