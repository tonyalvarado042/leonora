# GraceDay — Documentación completa

App nativa de iOS y Android para organizar el día, los hábitos de fe y las
fechas importantes. Pensada para una niña de 13 años y vendible a familias
enteras.

**Estado: fases 1, 2 y 3 hechas y verificadas.**
Última actualización: 2026-08-29

- **Índice del repositorio:** `README.md`
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
| **2. Eventos** | Feriados, exámenes, cumpleaños | `eventos` (fase 5) | Siempre |
| **3. El día** | El plan del martes 3 | `dias` + `tareas_dia` | Se genera cada día |

La capa 3 se **genera** combinando 1 y 2, y es una **copia**: mover algo hoy no
toca la rutina, y regenerar el día con los mismos datos da siempre lo mismo.

---

## 2. Las tablas

10 tablas creadas. Las de fases posteriores están en la sección 7.

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

### 2.4 `rutina` — la capa 1
Un bloque = una actividad, un día de la semana, una hora.

| Campo | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | |
| `persona_id` | uuid → `personas` | |
| `actividad_id` | uuid → `actividades` (cascada) | |
| `modo` | enum `escolar｜vacaciones` | Dos rutinas distintas sin duplicar tabla |
| `dia_semana` | smallint 0-6 | **0 = domingo**, igual que `Date.getDay()` |
| `hora_inicio` / `hora_fin` | time | `hora_fin > hora_inicio` |
| `activo` | boolean | |

Índice: `(persona_id, modo, dia_semana) where activo`.

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

### 2.11 Cómo se relacionan

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
    └──1:N──► logros_ganados ──N:1──► logros
```

**Los borrados:** quitar la cuenta se lleva todo. Quitar una actividad se lleva
sus bloques de rutina (cascada) pero **deja las tareas ya vividas** (`set
null`), porque el historial no se borra.

---

## 3. Seguridad

RLS activo en las 10 tablas. Cuatro reglas:

1. **Cada quien ve lo suyo y nada más.** `persona_id = auth.uid()`.
2. `tareas_dia` se filtra por su `dias` padre.
3. `logros` es catálogo: lo lee cualquiera con sesión, nadie lo escribe.
4. Las funciones de disparador son `SECURITY DEFINER` y tienen **revocado el
   EXECUTE** de `anon` y `authenticated` (migración 0003): si no, quedaban
   publicadas como RPC.

**Verificado contra la base real:** con dos personas, una no ve ni puede tocar
nada de la otra; sin sesión no se ve nada; y las restricciones rechazan una
duración de cero, un bloque al revés, un día fuera de 0-6, una tarea «hecha»
sin fecha y una racha por encima de su récord.

Para fases posteriores: el tutor verá a sus hijos **menos `ciclo`**; una
oración se ve según su `visibilidad`; un calendario solo si su dueño puso
`ve_mi_calendario`.

---

## 4. Las funciones del programa

### 4.1 Lo puro — se prueba sin bundler ni teléfono
Estos módulos **no importan nada de React Native ni de Expo** a propósito.

**`src/lib/fechas.ts`** — horas y fechas como texto y minutos.
`aMinutos` · `aHora` · `duracionMin` · `fechaLocal` · `horaLocal` ·
`diaSemana` · `fechaLarga` · `instante` (respeta horario de verano) ·
`diasEntre` · `sumarDias` · `mesDe`

**`src/lib/dia.ts`** — la capa 1 → la capa 3.
- `generarDia(opciones)` → el plan de una fecha. Determinista.
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

**`src/lib/arranque.ts`** — cinco respuestas → una semana.
- `armarSemana(respuestas, personaId)` → catálogo + rutina + ajustes + resumen.
- Catálogos: `OCUPACIONES` (6) · `QUEHACERES` (6) · `GUSTOS` (6)

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

`persona` · `guardarPersona` · `ajustes` · `guardarAjustes` · `actividades` ·
`guardarActividad` · `borrarActividad` · `rutina` · `guardarBloque` ·
`borrarBloque` · `dia` · `regenerarDia` · `marcarTarea` · `anadirTareaHoy` ·
`borrarTarea` · `guardarNota` · `resumenDias` · `rachas` · `logrosGanados` ·
`chispasTotales` · `registrarApertura` · `aplicarArranque` · `empezarDeNuevo`

> **Regla:** el repositorio nunca entrega su estado interno. Todos los lectores
> devuelven copias; si no, React ve la misma referencia y no vuelve a pintar.
> Esto causó dos bugs reales.

### 4.4 Las pantallas

| Ruta | Qué hace |
|---|---|
| `bienvenida` | Lo primero al instalar: qué es la app y un video |
| `arranque` | Cinco preguntas → escaneo opcional → **preview editable** → guardar |
| `index` (Hoy) | Lo de ahora arriba, la lista, marcar, añadir algo suelto |
| `calendario` | Semana y mes, hacia atrás y adelante, historial de cumplimiento |
| `rutina` | Editar la semana: mover, quitar, añadir |
| `actividad` | Crear o cambiar una cosa del catálogo |
| `rachas` | Las cuatro vías, sus escaleras y las 24 insignias |
| `ajustes` | Nombre, ícono, avisos, sonidos, celebraciones, empezar de nuevo |
| `+not-found` | Enseña Hoy: la app arranca aunque no se sirva en la raíz |

**Componentes:** `Cabecera` · `FilaTarea` · `DetalleTarea` · `TarjetaAhora` ·
`AnilloProgreso` · `Celebracion` · `SelectorHora` · `PreguntaTerminaste` · `Enlace`

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

### 5.6 Los tres gestos de una tarea
- **El círculo** marca y desmarca.
- **El cuerpo** abre el detalle (nota, minutos, chispas).
- **Dejar apretado** la salta — y saltada se ve **distinta** de hecha:
  fondo gris, etiqueta SALTADA y un guion en vez del tic.

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

**Verificación:** 83 pruebas de la lógica pura (`npm test`), TypeScript
estricto, y cuatro pruebas de extremo a extremo sobre el bundle web real.

---

## 7. Las fases

| # | Qué | Tablas | Estado |
|---|---|---|---|
| 1 | El día con alarmas | 7 | ✅ |
| 2 | Rachas, niveles y celebración | +3 | ✅ |
| 3 | Bienvenida y arranque | +0 | ✅ |
| 4 | Fe: devocionales y versículo del día | +4 | pendiente |
| 5 | La familia y la campanita | +4 | pendiente |
| 6 | Oraciones | +2 | pendiente |
| 7 | El Muro público | +1 | pendiente |
| 8 | Lo privado: calendario de ciclo | +1 | pendiente |
| 9 | Amigas: invitar, planear, chatear | +3 | pendiente |
| 10 | Invitados y cobro | +1 | pendiente |
| 11 | **Leer el horario de una foto de verdad** | +1 | pendiente |

### 7.1 Lo que falta de cada fase pendiente

**Fase 4 — Fe.** `devocionales` (pasaje, texto, pregunta), `versiculos` con
`dia_del_año`, `versiculos_versiones` (RVR, NVI, NTV), `versiculos_guardados`.
El versículo arriba en Hoy; al tocarlo, varias versiones y una imagen para
compartir que se genera en el teléfono.

**Fase 5 — La familia.** `grupos` (**una familia es un grupo de tipo familia**),
`miembros_grupo` con `ve_mi_calendario`, `encargos` (tarea, recordatorio o
consejo, con respuesta), `eventos`. La campanita junta todo.

**Fase 6 — Oraciones.** `oraciones` con cinco niveles de visibilidad,
`oraciones_apoyo`. Las contestadas son un filtro, no una tabla.

**Fase 7 — El Muro.** `reportes`. Página web abierta sin cuenta ni descarga.
Tres protecciones: publicar sin nombre, revisión automática antes de salir, y
**permiso de tutor para que un menor publique**.

**Fase 8 — El ciclo.** `ciclo`. **Única tabla sin excepción de tutor.**

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
| Lo puro separado de la plataforma | Zonas horarias y medianoche se prueban sin simulador |
