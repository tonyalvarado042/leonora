-- GraceDay · El esquema propio, antes que nada
--
-- Las funciones que no se llaman desde la app —las de los disparadores y las
-- que deciden quién ve el calendario de quién— viven aquí y no en `public`,
-- porque todo lo que vive en `public` sale publicado como endpoint REST.
--
-- El nombre sigue la regla R7: lo que yo cree en una base de datos se llama
-- `claude_<proyecto>`.
--
-- Va la primera porque la 0001 ya crea sus funciones aquí dentro.

create schema if not exists claude_graceday;

-- Usar el esquema, no publicarlo. Hace falta porque las políticas se evalúan
-- con el rol de quien consulta.
grant usage on schema claude_graceday to anon, authenticated, service_role;
