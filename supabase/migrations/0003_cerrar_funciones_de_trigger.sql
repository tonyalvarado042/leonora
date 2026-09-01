-- GraceDay · Cerrar las funciones de disparador
--
-- Las funciones que crean la persona y sus rachas al registrarse son
-- `security definer`: corren con los permisos de quien las escribió, no de
-- quien las llama. Eso está bien para un disparador, pero todo lo que vive en
-- `public` sale publicado como endpoint REST, así que cualquiera con la clave
-- anónima podía llamarlas a mano desde `/rest/v1/rpc/...`.
--
-- Un disparador no tiene por qué poder llamarse desde la app. Se le quita el
-- permiso: el disparador sigue funcionando —lo ejecuta Postgres, no un rol—,
-- y la puerta de fuera desaparece.
--
-- Deja el asesor de seguridad del proyecto en cero avisos.

revoke execute on function claude_graceday.crear_persona_al_registrarse() from public, anon, authenticated;
revoke execute on function claude_graceday.crear_rachas_al_registrarse()  from public, anon, authenticated;
