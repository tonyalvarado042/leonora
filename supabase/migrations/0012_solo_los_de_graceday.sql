-- GraceDay · Que el alta solo cree persona para quien entra por GraceDay
--
-- GraceDay ya no vive sola: comparte proyecto con otras cosas de la misma
-- cuenta. `auth.users` es de todas, así que un disparador que corra en cada
-- alta le crearía una persona de GraceDay a alguien que se registró en otra
-- app —y, peor, si algo fallara ahí dentro, la transacción se cae y nadie
-- podría registrarse en ninguna.
--
-- El disparador se pone condición: solo corre si el alta viene marcada como
-- de GraceDay. La app la marca al registrarse:
--
--     supabase.auth.signUp({ email, password,
--       options: { data: { app: 'graceday', nombre } } })
--
-- Quien ya tenía cuenta en el proyecto de antes y un día abre GraceDay no
-- pasa por aquí: entra, no se registra. Esa fila la crea la app al entrar
-- —la política de `graceday_personas` deja que cada quien cree la suya—,
-- no este disparador.

drop trigger if exists al_registrarse on auth.users;

create trigger al_registrarse
  after insert on auth.users
  for each row
  when (new.raw_user_meta_data ->> 'app' = 'graceday')
  execute function claude_graceday.crear_persona_al_registrarse();

comment on function claude_graceday.crear_persona_al_registrarse() is
  'Crea la persona de GraceDay y sus ajustes. Solo se dispara si el alta '
  'trae app=graceday en sus metadatos: el proyecto es compartido.';
