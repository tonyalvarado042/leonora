# GraceDay — Documentación completa

App nativa de iOS y Android para organizar el día, los hábitos de fe y las
fechas importantes. Pensada para una niña de 13 años y vendible a familias
enteras.

**Estado: fases 1, 2, 3, 4 y 5 hechas y verificadas.**
Última actualización: 2026-08-30

- **Índice del repositorio:** `README.md`
- **Las reglas del proyecto:** `REGLAS.md`
- **Historial de todo lo hecho:** `CHANGELOG.md`
- Diseño visual: `docs/dia-de-leonora.html`
- Resumen del diseño: `DISENO.md`
- Publicar en las tiendas: `LANZAMIENTO.md`
- Código: `app/` · Migraciones: `supabase/migrations/`

---

## 1. La idea en una página

Todo se apoya en **tres capas separadas**. Es la decisión de diseño más
importante; sin ella, el primer día feriado rompe la app.

| Capa | Qué es | Dónde vive | Cada cuánto cambia |
|---|---|---|---|
| **1. Rutina** | Cómo es un lunes *normal* | `rutina` | Casi nunca |
| **2. Eventos** | Feriados, exámenes, cumpleaños | `eventos` | Siempre |
| **3. El día** | El plan del martes 3 | `dias` + `tareas_dia` | Se genera cada día |

La capa 3 se **genera** combinando 1 y 2, y es una **copia**: mover algo hoy no
toca la rutina, y regenerar el día con los mismos datos da siempre lo mismo.

---

## 2. Las tablas

20 tablas creadas. Las de fases posteriores están en la sección 7.

### 2.1 `personas` — quién usa la app
Una fila por persona. La clave es la misma que la de `auth.users`: una cuenta,
una persona.

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK → `auth.users` | La cuenta. Borrarla borra todo en cascada |
| `nombre` | text (1-60) | Cómo la saluda la app |
| `email` | text | Copia del correo de la cuenta |
| `fecha_nacimiento` | date | Para el cumpleaños (fase 5) |
| `rol` | enum `tutor｜hijo｜adulto` | El tutor verá a sus hijos (fase 5) |
| `sexo` | enum `mujer｜hombre｜sin_decir` | Activa el calendario de ciclo (fase 8) |
| `tipo_cuenta` | enum `completa｜invitada` | La invitada tiene funciones básicas (fase 10) |
| `zona_horaria` | text | **Todo el cálculo de días usa esta zona, no la del servidor** |
| `avatar_tipo` | text `emoji｜ilustracion｜foto` | Qué clase de ícono |
| `avatar_valor` | text | El emoji o el nombre de la ilustración |
| `foto_url` | text | Opcional. **Nunca aparece en el Muro** (fase 7) |
| `creado_en` | timestamptz | |

### 2.2 `ajustes` — la configuración de cada persona
Una fila por persona (PK = `persona_id`). Nace con ella.

| Campo | Tipo | Por defecto | Para qué |
|---|---|---|---|
| `persona_id` | uuid PK → `personas` | | |
| `hora_despertar` | time | 06:00 | Límite de arriba del día |
| `hora_dormir` | time | 21:30 | Límite de abajo |
| `ocupacion` | enum | colegio | `colegio｜escuela｜universidad｜trabajo｜otro｜ninguno` |
| `ocupacion_nombre` | text | '' | El nombre que le puso la persona. Vacío = el de fábrica |
| `hora_fin_ocupacion` | time | **14:00** | **Que esto sea un dato y no una constante es lo que hace la app vendible** |
| `dias_ocupados` | smallint[] | {1,2,3,4,5} | 0=domingo … 6=sábado |
| `avisos_activos` | boolean | true | Interruptor general |
| `avisar_antes_min` | smallint (0-120) | **10** | La regla general |
| `sonido_aviso` | text | campana | |
| `sonido_devocional` | text | **arpa** | Distinto a propósito: se reconoce sin mirar |
| `vibrar` | boolean | true | |
| `silencio_desde` / `_hasta` | time | null | Van juntas o no van (`silencio_completo`) |
| `tema` | enum `claro｜oscuro｜auto` | auto | |
| `color_acento` | text | morado | |
| `tamano_letra` | text | normal | |
| `celebraciones` | boolean | true | El confeti se puede apagar |
| `arranque_hecho` | boolean | false | **false = se abre la bienvenida, no el día** |
| `idioma` | text | es | |
| `actualizado_en` | timestamptz | now() | |

### 2.3 `actividades` — la lista única de cosas
**Un hábito NO es otra tabla: es una actividad con `es_habito = true`.** Esta
fusión quitó tres tablas del diseño original.

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | |
| `persona_id` | uuid → `personas` | |
| `nombre` | text (1-80) | |
| `tipo` | enum | `fe｜estudio｜casa｜deporte｜familia｜descanso`. Da el color |
| `emoji` | text | |
| `duracion_min` | smallint (1-1440) | Lo que se propone al ponerla |
| `es_habito` | boolean | Cuenta para las rachas |
| `meta_semanal` | smallint (1-7) | Cuántas veces por semana |
| `es_fijo` | boolean | **Ancla.** La cena y el devocional no se mueven |
| `avisar` | boolean | |
| `avisar_antes_min` | smallint | **null = usar el de ajustes.** Un valor le lleva la contraria |
| `activa` | boolean | Apagarla la saca del día sin borrar el historial |

Índice: `(persona_id) where activa`.

### 2.4 `rutina` — la capa 1, y todas las repeticiones
Un bloque = una actividad, **una regla de repetición** y una hora. Es la única
tabla de recurrencia: no hay un sistema para la semana y otro para el resto.

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | |
| `persona_id` | uuid → `personas` | |
| `actividad_id` | uuid → `actividades` (cascada) | |
| `modo` | enum `escolar｜vacaciones` | Dos rutinas distintas sin duplicar tabla |
| **`repeticion`** | enum | `diaria｜semanal｜cada_n_dias｜mensual｜anual` |
| `dia_semana` | smallint 0-6, null | Solo en `semanal`. **0 = domingo**, igual que `Date.getDay()` |
| `cada_n` | smallint 1-366, null | Solo en `cada_n_dias`, contado desde `desde` |
| `dia_mes` | smallint 1-31, null | En `mensual` y `anual` |
| `mes` | smallint 1-12, null | Solo en `anual` |
| `desde` | date | Desde cuándo vale, y ancla de `cada_n_dias` |
| `hasta` | date, null | Hasta cuándo, o para siempre |
| `hora_inicio` / `hora_fin` | time | `hora_fin > hora_inicio` |
| `activo` | boolean | |

`repeticion_completa` obliga a que cada repetición lleve **lo suyo y nada
más**: sin esa restricción se pueden guardar reglas que no significan nada y
el generador las ignora en silencio.

Índice: `(persona_id, modo, repeticion) where activo`.

### 2.5 `dias` — la capa 3, la cabecera
Un plan por persona y fecha (`unique(persona_id, fecha)`).

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | |
| `persona_id` | uuid → `personas` | |
| `fecha` | date | En la zona de la persona |
| `tipo` | enum | `escolar｜fin_de_semana｜feriado｜vacaciones｜especial` |
| `modo_usado` | enum | Qué rutina se usó |
| `nota_ia` | text | *«hoy no hay clases: moví el estudio a la tarde»* |
| `porcentaje_cumplido` | smallint 0-100 | |
| `vias_contadas` | via_racha[] | **Qué rachas ya contaron hoy.** Un día contado no se descuenta |
| `generado_en` | timestamptz | |

### 2.6 `tareas_dia` — lo que la persona marca
**La tabla que la app lee todo el día.**

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | |
| `dia_id` | uuid → `dias` (cascada) | |
| `actividad_id` | uuid → `actividades` (set null) | null si es una tarea suelta |
| `titulo`, `emoji`, `tipo` | | Copiados de la actividad: si la borran, el historial sobrevive |
| `hora_inicio` / `hora_fin` | time | `hora_fin > hora_inicio` |
| `orden` | smallint | Desempate a igual hora |
| `es_fijo` | boolean | |
| `origen` | enum | `rutina｜evento｜encargo｜ia｜manual` |
| `estado` | enum | `pendiente｜hecha｜omitida｜movida` |
| `completado_en` | timestamptz | **`(estado='hecha') = (completado_en is not null)`** |
| `nota` | text | Lo que la persona escribe en el detalle |
| `minutos_reales` | smallint | Cuánto duró de verdad |
| `metodo_devocional` | enum | Solo en fe: `app｜biblia｜libro｜familia｜radio｜otra_app｜iglesia｜otro` |
| `termino_de_verdad` | boolean | Respuesta a «¿terminaste, o lo dejas?» |
| `puntos` | smallint | Chispas que dio |

Índice: `(dia_id, hora_inicio, orden)`.

### 2.7 `avisos` — las alarmas y la campanita

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | |
| `persona_id` | uuid → `personas` | |
| `tipo` | enum | `tarea｜recado｜invitacion｜oracion｜evento｜ciclo` |
| `referencia_id` | uuid | A qué apunta |
| `momento` | timestamptz | Cuándo suena |
| `titulo`, `cuerpo`, `sonido` | text | |
| `estado` | enum | `pendiente｜programado｜enviado｜cancelado｜fallido` |
| `id_local` | text | El id de expo-notifications, para poder cancelarlo |
| `enviado_en`, `leido_en`, `creado_en` | timestamptz | |

Índice: `(persona_id, momento) where estado in ('pendiente','programado')`.

### 2.8 `rachas` — cuatro por persona
PK compuesta `(persona_id, via)`.

| Campo | Tipo | Para qué |
|---|---|---|
| `via` | enum | `apertura｜dia｜devocional｜oracion` |
| `racha_actual` | int ≥ 0 | Días seguidos ahora |
| `racha_mejor` | int ≥ 0 | Récord. **`racha_mejor >= racha_actual`** |
| `total_dias` | int ≥ 0 | Acumulado de siempre |
| `ultimo_dia` | date | El último día que contó |
| `gracia_usada_mes` | date | El día 1 del mes en que se gastó el día de gracia |

### 2.9 `logros` — el catálogo de insignias
24 filas fijas. En datos y no en código para que cambiar un nombre sea editar
una fila. `unique(via, dias_requeridos)`.

| Campo | Tipo |
|---|---|
| `id` | text PK (`fe-7`, `dia-30`…) |
| `via` | enum via_racha |
| `dias_requeridos` | int > 0 |
| `nombre`, `emoji` | text |

### 2.10 `logros_ganados` — quién ganó qué
PK `(persona_id, logro_id)`. `visto_en` null = falta enseñarle la celebración.

### 2.11 `devocionales` — el contenido de la fe
`id` · `titulo` · `pasaje` · `texto` · **`pregunta`** · `minutos` ·
`edad_min` / `edad_max` (`edad_max > edad_min`) · `activo`

Sin la pregunta, «Devocional 6:30-7:30» vuelve a ser una casilla vacía.

### 2.12 `versiculos` y `versiculos_versiones`
`versiculos`: `id` · `referencia` · `tema` · `dia_del_anio` (1-366, único) · `activo`
`versiculos_versiones`: PK `(versiculo_id, version)` · `texto`

**Por qué son dos tablas y no una columna:** el texto bíblico tiene derechos de
autor. La app distribuye **Reina-Valera 1909**, que es de dominio público; NVI,
NTV, RVR1960 y DHH necesitan licencia del editor para venderse dentro de una
app. Con esta forma, añadir una versión licenciada es **meter filas**, sin
tocar la app ni el esquema.

### 2.13 `versiculos_guardados`
PK `(persona_id, versiculo_id)` · `guardado_en`. Los favoritos de cada quien.

`tareas_dia` gana **`devocional_id`** para saber qué devocional le tocó a cada
día de fe.

### 2.14 `grupos` — la familia y los demás

Una familia **es un grupo de tipo `familia`**. No hay tabla `familias` aparte,
así que todo lo que sirve para la casa sirve igual para las amigas o la
iglesia.

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | uuid | |
| `nombre` | texto 1-60 | Como lo llama quien lo creó |
| `tipo` | `familia` · `amigos` · `iglesia` · `otro` | Decide las reglas de quién ve qué |
| `emoji` | texto | 🏠 💬 ⛪ 👥 |
| `creado_por` | uuid → personas | Quien lo montó. **No es un rol** |
| `creado_en` | timestamptz | |

Al crearse una persona, un disparador le crea su casa (`Mi familia`) y la mete
dentro como **miembro**, no como tutor: montar la app para tu casa no te hace
la mamá de nadie.

---

### 2.15 `miembros_grupo` — quién está en qué grupo

| Campo | Tipo | Qué es |
|---|---|---|
| `grupo_id` + `persona_id` | uuid | Clave compuesta |
| `rol` | `tutor` · `miembro` | Solo dos: quien cuida y quien es cuidado |
| `ve_mi_calendario` | booleano | Lo decide cada quien, por grupo, y lo puede apagar |
| `estado` | `invitado` · `activo` · `salio` | Una invitación espera hasta que la contestan |
| `entro_en` | timestamptz | |

**Por qué solo dos roles.** «Dueño» era un rol y estaba mal: la niña de 13 años
que monta la app para su familia salía como jefa del grupo, y su mamá no podía
mandarle nada. Quién lo creó vive en `grupos.creado_por` y solo da permisos de
administración (invitar, renombrar), no de tutela.

---

### 2.16 `invitaciones` — para quien todavía no tiene la app

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | uuid | |
| `grupo_id` | uuid → grupos | A qué grupo |
| `email` | texto en minúsculas | A dónde va. **Es lo que de verdad cierra la puerta** |
| `nombre` | texto 1-60 | Como la llamó quien la invitó, para saludarla por su nombre |
| `rol` | `tutor` · `miembro` | Con qué entra |
| `codigo` | `CASA-4F2A`, único | Lo que se escribe a mano si no se puede tocar el enlace |
| `creada_por` | uuid → personas | |
| `creada_en` | timestamptz | |
| `aceptada_en` | timestamptz | **De un solo uso** |

**El código no es lo que protege el grupo: el correo sí.** Una invitación solo
se ve desde la cuenta a la que va dirigida, así que acertar un código a ciegas
no sirve de nada.

Lo intenté al revés primero —un código por grupo— y para poder leer el grupo
antes de entrar hacía falta una política que dejaba listar **todos** los
grupos: el nombre de la casa de cualquier familia, a cualquiera con la clave
anónima. Un código de grupo además vale para siempre, así que quien lo
encontrara dentro de un año entraría igual.

---

### 2.17 `encargos` — lo que papá o mamá manda

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | uuid | |
| `de_persona_id` | uuid → personas | Quien lo manda |
| `para_persona_id` | uuid → personas | Quien lo recibe |
| `titulo` | texto 1-120 | |
| `nota` | texto | Algo más que decirle |
| `fecha` | date | De qué día es |
| `hora_sugerida` | time | Opcional. Sin ella cae a las 18:00 |
| `tipo` | `tarea` · `recordatorio` · `consejo` | Solo `tarea` entra al horario |
| `estado` | `pendiente` · `hecho` · `archivado` | |
| `respuesta` | texto | Lo que contesta quien lo recibe |
| `respondido_en` | timestamptz | |
| `visto_en` | timestamptz | Cuándo lo abrió. Es lo que apaga el número rojo |
| `creado_en` | timestamptz | |

**Restricciones:** nadie se manda recados a sí mismo (`a_otra_persona`), y una
respuesta lleva siempre su fecha (`respuesta_coherente`) — una respuesta sin
fecha no se puede ordenar, y una fecha sin respuesta miente.

`tareas_dia` gana una columna **`encargo_id`**: es lo que hace que marcar la
tarea aquí se vea allá, y que quien la mandó se entere de que ya está.

---

### 2.18 `eventos` — la capa 2, la que faltaba desde la Fase 1

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | uuid | |
| `grupo_id` | uuid → grupos | O es del grupo entero… |
| `persona_id` | uuid → personas | …o de una sola persona |
| `tipo` | `feriado` `escolar` `examen` `entrega` `cumpleanos` `cita` `viaje` `personal` | |
| `titulo` | texto 1-120 | |
| `descripcion` | texto | |
| `fecha_inicio` / `fecha_fin` | date | Un viaje dura varios días |
| `todo_el_dia` | booleano | |
| `hora_inicio` / `hora_fin` | time | Solo si no es de todo el día |
| `repeticion` | `ninguna` · `anual` | `anual` es lo que hace volver un cumpleaños |
| `efecto` | `libra_el_dia` · `bloquea_horas` · `solo_avisa` | |
| `origen` | `manual` · `foto` · `sistema` | |
| `confianza` | 0-1 | Solo lo leído de una foto |
| `confirmado` | booleano | **Nada leído de una foto entra al horario sin que un humano lo apruebe** |

**Restricciones:** un evento es de alguien (`de_alguien`); las fechas van en
orden; un evento con hora lleva las dos y ordenadas, y uno de todo el día no
lleva ninguna (`horas_coherentes`) — media hora suelta no se puede pintar en el
horario; y la confianza solo la trae lo leído de una foto.

---

### 2.19 `ciclo` — lo único que no ve nadie más

| Campo | Tipo | Qué es |
|---|---|---|
| `persona_id` + `fecha` | | Clave compuesta |
| `sangrado` | booleano | Si ese día hubo. Lo demás es opcional |
| `intensidad` | `poco` · `normal` · `mucho` | |
| `animo` | texto ≤40 | Cómo se sintió |
| `nota` | texto ≤500 | |

**Sin excepción de tutor, sin excepción de grupo.** Las migraciones 0007 y 0009
abrieron lecturas para el tutor: un papá tiene que poder ver el día de su hija.
Aquí no. Un papá puede necesitar ver el horario de su hija; su ciclo no es
información suya. Tampoco existe una función `puedo_ver_ciclo_de`, ni un
`cicloDe(personaId)` en el repositorio: si existieran, alguien acabaría
llamándolos.

El interruptor vive en `ajustes.ciclo_activo`. **Apagarlo no borra nada**:
apagar una cosa y perderla son dos acciones distintas.

---

### 2.20 Cómo se relacionan

```
auth.users
    │ 1:1 (disparador al registrarse)
    ▼
personas ──1:1──► ajustes
    │
    ├──1:N──► actividades ──1:N──► rutina
    │                                  │
    │                                  ▼ (generarDia)
    ├──1:N──► dias ──────1:N──► tareas_dia
    │           └── vias_contadas[]        └── actividad_id (set null)
    │
    ├──1:N──► avisos
    ├──1:4──► rachas
    ├──1:N──► logros_ganados ──N:1──► logros
    │
    ├──N:M──► grupos  (por miembros_grupo, con rol y ve_mi_calendario)
    │              └──1:N──► invitaciones (por correo, de un solo uso)
    ├──1:N──► encargos (de / para) ───┐
    └──1:N──► eventos                 │
                                      ▼
                            tareas_dia.encargo_id (set null)
```

**Los borrados:** quitar la cuenta se lleva todo. Quitar una actividad se lleva
sus bloques de rutina (cascada) pero **deja las tareas ya vividas** (`set
null`), porque el historial no se borra.

---

## 3. Seguridad

RLS activo en las 20 tablas. Las reglas:

1. **Cada quien ve lo suyo y nada más.** `persona_id = auth.uid()`.
2. `tareas_dia` se filtra por su `dias` padre.
3. `logros` es catálogo: lo lee cualquiera con sesión, nadie lo escribe.
4. Las funciones de disparador son `SECURITY DEFINER` y tienen **revocado el
   EXECUTE** de `anon` y `authenticated` (migración 0003): si no, quedaban
   publicadas como RPC.
5. **Un tutor lee lo de sus hijos** (migración 0007). Son políticas de
   **solo lectura** que se suman a las de antes: mirar no es escribir, y esto
   no le da a nadie permiso para marcarle las tareas a otro.
6. **Un encargo solo lo manda un tutor, y solo a los suyos**
   (`soy_tutor_de`). Lo ven las dos partes y nadie más.
7. Un evento de grupo lo ve el grupo; uno de persona, quien puede ver su
   calendario.
8. **Cualquier miembro puede meter a alguien** en su grupo, pero **como tutor
   solo quien administra**. Un tutor ve el calendario de todos los hijos de la
   casa y les puede mandar tareas: si cualquiera pudiera fabricar uno,
   cualquiera podría darle esa vista a quien quisiera. La misma comprobación
   está en el `insert` y en el `update`, para que nadie se ascienda solo.
9. **Una invitación solo se ve desde el correo al que va**, o desde quien la
   mandó. No hay forma de listar invitaciones ajenas ni de ir probando
   códigos.

### 3.1 Quién ve el calendario de quién

La misma regla vive en dos sitios, a propósito: en `src/lib/grupos.ts` para
que la pantalla sepa qué enseñar, y en la base de datos para que se cumpla.
**La app puede equivocarse; la base de datos no.**

- **En la familia manda el tutor.** Papá y mamá ven el día de sus hijos sin
  pedir permiso —para eso son los papás—, y la app se lo dice al hijo en su
  pantalla de Familia en vez de mirarlo a escondidas.
- **En los demás grupos manda cada quien.** Una amiga enseña su calendario
  solo si ella lo enciende, y lo puede apagar cuando quiera.
- **Lo mío siempre lo veo yo.**

### 3.2 Las ayudas de las políticas viven fuera de la API

Seis funciones deciden todo esto: `mis_grupos`, `mis_grupos_y_invitaciones`,
`administro`, `soy_tutor_de`, `comparto_grupo_con` y
`puedo_ver_calendario_de`. Son `SECURITY DEFINER` porque **una política sobre
`miembros_grupo` que consultara `miembros_grupo` se llamaría a sí misma sin
parar**.

Pero todo lo que vive en `public` sale publicado como endpoint REST, así que
cualquiera con la clave anónima podía llamar a `/rest/v1/rpc/soy_tutor_de`. No
enseñaban nada —todas contestan sobre `auth.uid()`—, pero una función que
decide quién ve el calendario de una niña no tiene por qué estar colgada de
internet. Viven en el esquema **`claude_graceday`**, que PostgREST no publica
(migración 0008, regla **R7**).

**Verificado contra la base real:** con dos personas, una no ve ni puede tocar
nada de la otra; sin sesión no se ve nada; las restricciones rechazan una
duración de cero, un bloque al revés, un día fuera de 0-6, una tarea «hecha»
sin fecha y una racha por encima de su récord. **El asesor de seguridad de
Supabase da cero avisos.**

Para fases posteriores: el tutor verá a sus hijos **menos `ciclo`**; una
oración se ve según su `visibilidad`.

---

## 4. Las funciones del programa

### 4.1 Lo puro — se prueba sin bundler ni teléfono
Estos módulos **no importan nada de React Native ni de Expo** a propósito.

**`src/lib/fechas.ts`** — horas y fechas como texto y minutos.
`aMinutos` · `aHora` · `duracionMin` · `fechaLocal` · `horaLocal` ·
`diaSemana` · `fechaLarga` · `instante` (respeta horario de verano) ·
`diasEntre` · `sumarDias` · `mesDe`

**`src/lib/dia.ts`** — la capa 1 → la capa 3.
- **`tocaEsteDia(bloque, fecha, zona)`** — una sola función para las cinco
  repeticiones. Los casos raros —el día 31 en un mes de 30, el 29 de febrero
  en un año que no es bisiesto— **caen en el último día del mes** en vez de
  saltarse: quien puso «el 31» quiere decir «el último».
- `proximaOcupacion(fecha, dias, zona)` → cuándo vuelve el colegio. Un día sin
  colegio y sin decir por qué se lee como si la app no hubiera guardado el
  horario.
- `generarDia(opciones)` → el plan de una fecha. Determinista. Suma las tres
  capas: la rutina, los eventos y los encargos. **Un feriado cancela el
  colegio y la tarea del colegio, pero deja el devocional, la cena y el recado
  de mamá: se cancela el colegio, no la vida.** Una cita con hora se lleva por
  delante lo flexible que le estorba, no lo anclado, y tocarse de punta no es
  chocar.
- `foco(tareas, hora)` → qué toca ahora, o lo siguiente si no hay nada en curso.
- `porcentajeCumplido` / `resumenAvance` — las omitidas salen del total.

**`src/lib/avisos.ts`** — qué suena y cuándo.
- `enSilencio(hora, desde, hasta)` — cubre el cruce de medianoche.
- `avisosDelDia(opciones)` — el silencio se mide **en la hora del aviso**, no en
  la de la tarea.

**`src/lib/rachas.ts`** — rachas, niveles y premios.
- `LOGROS` (24) · `avanzar` (con día de gracia) · `logrosAl` · `proximoLogro`
- `cumplioHoy(via, tareas)` · `chispas(tipo, planeados, marcado)` ·
  `preguntarSiTermino` · `celebracionPor`

**`src/lib/fe.ts`** — el versículo y el devocional del día.
- `diaDelAnio(fecha)` — cuenta bien también en año bisiesto.
- `versiculoDelDia` / `devocionalDelDia` — **se deciden por la fecha, no por el
  reloj ni por sorteo**: no cambian a media mañana ni al volver a abrir la app,
  y dos personas en la misma fecha ven lo mismo.
- `textoEn` · `versionesDe` · `textoParaCompartir`
- El devocional se filtra por edad, pero si ninguno encaja se sirve algo igual:
  mejor dar algo que dejar el día vacío.

**`src/lib/arranque.ts`** — cinco respuestas → una semana.
- `armarSemana(respuestas, personaId)` → catálogo + rutina + ajustes + resumen.
- Catálogos: `OCUPACIONES` (6) · `QUEHACERES` (6) · `GUSTOS` (6)

**`src/lib/eventos.ts`** — la capa 2: lo que tapa la rutina.
- `caeEnFecha(evento, fecha)` — los de varios días caen en todos; los anuales
  comparan mes y día, y **un cumpleaños del 29 de febrero se celebra el 28**
  cuando el año no es bisiesto.
- `eventosDeFecha(eventos, fecha, personaId)` — lo del grupo sale para todos;
  lo de una persona, solo para ella. **Lo que no está confirmado no sale.**
- `libraElDia` · `proximos` · `anosQueCumple` · `enPalabras`
- Catálogos: `NOMBRE_TIPO_EVENTO` · `EMOJI_TIPO_EVENTO` · `EFECTO_POR_TIPO`

**`src/lib/grupos.ts`** — quién ve lo mío y quién me puede mandar algo.
- `puedoVerElCalendarioDe(grupos, miembros, yo, otra)` — la regla de la
  sección 3.1, en un solo sitio y probada sola.
- `quienVeMiCalendario` — para poder decírselo a la persona **por su nombre**.
- `aQuienPuedoMandar` — solo un tutor, solo en la familia, solo a quien no es
  tutor. Una amiga no le pone tareas a otra, y un hijo no le manda deberes a
  su papá.
- `puedoAnadirA` — **cualquier miembro puede**. Una familia no se arma
  pidiéndole permiso a un administrador.
- `puedoAnadirTutor` — eso sí lo reserva quien administra.
- `misGrupos` · `invitacionesPendientes` · `invitados` · `activos` ·
  `miRolEn` · `mandaEn` · `conQuienComparto`

**`src/lib/ciclo.ts`** — el calendario del período.
- `periodos(dias)` — agrupa los días sueltos. **Un hueco de un solo día no
  parte un período en dos**: un día flojo en medio es normal, y partirlo
  estropearía la media.
- `duracionMedia` — de **los tres últimos** intervalos, no de todos: un ciclo
  cambia con los años, y una media de hace dos no dice nada de este mes.
- `predecir(dias, hoy)` / `enPalabras(p)` — **con un solo período devuelve
  `null`, no 28 días.** Hace falta un intervalo entre dos para calcular algo, y
  tres para que la media signifique algo. Con dos dice «más o menos»; con tres
  deja de decirlo.
- `vaLaPenaContarlo(ps)` — señala ciclos muy largos o muy seguidos **sin
  diagnosticar nada**, y manda a un adulto. Una app no le dice a una niña de 13
  años que algo va mal.
- `seLeOfrece(sexo, edad)` — mujer y 12 o más. Es lo único para lo que se usa
  el sexo en toda la app.

**`src/lib/invitaciones.ts`** — invitar a quien todavía no tiene la app.
- `nuevoCodigo(tipo)` — `CASA-4F2A`. **Sin letras ni números que se confundan
  al copiarlos a mano**: fuera 0/O y 1/I/L.
- `limpiarCodigo` · `esCodigoValido` — da igual cómo lo escriba: con espacios,
  en minúsculas o sin guion.
- `pareceCorreo` — a propósito **no** valida a fondo: las reglas de verdad de
  un correo son más raras de lo que parece y una validación estricta acaba
  rechazando direcciones que existen. Se comprueba lo que un dedo se equivoca
  de verdad.
- `armarMensaje(invitacion, grupo, dequien)` — un solo texto para el correo,
  para WhatsApp y para copiarlo a mano: tres textos distintos se irían
  separando con cada cambio.
- `comoCorreo` · `comoWhatsApp` — los enlaces `mailto:` y `wa.me`, escapados.

**`src/lib/encargos.ts`** — los recados y la campanita.
- `sinLeer(encargos, personaId)` — el número rojo cuenta **lo no abierto, no
  lo no hecho**: un recado leído sigue en la lista pero deja de gritar.
- `tareaDeEncargo(encargo)` — sin hora sugerida cae a las 18:00, no a
  medianoche: un recado sin hora es «hoy, cuando puedas».
- `faltanEnElDia(tareas, encargos, fecha, personaId)` — el día se genera una
  vez y se guarda; si mamá manda un recado a media tarde, sin esto se quedaría
  fuera del horario hasta mañana. Se comparan por `encargo_id`, así que volver
  a llamarlo no duplica nada.
- `paraMi` · `queMande` · `esperanRespuesta` · `encargosDeFecha` ·
  `entraAlHorario` · `comoSeLee`

**`src/lib/horarioFoto.ts`** — leer un horario de una foto.
- `leerHorario()` — **todavía devuelve un ejemplo, no lee de verdad.**
- `dudosas` · `aBloques` · `jornada`

### 4.2 La plataforma
**`src/lib/avisosTelefono.ts`** — `prepararAvisos` (permiso + canal Android) ·
`reprogramar` (borra todo y vuelve a poner, así marcar una tarea calla su alarma).

**`src/lib/tema.ts`** — paletas clara y oscura, `colorDeTipo`, `NOMBRE_TIPO`.

### 4.3 Guardar y leer
Una interfaz `Repositorio`, dos implementaciones intercambiables:
`RepositorioLocal` (AsyncStorage, funciona sin montar nada) y
`RepositorioSupabase` (la base real).

**El día y la rutina:** `ajustes` · `guardarAjustes` · `actividades` ·
`guardarActividad` · `borrarActividad` · `rutina` · `guardarBloque` ·
`borrarBloque` · `dia` · `regenerarDia` · `marcarTarea` · `anadirTareaHoy` ·
`anadirRepetida` · `borrarTarea` · `guardarDetalle` · `resumenDias` ·
`rachas` · `logrosGanados` · `chispasTotales` · `registrarApertura` ·
`aplicarArranque` · `empezarDeNuevo`

**Las personas:** `persona` (quien está usando la app) · `guardarPersona` ·
`personas` · `cambiarPersona` · `anadirPersona` · `borrarPersona` ·
`horarioDe` (el día de otra persona, **solo de mirar**)

**Los grupos:** `grupos` · `miembros` · `crearGrupo` · `guardarGrupo` ·
`invitarAGrupo` · `responderInvitacion` · `verMiCalendario` · `salirDelGrupo`

**Las invitaciones:** `invitaciones` · `invitarPorCorreo` ·
`cancelarInvitacion` · `unirseConCodigo`

**El ciclo:** `ciclo` · `marcarCiclo` · `borrarDiaCiclo`. Siempre de quien está
usando la app. **No hay `cicloDe(personaId)` a propósito.**

**Los recados:** `encargos` · `mandarEncargo` · `verEncargo` ·
`responderEncargo` · `archivarEncargo`

**Las fechas:** `eventos` · `guardarEvento` · `borrarEvento`

**Cómo guarda `RepositorioLocal`.** Desde la Fase 5 el almacén es de varias
personas: `personas[]`, `persona_activa`, y un bloque `por_persona` con los
ajustes, el catálogo, la rutina, los días, las rachas, los logros y las
chispas de cada una. Los grupos, los recados y los eventos son de la casa
entera, no de una persona. Lo guardado antes de la Fase 5 (clave
`graceday.v1`) **se convierte al arrancar** y se deja intacto por si hiciera
falta rescatarlo: la persona que había pasa a ser la primera de la casa, con
su racha y sus chispas.

**Cómo mira `RepositorioSupabase`.** En la nube cada quien entra con su
correo, así que no se le puede crear la cuenta a otro desde aquí —y lo dice en
vez de fallar en silencio. `cambiarPersona` mueve un puntero interno, y lo que
se pueda leer de ahí lo decide la base de datos, no la app.

> **Regla:** el repositorio nunca entrega su estado interno. Todos los lectores
> devuelven copias; si no, React ve la misma referencia y no vuelve a pintar.
> Esto causó dos bugs reales.

### 4.4 Las pantallas

| Ruta | Qué hace |
|---|---|
| `bienvenida` | Lo primero al instalar: qué es la app y un video |
| `arranque` | Cinco preguntas → escaneo opcional → **preview editable** → guardar |
| `index` (Hoy) | Lo de ahora arriba, la lista, marcar, añadir algo suelto, la campanita y quién eres |
| `mensajes` | Los que me mandan y los que mando, con respuesta |
| `familia` | Quién usa la app, los grupos, quién ve mi calendario, invitar y entrar con un código |
| `horario` | El día de otra persona del grupo, solo de mirar |
| `ciclo` | El calendario del período. Solo sale en el menú si ella lo encendió |
| `eventos` | Feriados, cumpleaños, exámenes y citas |
| `calendario` | Semana y mes, hacia atrás y adelante, historial de cumplimiento |
| `rutina` | Editar la semana: mover, quitar, añadir |
| `actividad` | Crear o cambiar una cosa del catálogo |
| `versiculo` | El versículo del día en grande, su versión y compartir |
| `rachas` | Las cuatro vías, sus escaleras y las 24 insignias |
| `ajustes` | Nombre, ícono, avisos, sonidos, celebraciones, empezar de nuevo |
| `+not-found` | Enseña Hoy: la app arranca aunque no se sirva en la raíz |

**Componentes:** `Cabecera` · `CampoTexto` · `Aviso` · `Repeticion` ·
`TarjetaVersiculo` · `FilaTarea` · `DetalleTarea` · `TarjetaAhora` ·
`AnilloProgreso` · `Celebracion` · `SelectorHora` · `PreguntaTerminaste` ·
`Enlace` · `Campanita` · `MenuLateral` (+ `BotonMenu`)

### 4.5 Cómo se navega

El **menú de las tres rayas** vive en `Cabecera`, así que está en todas las
pantallas menos en el editor de actividades —salirse a media edición pierde lo
escrito. Trae nueve sitios y marca en cuál estás con `aria-current`.

**Lo que NO entra al menú, a propósito:**

| | Por qué |
|---|---|
| La racha y las chispas | No es un sitio al que ir, es el premio. Escondida detrás de un botón deja de hacer que vuelvas |
| La campanita | Un número rojo dentro de un menú no avisa de nada |
| Lo que viene (un cumple, un examen) | Igual: solo sale cuando hay algo |

El velo oscuro va **al lado del cajón, no debajo**: si lo tapara entero, un
toque en el centro caería sobre el cajón en vez de cerrar.

> **`CampoTexto` y `Aviso` existen para cumplir R2** (`REGLAS.md`): ningún
> campo se queda callado. `CampoTexto` trae etiqueta, ayuda, marca de
> obligatorio y aviso en el mismo sitio, así que es más fácil hacerlo bien que
> mal. `Aviso` va junto al botón.
>
> **`Cabecera` es propia y no la del navegador** porque react-navigation **no
> pinta el botón de volver en web**: la app se quedaba sin salida en el
> calendario, la rutina y los ajustes. Toda pantalla que no sea Hoy la lleva.

---

## 5. Reglas de negocio

### 5.1 Los avisos
- Por defecto **10 min antes**, y el aviso dice qué toca.
- Cada actividad puede llevarle la contraria.
- **El devocional suena distinto** del resto.
- El silencio nocturno se mide en la hora **del aviso**.
- Al marcar una tarea se reprograma todo, así su alarma deja de sonar.

### 5.2 Las rachas — cuatro, no una
Una racha única castiga demasiado: perder 40 días de devocional por no ordenar
el cuarto una vez hace que la gente deje la app.

| Vía | Se cumple cuando | Escalera |
|---|---|---|
| 💜 Devocional | todas las tareas de tipo `fe` están hechas | Semilla 3 · Raíz 7 · Brote 14 · Árbol 30 · Fruto 100 · Cosecha 365 |
| ✅ Cumplir tu día | todo lo que cuenta está hecho | En marcha 3 · Constante 7 · Sin fallar 14 · Imparable 30 · De hierro 100 · Leyenda 365 |
| 👋 Abrir la app | se abrió | Presente 3 · Fiel 7 · Sin faltar 14 · Siempre aquí 30 · Ancla 100 · Un año contigo 365 |
| 🙏 Orar por otros | se dio un amén (fase 6) | Primer amén 3 · En oración 7 · De rodillas 14 · Sin descanso 30 · Centinela 100 · Sin soltar 365 |

- **Un día de gracia al mes:** fallar un día no rompe la racha.
- **Un día contado no se descuenta:** si lo hiciste, lo hiciste.
- **Los nombres son neutros** a propósito: la app se vende a familias, y a un
  papá no le puede salir «Disciplinada».

### 5.3 Los premios, según el tipo
Premiar la velocidad en el estudio enseña lo contrario de lo que se busca.

| Tipo | Qué se premia | Chispas |
|---|---|---|
| `casa` | La **rapidez** | 10 + hasta 15 según el tiempo ahorrado |
| `estudio` | **Haber terminado**, no parar el reloj | 10 + 10 si `termino_de_verdad` |
| `fe`, `deporte` | El **tiempo completo** | 10 + 10 si duró lo planeado |
| otros | Haberlo hecho | 10 |
| — | **Día perfecto** | +50 |

Al marcar `estudio` antes de tiempo, la app pregunta: *¿terminaste, o lo dejas
para después?* Solo el primer caso paga.

### 5.4 Cómo el asistente arma la semana
1. El **devocional primero**, antes que nada.
2. La ocupación en sus días y horas.
3. El **estudio justo al salir** (solo colegio, escuela o universidad).
4. Los quehaceres después, y **solo si caben antes de la cena**.
5. **Un gusto al día**, rotando.
6. Cena a las 19:00 y a dormir a la hora elegida: anclas.
7. **El fin de semana empieza una hora más tarde.**

### 5.5 El calendario
Dos vistas, y ninguna intenta ser Google Calendar en una pantalla de teléfono.

- **Mes:** rejilla. En cada celda, el número y **hasta cuatro barritas de
  color**, una por tipo de cosa que hay ese día. De un vistazo se ve si el día
  está cargado de estudio, de casa o de fe, sin leer una palabra. Barra llena =
  terminado; a media tinta = pendiente. El fondo verde es un día cumplido del
  todo, el gris un fin de semana, y el rojizo un feriado (llega en la fase 5).
- **Semana:** ahí sí cabe todo, así que es una **agenda de verdad**: los siete
  días en vertical, cada uno con sus tareas, su hora, su color de tipo y su
  tic. Siete columnas en un teléfono no se leen; siete filas sí.

Ambas navegan hacia atrás y adelante, con «Volver a hoy» cuando te alejas.

`ResumenDia` lleva `fecha`, `total`, `hechas`, `porcentaje`, `tipo_dia` y una
lista ligera de tareas (`titulo`, `emoji`, `tipo`, `hora_inicio`, `estado`) —
lo justo para dibujar sin cargar el día entero.

### 5.6 La fe en el día
- **El versículo del día** sale arriba en Hoy, corto. Al tocarlo se abre en
  grande: la lámina **es** la imagen para compartir, se ve igual en pantalla
  que en una captura. Compartir el PNG como archivo necesita
  `react-native-view-shot`; por ahora se comparte el texto, que es lo que la
  gente pega en WhatsApp de todos modos.
- **El devocional** vive dentro de la tarea de tipo `fe`: al abrirla salen el
  pasaje, el texto y **la pregunta**, y el campo de nota pasa a llamarse «Tu
  respuesta». Lo que escribe se guarda en `tareas_dia.nota`.
- **El devocional no es solo el que da la app.** Al abrir la tarea de fe se
  pregunta **cómo lo hiciste hoy**: el de GraceDay, leyendo la Biblia, con un
  libro, en familia, oyendo la radio, con otra app, en la iglesia o de otra
  manera. Todo cuenta igual para la racha; lo que cambia es poder mirar atrás.
  El texto de la app solo se impone si elegiste el suyo — con la Biblia o un
  libro, solo pide tu nota.
- La fila del día enseña con qué lo hiciste (📖, 👨‍👩‍👧…) y si dejaste nota (📝).
- Una tarea que no es de fe no trae devocional.

**Una foto del devocional** que leíste queda para cuando llegue la cámara
(fase 11): necesita el mismo trabajo de permisos y almacenamiento, y elegir de
una lista es más rápido que fotografiar.

### 5.7 Los formularios avisan, no se apagan
Ningún botón se queda muerto sin decir por qué (R2). Al tocar «Siguiente» o
«Guardar» con algo sin llenar:

| Dónde | Qué avisa |
|---|---|
| Arranque, paso 1 | «Falta tu nombre. Es lo único que necesito para seguir.» |
| Arranque, paso 4 | «No marcaste ningún día. Elige al menos uno, o pon Ninguno arriba.» |
| Añadir algo a hoy | «Falta decir qué hay que hacer.» |
| Crear una actividad | «Falta el nombre. ¿Cómo se llama esta cosa que vas a hacer?» |
| Ajustes, nombre vacío | «Si lo dejas vacío se guardará como Tú.» |

El aviso se quita en cuanto se empieza a escribir. Lo opcional también se dice
—«puedes no marcar nada y añadirlo después»— para que nadie se quede parado
creyendo que falta algo.

**La única excepción:** un botón puede apagarse *mientras trabaja*, y solo si
lo dice («⏳ Leyendo tu horario…»).

### 5.8 Un día vacío nunca se queda callado
Poner el colegio de 08:00 a 15:00 un sábado y abrir la app parecía que no había
guardado nada. Los datos estaban bien; lo que faltaba era decirlo:

- **En Hoy:** «Hoy no hay escuela. Tu horario está guardado y vuelve el lunes.»
- **En la rutina:** cada día lleva **la cuenta de cuántas cosas tiene**, así se
  ve de un vistazo que L-V tienen más que S-D y que el colegio sigue ahí.
- Un día del todo vacío dice qué días sí tienen cosas, con un atajo para saltar.

### 5.9 Añadir una tarea, y cada cuánto
El botón dice **«Añadir una tarea»**, no «solo para hoy», y pregunta cada
cuánto se repite — las mismas opciones que un calendario normal:

| Opción | Qué guarda |
|---|---|
| Solo este día | una tarea suelta en `tareas_dia` |
| Todos los días | una regla `diaria` |
| Cada semana | una regla `semanal` **por cada día marcado**, para poder moverlas y quitarlas una a una |
| Cada tantos días | una regla `cada_n_dias` anclada en la fecha |
| Cada mes el N | una regla `mensual` |
| Cada año el N de M | una regla `anual` |

La hoja dice en palabras qué va a pasar —«Se repetirá cada L, X, V»— antes de
guardar. La pantalla de la rutina edita las semanales y avisa de cuántas se
repiten de otra manera.

### 5.10 Los tres gestos de una tarea
- **El círculo** marca y desmarca.
- **El cuerpo** abre el detalle (nota, minutos, chispas).
- **Dejar apretado** la salta — y saltada se ve **distinta** de hecha:
  fondo gris, etiqueta SALTADA y un guion en vez del tic.

### 5.11 La familia, y quién ve a quién

- Una cuenta nueva **ya tiene casa**: se puede añadir a mamá sin pasar antes
  por una pantalla de «crear un grupo».
- Quien instala entra como **miembro**, no como tutor.
- Cambiar de persona cambia **todo**: el día, la rutina, las rachas y las
  chispas son suyos.
- Cambiar a alguien que todavía no armó su día **no te tira al asistente sin
  decir nada**: tocaste el nombre de mamá, no pediste un cuestionario. Sale una
  tarjeta que lo explica y deja volver.
- La pantalla de Familia dice **por su nombre** quién ve tu calendario. Que
  papá y mamá te vean está bien; que no te lo digan, no.

### 5.12 Añadir gente: dos maneras

**Cualquier miembro puede añadir a alguien.** Una familia no se arma
pidiéndole permiso a un administrador: si la hija quiere meter a su hermana,
la mete. Lo único reservado es **añadir a otro papá o mamá**, y cuando no se
puede la app lo dice en vez de esconder la opción (R2).

| | Solo con su nombre | Con su correo |
|---|---|---|
| Cuándo entra | **Ya**, en este teléfono | Cuando acepte, desde el suyo |
| Para qué sirve | El teléfono de casa: mamá toca su nombre arriba y ya está usando la app | Alguien que todavía no tiene la app |
| Qué recibe | Nada, ya está dentro | Un correo con un código |
| Qué ve al entrar | Su propio día, con la rutina de fábrica | El grupo y los horarios de quien los comparta |

La invitación se manda desde el teléfono de quien invita: se abre su correo o
su WhatsApp con el mensaje escrito. El mismo texto sirve para los dos y para
copiarlo a mano — tres textos distintos se irían separando con cada cambio.

**El código es de una invitación y de un solo uso**, no del grupo. Uno de
grupo que sirviera siempre acabaría dando vueltas por ahí, y quien lo
encontrara un año después entraría igual.

### 5.13 Los horarios del grupo

Tocar a alguien en Familia abre su día. Es **solo de mirar**: no hay casillas
que marcar. El día de alguien lo marca quien lo vive; un papá que pudiera
tachar las tareas de su hija desde su teléfono estaría llevándole la agenda,
no acompañándola.

Mirar el día de otra persona **no se lo guarda**. Si lo escribiera, se le
quedaría un día armado que ella no abrió, congelado con la rutina de ese
momento.

### 5.14 Los recados

- Tres tipos: una **tarea** entra en el horario de ese día; un
  **recordatorio** solo avisa; un **mensaje** se lee y se contesta.
- **El número rojo cuenta lo no abierto, no lo no hecho.** Un recado leído
  sigue en la lista pero deja de gritar.
- Un recado que llega con el día ya armado **entra igual**, y no dos veces.
- **Marcar la tarea aquí se ve allá:** quien la mandó ve que ya está.
- Quien lo recibe puede contestar, y quien lo mandó ve la respuesta.

**Quién manda qué a quién.** La línea no es «quién puede escribir» sino
**«quién puede meterle algo en el horario a otro»**:

| | Mensaje · Recordatorio | Tarea |
|---|---|---|
| Quién lo manda | Cualquiera de tus grupos | Solo un papá o una mamá |
| Qué hace | Se lee y se contesta | **Entra en el horario de ese día** |

Una hija le puede escribir a su mamá; ponerle una tarea en su día, no. Y el
botón de mandar **está siempre**: si todavía no tienes a nadie en tus grupos,
se pulsa y lo dice.

> Un encargo no es una orden que se cuela en el horario sin avisar. Llega a la
> campanita, se ve quién lo mandó, y el que lo recibe puede contestar. Una app
> que le mete tareas a una niña sin que ella las vea llegar no es una agenda,
> es un vigilante.

### 5.15 El sexo, y el calendario del período

La pregunta va en **el primer paso del asistente**, junto al nombre y la edad.
No por comodidad: la del período depende de las dos, y así el bloque aparece
solo cuando toca. Tres opciones, y **«prefiero no decir» es una respuesta
entera**.

- Se ofrece a una **mujer de 12 o más**. Cuando no se ofrece, la app dice por
  qué en vez de callarse.
- **Con un solo período no se predice nada.** Se dice que falta apuntar otro.
- Con dos, se dice **«más o menos»**. Con tres, ya no.
- Los ciclos raros se comentan sin diagnosticar, y mandan a un adulto.
- **No lo ve nadie más**, y la app se lo promete por escrito antes de que
  encienda nada.
- Se apaga desde Ajustes, y **apagarlo no borra**.

### 5.16 Las fechas importantes

- **Un evento no borra la rutina, la tapa.** Un feriado libra el día de
  colegio pero deja el devocional y la cena, porque el colegio se cancela y la
  vida no. El recado de mamá tampoco se va: sacar la basura no es feriado.
- Un feriado guardado hoy **rehace los días que aún no han pasado**, no los ya
  vividos: rehacer el martes pasado borraría lo que la persona ya marcó.
- Un evento con hora entra al horario como una tarea más; uno de todo el día
  se anuncia arriba y no ocupa hora — un cumpleaños no se marca a las 3 de la
  tarde.
- Los eventos se pintan en el calendario **aunque el día no esté guardado**:
  un feriado del mes que viene tiene que verse ahora, no cuando llegue.
- **Nada leído de una foto entra al horario sin que un humano lo apruebe.**

---

## 6. Cómo está montado

| Pieza | Elección | Por qué |
|---|---|---|
| App | React Native + Expo SDK 57 | Un código, iOS y Android |
| Rutas | expo-router | |
| Datos | Supabase (Postgres + RLS) | O AsyncStorage sin montar nada |
| Avisos | expo-notifications | **Una web no despierta el teléfono con la pantalla apagada** |
| Cobro | Compras dentro de la app (fase 10) | |
| IA | Claude — cuando entre | Hoy el arranque va con reglas |

**Verificación:** 268 pruebas (`npm test`) — la lógica pura y el repositorio
entero, con un AsyncStorage en memoria que lo sustituye fuera del teléfono—,
TypeScript estricto, y **quince pruebas de extremo a extremo** sobre el bundle
web real, con navegador. Todas **fijan la fecha** antes de abrir la app: una
prueba que depende del día en que se corre no protege nada.

---

## 7. Las fases

| # | Qué | Tablas | Estado |
|---|---|---|---|
| 1 | El día con alarmas | 7 | ✅ |
| 2 | Rachas, niveles y celebración | +3 | ✅ |
| 3 | Bienvenida y arranque | +0 | ✅ |
| 4 | Fe: devocionales y versículo del día | +4 | ✅ |
| 5 | La familia y la campanita | +4 | ✅ |
| 6 | Oraciones | +2 | pendiente |
| 7 | El Muro público | +1 | pendiente |
| 8 | Lo privado: calendario de ciclo | +1 | ✅ |
| 9 | Amigas: invitar, planear, chatear | +3 | pendiente |
| 10 | Invitados y cobro | +1 | pendiente |
| 11 | **Leer el horario de una foto de verdad** | +1 | pendiente |

### 7.1 Lo que falta de cada fase pendiente

**Fase 6 — Oraciones.** `oraciones` con cinco niveles de visibilidad,
`oraciones_apoyo`. Las contestadas son un filtro, no una tabla.

**Fase 7 — El Muro.** `reportes`. Página web abierta sin cuenta ni descarga.
Tres protecciones: publicar sin nombre, revisión automática antes de salir, y
**permiso de tutor para que un menor publique**.

**Fase 9 — Amigas.** `invitaciones` (grupo o devocional, por app o WhatsApp),
`mensajes` (el grupo *es* el chat), `respuestas_evento` (sí/no/tal vez).

**Fase 10 — Cobro.** `suscripciones`: **paga el grupo familiar**, no la
persona. Una invitada entra gratis al chat y al devocional al que la llamaron.
Su cuenta de menor necesita el correo de un tutor — y esa es exactamente la
persona que va a pagar.

**Fase 11 — La foto.** `fotos`. Ya está el flujo entero (revisar, corregir,
aceptar) con datos de ejemplo en `horarioFoto.ts`; falta el modelo de visión.
Lo leído entra a `eventos` **sin confirmar**.

### 7.2 Guardado para después
- **Entrenar el cuerpo y el espíritu.** Minutos de deporte configurables, y al
  marcar el entrenamiento físico la app recuerda el del espíritu. *Es la idea
  que diferencia esta app.*
- **Entrenamientos funcionales** en casa (mancuernas y un banco). +2 tablas.
- **Nutrición.**
- **Widget de iOS**: devocional, lo de hoy y el versículo sin abrir la app.

---

## 8. Decisiones y por qué

| Decisión | Por qué |
|---|---|
| Tres capas separadas | Sin ellas, un feriado rompe la app |
| Un hábito es una actividad con `es_habito` | Quitó tres tablas |
| Una familia es un grupo | Quitó `familias`; chat y calendario sirven igual para amigas |
| Cuatro rachas, no una | Perderlo todo por un fallo hace que la gente abandone |
| Día de gracia mensual | El primer día malo no se lleva al usuario |
| Premios distintos por tipo | Premiar velocidad en el estudio paga por estudiar menos |
| Insignias con nombres neutros | Se vende a familias enteras |
| `hora_fin_ocupacion` es un dato | Es lo que hace la app vendible fuera de esta casa |
| App nativa, no web | Los avisos son el corazón, y una web no los da |
| El Muro en web | Lo que tiene que llegar a todos no debe depender de una descarga |
| La foto nunca sale en el Muro | Es una menor en una página abierta |
| El ciclo, ni los tutores | Es información de salud suya |
| Rachas persistidas, no consulta | Se leen en cada apertura y hay que saber cuándo se ganó cada insignia |
| El texto bíblico, en tabla aparte por versión | Las traducciones modernas tienen derechos: añadir una licenciada debe ser meter filas |
| Una sola tabla de repeticiones | Dos sistemas —la semana por un lado, el resto por otro— se contradicen en cuanto crecen |
| El día 31 cae en el último del mes | Quien puso «el 31» quiere decir «el último», no «sáltate febrero» |
| Un día vacío explica por qué | Sin eso, un sábado sin colegio se lee como que la app perdió el horario |
| El método del devocional se elige, no se fotografía | Tocar una lista es más rápido, y la foto necesita cámara y almacenamiento |
| El versículo se elige por la fecha | No puede cambiar a media mañana ni al volver a abrir |
| Lo puro separado de la plataforma | Zonas horarias y medianoche se prueban sin simulador |
| Solo dos roles de grupo: tutor y miembro | «Dueño» como rol convertía en jefa a la niña que monta la app para su casa, y su mamá no podía mandarle nada. Quién lo creó vive en `grupos.creado_por` |
| El tutor ve el calendario del hijo, y la app se lo dice al hijo | Para eso son los papás; mirarlo a escondidas es otra cosa |
| El número rojo cuenta lo no abierto | Un recado leído y aún sin hacer ya no es una novedad: sigue en la lista, pero deja de gritar |
| Un recado sin hora cae a las 18:00 | Es «hoy, cuando puedas»; a medianoche se quedaría fuera del día |
| Un feriado no rehace los días ya vividos | Rehacerlos borraría lo que la persona ya marcó |
| Las ayudas de las políticas viven en `claude_graceday` | Todo lo que está en `public` sale publicado como REST, y quién ve el calendario de una niña no se decide desde internet |
| El almacén local se migró a una clave nueva | `graceday.v1` se deja intacto: si la conversión fallara, lo de antes sigue ahí |
| El código es de una invitación, no del grupo | Uno de grupo vale para siempre: quien lo encontrara dentro de un año entraría igual |
| Lo que cierra la puerta es el correo, no el código | Un código por grupo obligaba a dejar leer la lista de grupos para poder entrar, y eso publica el nombre de la casa de cualquier familia |
| Cualquier miembro añade; solo quien administra añade tutores | Un tutor ve el calendario de todos los hijos: fabricar uno no puede estar al alcance de cualquiera |
| El horario de otra persona es solo de mirar | Tachar las tareas de tu hija desde tu teléfono es llevarle la agenda, no acompañarla |
| Mirar el día de otro no se lo guarda | Se le quedaría un día armado que no abrió, congelado con la rutina de ese momento |
| `pareceCorreo` no valida a fondo | Las reglas de verdad de un correo son más raras de lo que parece; una validación estricta rechaza direcciones que existen |
| Cualquiera escribe; solo un tutor pone tareas | La línea no es quién puede hablar, es quién puede meterle algo en el horario a otro |
| Los ids llevan un contador, no solo la hora | Dos cosas creadas en el mismo milisegundo salían con el mismo id |
| Las pruebas de navegador fijan la fecha | Pasaban el domingo y fallaban el lunes: el día de la semana cambia el horario |
| La navegación en un menú, no apilada bajo el día | Había que bajar hasta abajo, y cuantas más tareas tenía el día, más lejos quedaba |
| La racha y la campanita **fuera** del menú | No son sitios a los que ir; un premio escondido deja de premiar |
| La pantalla se llama «Mensajes», no «Recados» ni «Chat» | «Recado» cambia de país; «chat» promete una conversación que aún no existe |
| Por dentro sigue siendo `encargos` | La Fase 9 necesita `mensajes` para el chat de verdad |
| El sexo se pregunta en el paso 1, no en uno aparte | La pregunta del período depende del sexo **y** de la edad, y las dos ya están ahí |
| Con un período no se predice nada | Una fecha inventada con la misma cara que una calculada es peor que ninguna: se organiza confiando en ella |
| La media, de los tres últimos ciclos | Un ciclo cambia con los años; una media de hace dos no dice nada de este mes |
| El ciclo no tiene `cicloDe(personaId)` | Si existiera, alguien acabaría llamándolo |
| Apagar el calendario no borra lo apuntado | Apagar una cosa y perderla son dos acciones distintas |
