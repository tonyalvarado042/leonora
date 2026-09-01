-- GraceDay · Invitar a alguien que todavía no tiene la app
--
-- Añadir gente tenía dos huecos:
--
-- 1. Solo podía hacerlo quien administraba el grupo. Una familia no se arma
--    pidiéndole permiso a un administrador: si la hija quiere meter a su
--    hermana, la mete.
-- 2. No había manera de invitar a alguien que **todavía no tiene la app**.
--
-- La invitación va a un correo, con un código. Quien la reciba baja la app,
-- entra con ese correo y el código la mete en el grupo.
--
-- **El código no es lo que cierra la puerta: el correo sí.** Una invitación
-- solo se ve desde la cuenta a la que va dirigida, así que acertar un código a
-- ciegas no sirve de nada. Lo intenté al revés primero —un código por grupo—
-- y para poder leer el grupo antes de entrar hacía falta una política que
-- dejaba listar TODOS los grupos: el nombre de la casa de cualquier familia,
-- a cualquiera con la clave anónima. Eso no.

-- ---------------------------------------------------------------- código

-- Sin letras ni números que se confundan al copiarlos a mano: 0/O, 1/I/L.
create or replace function claude_graceday.nuevo_codigo(tipo graceday_tipo_grupo)
returns text
language plpgsql volatile
set search_path = public
as $$
declare
  alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  prefijo  text := case tipo
                     when 'familia' then 'CASA'
                     when 'amigos'  then 'AMIS'
                     when 'iglesia' then 'IGLE'
                     else 'GRUP'
                   end;
  intento  text;
begin
  -- Se reintenta hasta dar con uno libre: dos códigos iguales meterían a
  -- alguien en la casa equivocada, y eso no puede pasar «casi nunca» — tiene
  -- que no poder pasar.
  loop
    intento := prefijo || '-';
    for _i in 1..4 loop
      intento := intento || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from graceday_invitaciones where codigo = intento);
  end loop;
  return intento;
end;
$$;

-- ------------------------------------------------------------ invitaciones

create table graceday_invitaciones (
  id           uuid primary key default gen_random_uuid(),
  grupo_id     uuid not null references graceday_grupos (id) on delete cascade,
  -- A dónde va. Es lo que de verdad cierra la puerta.
  email        text not null check (email = lower(email) and email like '%_@_%._%'),
  -- Como la llamó quien la invitó, para poder saludarla por su nombre.
  nombre       text not null check (length(trim(nombre)) between 1 and 60),
  rol          graceday_rol_grupo not null default 'miembro',
  codigo       text not null unique check (codigo ~ '^[A-Z]{4}-[A-Z0-9]{4}$'),
  creada_por   uuid not null references graceday_personas (id) on delete cascade,
  creada_en    timestamptz not null default now(),
  -- De un solo uso: si valiera siempre, quien lo encontrara dentro de un año
  -- entraría igual.
  aceptada_en  timestamptz
);

create index graceday_invitaciones_por_correo on graceday_invitaciones (email) where aceptada_en is null;
create index graceday_invitaciones_por_grupo  on graceday_invitaciones (grupo_id);

-- El código lo pone la base de datos, no la app: así es único de verdad y no
-- depende de que dos teléfonos no coincidan.
create or replace function claude_graceday.codigo_al_invitar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  suyo graceday_tipo_grupo;
begin
  if new.codigo is null or new.codigo !~ '^[A-Z]{4}-[A-Z0-9]{4}$' then
    select tipo into suyo from graceday_grupos where id = new.grupo_id;
    new.codigo := claude_graceday.nuevo_codigo(coalesce(suyo, 'otro'));
  end if;
  return new;
end;
$$;

revoke execute on function claude_graceday.codigo_al_invitar() from public, anon, authenticated;

create trigger al_invitar_su_codigo
  before insert on graceday_invitaciones
  for each row execute function claude_graceday.codigo_al_invitar();

-- ------------------------------------------------- quién puede meter a quién

-- Antes: solo quien administraba. Ahora: cualquier miembro activo.
create or replace function claude_graceday.estoy_dentro(grupo uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from graceday_miembros_grupo m
    where m.grupo_id = grupo and m.persona_id = (select auth.uid())
      and m.estado = 'activo'
  )
$$;

-- ¿Hay una invitación sin usar para mi correo en este grupo? Es lo que deja
-- entrar a quien todavía no está dentro.
create or replace function claude_graceday.tengo_invitacion(grupo uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from graceday_invitaciones i
    where i.grupo_id = grupo
      and i.aceptada_en is null
      and i.email = lower((select auth.email()))
  )
$$;

drop policy invito_yo on graceday_miembros_grupo;
create policy invito_yo on graceday_miembros_grupo
  for insert with check (
    -- Me meto yo: en el grupo que acabo de crear, o porque me invitaron.
    (persona_id = (select auth.uid())
     and (claude_graceday.tengo_invitacion(grupo_id)
          or exists (select 1 from graceday_grupos g
                     where g.id = grupo_id and g.creado_por = (select auth.uid()))))
    -- O meto a alguien: cualquier miembro puede, pero **como tutor solo quien
    -- administra**. Un tutor ve el calendario de todos los hijos de la casa y
    -- les puede mandar tareas: si cualquiera pudiera fabricar uno, cualquiera
    -- podría darle esa vista a quien quisiera.
    or (claude_graceday.estoy_dentro(grupo_id)
        and (rol <> 'tutor' or claude_graceday.administro(grupo_id)))
  );

-- Lo mismo al cambiar una fila: nadie se asciende a tutor por su cuenta.
drop policy mi_propia_fila on graceday_miembros_grupo;
create policy mi_propia_fila on graceday_miembros_grupo
  for update using (
    persona_id = (select auth.uid()) or claude_graceday.administro(grupo_id)
  ) with check (
    (rol <> 'tutor' or claude_graceday.administro(grupo_id))
    and (persona_id = (select auth.uid()) or claude_graceday.administro(grupo_id))
  );

-- --------------------------------------------------------- quién ve qué

alter table graceday_invitaciones enable row level security;

-- Se ve una invitación si va a tu correo o si la mandaste tú. Nada más: no hay
-- forma de listar invitaciones ajenas ni de ir probando códigos.
create policy mias on graceday_invitaciones
  for select using (
    email = lower((select auth.email())) or creada_por = (select auth.uid())
  );

create policy invito_yo on graceday_invitaciones
  for insert with check (
    creada_por = (select auth.uid())
    and claude_graceday.estoy_dentro(grupo_id)
    and (rol <> 'tutor' or claude_graceday.administro(grupo_id))
  );

-- La marca de aceptada la pone quien la acepta; cancelarla, quien la mandó.
create policy la_acepto on graceday_invitaciones
  for update using (email = lower((select auth.email())))
  with check (email = lower((select auth.email())));

create policy la_cancelo on graceday_invitaciones
  for delete using (creada_por = (select auth.uid()) or claude_graceday.administro(grupo_id));

-- Y hay que poder leer el nombre del grupo al que te invitaron, antes de
-- entrar. Solo ese: sin invitación, la lista de grupos sigue sin verse.
drop policy mios on graceday_grupos;
create policy mios on graceday_grupos
  for select using (
    id in (select claude_graceday.mis_grupos_y_invitaciones())
    or claude_graceday.tengo_invitacion(id)
  );
