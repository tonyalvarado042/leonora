-- GraceDay · Cómo se hizo el devocional
--
-- El devocional no es solo el que da la app. La gente lo hace leyendo la
-- Biblia, con un libro, en familia, oyendo la radio o en la iglesia — y todo
-- eso cuenta igual para la racha. Lo que cambia es poder mirar atrás y
-- acordarse de cómo fue.

create type metodo_devocional as enum (
  'app', 'biblia', 'libro', 'familia', 'radio', 'otra_app', 'iglesia', 'otro'
);

-- Null en todo lo que no es de tipo fe, y también en un devocional del que
-- todavía no se dijo cómo se hizo.
alter table tareas_dia add column metodo_devocional metodo_devocional;

comment on column tareas_dia.metodo_devocional is
  'Cómo se hizo el devocional. Solo aplica a tareas de tipo fe.';
