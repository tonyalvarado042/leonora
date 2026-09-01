-- GraceDay vive ahora en el proyecto de Tony Alvarado, junto al CRM.
-- Todo lo suyo lleva `graceday_` delante; lo que no se llama desde la app
-- vive en el esquema `claude_graceday` (R7). No toca nada de lo que ya había.

create schema if not exists claude_graceday;
grant usage on schema claude_graceday to anon, authenticated, service_role;

