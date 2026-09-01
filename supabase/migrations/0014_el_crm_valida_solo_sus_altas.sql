-- El CRM valida sus altas, no las de todo el proyecto
--
-- **Esto toca el CRM, no GraceDay.** Va después de la 0013 a propósito, y el
-- orden es lo importante: la 0013 quitó el rol `lectura` por defecto, así que
-- ahora una cuenta que no sea del CRM sale **sin nada** del CRM. Al revés
-- —abrir esto primero— cualquiera podría registrarse diciendo que viene de
-- GraceDay y salir leyendo los 872 contactos.
--
-- Cómo estaba: `cta_validar_alta` corre antes de **cada** alta del proyecto y
-- rechaza el correo que no esté en `cta_invitaciones`. Esa lista está vacía,
-- así que solo el dueño podía registrarse — en GraceDay tampoco: ni Leonora,
-- ni su mamá, ni una familia que compre la app.
--
-- Cómo queda: un alta marcada como de GraceDay no pasa por la puerta del CRM.
-- Los metadatos los manda el teléfono, así que **no son una credencial**: lo
-- único que consiguen es saltarse una validación que no es suya. Quien mienta
-- ahí sale con una cuenta y una persona de GraceDay, y con cero acceso al CRM.
--
-- Nota: al no pasar por aquí, un alta de GraceDay **no queda confirmada sola**
-- —esta función lo hacía—, así que Supabase le manda su correo de siempre.
-- Es lo correcto para una app que se vende a familias: se confirma el correo.

create or replace function crm_tony_alvarado.cta_validar_alta()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_correo  text := lower(btrim(new.email));
  v_codigo  text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'codigo', '')));
  v_inv     crm_tony_alvarado.cta_invitaciones%rowtype;
begin
  -- El proyecto es compartido. Esta puerta es la del CRM, no la de todas las
  -- apps: un alta de GraceDay sigue su propio camino.
  if new.raw_user_meta_data ->> 'app' = 'graceday' then
    return new;
  end if;

  -- El dueno del CRM no necesita invitacion.
  if v_correo = 'aalvarado@gmail.com' then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
    return new;
  end if;

  select * into v_inv from crm_tony_alvarado.cta_invitaciones where email = v_correo;

  if v_inv.email is null then
    raise exception 'CRM Tony Alvarado: ese correo no esta autorizado. Pedile al administrador que te agregue.'
      using errcode = 'check_violation';
  end if;
  if v_inv.usada_el is not null then
    raise exception 'CRM Tony Alvarado: ese codigo ya se uso. Pedile al administrador uno nuevo.'
      using errcode = 'check_violation';
  end if;
  if v_codigo <> upper(v_inv.codigo) then
    raise exception 'CRM Tony Alvarado: el codigo no coincide.'
      using errcode = 'check_violation';
  end if;

  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $function$;

comment on function crm_tony_alvarado.cta_validar_alta() is
  'Valida las altas del CRM. El proyecto es compartido: un alta marcada como '
  'app=graceday no pasa por aquí y sale sin acceso al CRM (ver 0013).';
