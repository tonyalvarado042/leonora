-- Sin invitación no hay usuario del CRM
--
-- **Esto toca el CRM, no GraceDay.** Va aquí porque lo hace falta la mudanza:
-- las dos apps comparten `auth.users`, y antes de abrir la puerta de las altas
-- hay que arreglar lo que reparte los permisos detrás.
--
-- Cómo estaba: a quien pasara el filtro de alta y **no tuviera invitación** se
-- le creaba igual una fila en `cta_usuarios`, con rol `lectura` por defecto
-- (`coalesce(v_rol, 'lectura')`). Y `lectura` lee **todo** el CRM: contactos,
-- oportunidades, pagos, correos, documentos, reuniones.
--
-- Es decir: lo único que impedía que un desconocido leyera el CRM era que
-- `cta_validar_alta` no le dejara registrarse. El control de acceso de verdad
-- —tener fila y rol en `cta_usuarios`, que es lo que mira `cta_es`— estaba
-- repartiendo permisos por defecto.
--
-- Cómo queda: sin invitación **no se crea fila**. Quien se registre por otra
-- app del proyecto sale sin nada del CRM, y el CRM deja de depender de que
-- nadie más pueda registrarse. Queda más cerrado que antes, no menos.

create or replace function crm_tony_alvarado.cta_alta_usuario()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_correo text := lower(new.email);
  v_rol    text;
  v_nombre text;
  v_hay    boolean;
begin
  if v_correo = 'aalvarado@gmail.com' then
    v_rol := 'administrador';
  else
    select rol, nombre, true into v_rol, v_nombre, v_hay
      from crm_tony_alvarado.cta_invitaciones where email = v_correo;

    -- Sin invitación, esta alta no es del CRM: no se le crea usuario.
    if not coalesce(v_hay, false) then
      return new;
    end if;

    update crm_tony_alvarado.cta_invitaciones
       set usada_el = now() where email = v_correo;
  end if;

  insert into crm_tony_alvarado.cta_usuarios (id, email, nombre, rol)
  values (new.id, v_correo,
          coalesce(v_nombre, new.raw_user_meta_data ->> 'nombre'),
          coalesce(v_rol, 'lectura'))
  on conflict (id) do nothing;
  return new;
end $function$;

comment on function crm_tony_alvarado.cta_alta_usuario() is
  'Crea el usuario del CRM al registrarse. Sin invitación no crea fila: el '
  'proyecto es compartido y `lectura` ve todo el CRM.';
