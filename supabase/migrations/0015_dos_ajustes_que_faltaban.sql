-- GraceDay · Los dos ajustes que la app tenía y la tabla no
--
-- La app se ha usado siempre contra el teléfono, así que estos dos campos
-- vivían solo en el tipo de TypeScript y nadie notó que faltaban en la tabla.
-- Al conectar la nube salen los dos a la vez:
--
-- - `arranque_hecho` es lo que decide si sale el asistente de bienvenida. Sin
--   la columna, la nube devolvía `undefined` —que es falso— y la app mandaría
--   a contestar las cinco preguntas **cada vez que se abre**, encima de una
--   rutina ya armada.
-- - `ocupacion_nombre` es cómo lo llama la persona: «Colegio Ciudad Vieja» en
--   vez de «Escuela». Sin la columna, `guardarAjustes` fallaba entero con
--   «column does not exist», así que se perdía también todo lo demás del
--   guardado.
--
-- Se comprobó uno por uno: son los únicos dos campos de toda la app que
-- estaban en el tipo y no en su tabla.

alter table graceday_ajustes
  add column ocupacion_nombre text not null default '',
  -- false: quien ya tenía cuenta antes de esto no ha contestado el asistente
  -- contra la nube. Es lo mismo que dice el teléfono en una app recién puesta.
  add column arranque_hecho boolean not null default false;

comment on column graceday_ajustes.ocupacion_nombre is
  'Cómo llama la persona a su ocupación. Vacío = la etiqueta que toque por el tipo.';
comment on column graceday_ajustes.arranque_hecho is
  'false hasta que se contesta el asistente de arranque.';
