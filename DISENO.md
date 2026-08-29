# Leonora — Programa de horarios, hábitos de fe y organización del tiempo

**Documento de diseño. Todavía no hay código.**
Fecha: 2026-08-29

---

## 1. Qué es

Una app que arma el día de Leonora (13 años) y le ayuda a cumplirlo: su hora de
devocional, sus horas de estudio, sus quehaceres y sus fechas importantes.
Está pensada desde el día uno para que **otra familia la pueda usar y comprar**:
nada está fijo "a lo Leonora", todo es configuración.

Respuesta corta a tu pregunta: **sí, se puede hacer**, y ninguna de las piezas
que pediste es exótica. La foto del calendario escolar es la parte más delicada,
pero es un problema resuelto (visión + revisión humana antes de guardar).

---

## 2. La idea central del diseño

Todo el programa se apoya en separar **tres capas**. Esta es la decisión más
importante del diseño; si se mezclan, la app se rompe el primer día feriado.

| Capa | Qué es | Cada cuánto cambia |
|---|---|---|
| **1. Plantilla (rutina)** | Cómo es un lunes *normal*: devocional 1h, estudio hasta las 14:00, ordenar el cuarto, cena. | Casi nunca |
| **2. Eventos (excepciones)** | Feriados, exámenes, entregas, cumpleaños, viajes. Vienen de fotos o a mano. | Todo el tiempo |
| **3. Día generado** | El plan real del *martes 3 de marzo*. Es lo que Leonora va marcando. | Se genera cada día |

El programa **genera** la capa 3 combinando la 1 y la 2. Así, cuando la foto del
calendario dice "no hay clases el 15 de mayo", el generador sabe que ese día
suelta el bloque de estudio y le avisa: *"mañana no hay clases, ¿qué quieres
hacer con esas 3 horas?"*.

Y como la capa 3 es una copia, si Leonora mueve algo hoy, **no daña su rutina**.

---

## 3. Las tablas

Base de datos: **PostgreSQL** (vía Supabase). 20 tablas en total, pero solo
**8 son necesarias para la primera versión** (marcadas con ⭐).

### 3.1 Personas y hogar

**`hogares`** — la unidad que se vende. Una familia = un hogar.
`id`, `nombre`, `plan` (gratis/premium), `creado_en`

**`usuarios`** ⭐ — el perfil de cada persona.
`id`, `hogar_id`, `nombre`, `email`, `fecha_nacimiento`, `zona_horaria`, `avatar`, `creado_en`

**`miembros_hogar`** — quién puede ver y editar a quién.
`hogar_id`, `usuario_id`, `rol` (tutor | niño), `puede_editar`

> Un tutor (papá/mamá) ve y ajusta el horario del niño. El niño ve el suyo.

**`configuracion_usuario`** ⭐ — **aquí vive todo lo que hace que la app no sea solo de Leonora.**
`usuario_id`, `hora_despertar`, `hora_dormir`, `hora_fin_estudio` (por defecto **14:00**),
`duracion_devocional_min` (por defecto **60**), `momento_devocional` (mañana | tarde | noche),
`dias_escolares` (L-V), `idioma`, `notificaciones_activas`

> Que "termina de estudiar a las 2:00" sea una fila de configuración y no una
> constante en el código es exactamente lo que lo hace vendible.

### 3.2 Catálogo de actividades

**`categorias`** ⭐ — Fe, Estudio, Quehaceres, Familia, Salud, Descanso, Ocio.
`id`, `hogar_id` (null = catálogo base), `nombre`, `color`, `icono`, `es_sistema`

**`actividades`** ⭐ — la biblioteca reutilizable: "Devocional", "Ordenar cuarto", "Cena", "Tarea de mate".
`id`, `hogar_id`, `categoria_id`, `nombre`, `duracion_min`, `energia` (alta|media|baja),
`es_movible`, `notas`, `activa`

> `es_movible` importa: la cena y el devocional son **anclas** (no se mueven);
> "leer un capítulo" flota y la IA lo puede reubicar.

### 3.3 La rutina

**`plantillas_horario`** ⭐ — "Semana escolar", "Vacaciones", "Verano".
`id`, `usuario_id`, `nombre`, `vigente_desde`, `vigente_hasta`, `activa`

> Tener varias plantillas es lo que permite que en vacaciones el día cambie solo.

**`bloques_plantilla`** ⭐ — el contenido de la rutina.
`id`, `plantilla_id`, `actividad_id`, `dia_semana` (0-6), `hora_inicio`, `hora_fin`,
`es_fijo`, `prioridad`, `orden`

> Aquí viven literalmente: *devocional 1h*, *estudio hasta 14:00*,
> *ordenar cuarto 14:00-14:30*, *cena 19:00*.

### 3.4 Calendario y excepciones

**`eventos`** ⭐ — feriados, fechas escolares, cumpleaños, citas.
`id`, `hogar_id`, `usuario_id` (null = todo el hogar), `tipo` (feriado | escolar | examen |
entrega | cumpleaños | cita | viaje | personal), `titulo`, `descripcion`,
`fecha_inicio`, `fecha_fin`, `hora_inicio`, `hora_fin`, `todo_el_dia`,
`recurrencia` (RRULE — los cumpleaños se repiten solos cada año),
`origen` (manual | foto | ics), `importacion_id`,
`accion_horario` (cancelar_escuela | dia_libre | bloquear_horas | solo_recordar),
`confianza` (0-1, si vino de una foto), `confirmado`

> `confirmado` es clave: **nada que la IA lea de una foto entra al horario sin
> que un humano lo apruebe.** Si el modelo lee mal una fecha, se ve en la
> pantalla de revisión, no en el horario del miércoles.

### 3.5 Importar por foto

**`importaciones`** — una foto subida.
`id`, `usuario_id`, `tipo` (calendario_escolar | feriados | horario_clases),
`archivo_url`, `estado` (subido → procesando → revisión → aplicado | error),
`respuesta_cruda` (jsonb), `resumen`, `creado_en`

**`importaciones_items`** — cada fecha que la IA encontró en esa foto.
`id`, `importacion_id`, `datos_extraidos` (jsonb), `texto_leido` (lo que literalmente
vio, para auditar), `confianza`, `estado` (propuesto | aceptado | rechazado | duplicado),
`evento_id` (se llena al aprobar)

> Dos tablas porque una foto produce muchas fechas, y se aprueban una por una
> (o "aceptar todas").

### 3.6 El día real

**`dias`** ⭐ — el plan de una fecha concreta.
`id`, `usuario_id`, `fecha`, `plantilla_id_usada`, `tipo_dia` (escolar | feriado |
fin_de_semana | vacaciones | especial), `generado_por` (plantilla | ia | manual),
`nota_ia` (*"hoy no hay clases: moví el estudio a la tarde y te dejé la mañana libre"*),
`estado`

**`tareas_dia`** ⭐ — lo que Leonora ve y va marcando. **Es la tabla que la app lee todo el día.**
`id`, `dia_id`, `actividad_id`, `evento_id`, `titulo`, `hora_inicio`, `hora_fin`,
`orden`, `es_fijo`, `origen` (plantilla | evento | ia | manual),
`estado` (pendiente | hecha | omitida | movida), `completado_en`, `notas`

### 3.7 Hábitos y motivación

*(Esto es lo que hace que una niña de 13 siga abriendo la app en marzo.)*

**`habitos`** — "Devocional diario", "Leer la Biblia", "Tender la cama".
`id`, `usuario_id`, `actividad_id`, `nombre`, `meta_frecuencia` (diaria | x_veces_semana),
`meta_valor`, `activo`

**`registros_habito`** — un check por día.
`id`, `habito_id`, `fecha`, `cumplido`, `nota`, `creado_en`

**`rachas`** — racha actual y récord (se calcula, pero se guarda para que la app vuele).
`usuario_id`, `habito_id`, `racha_actual`, `racha_mejor`, `ultima_fecha`

### 3.8 Contenido devocional

**`devocionales`** — la biblioteca de contenido.
`id`, `titulo`, `pasaje`, `texto`, `pregunta_reflexion`, `duracion_min`, `edad_min`, `edad_max`

**`plan_devocional`** — el devocional de cada día y lo que ella escribió.
`id`, `usuario_id`, `devocional_id`, `fecha_asignada`, `completado`, `reflexion`, `favorito`

> Sin estas dos tablas, "Devocional 6:30-7:30" es una casilla vacía. Con ellas
> es un pasaje, una pregunta y un espacio para escribir. Esa es la diferencia
> entre una agenda y un hábito de fe.

### 3.9 Recordatorios

**`recordatorios`** — `id`, `usuario_id`, `referencia_tipo` (tarea|evento|habito|cumpleaños),
`referencia_id`, `momento`, `canal` (push|email|in_app), `estado`, `mensaje`

**`dispositivos_push`** — `id`, `usuario_id`, `token`, `plataforma`, `activo`

### 3.10 Memoria de la IA

**`recomendaciones_ia`** — `id`, `usuario_id`, `tipo`, `contexto` (jsonb), `respuesta` (jsonb),
`aplicada`, `feedback` (útil | no útil), `creado_en`

> Guardar esto sirve para dos cosas: la IA aprende qué sugerencias acepta y
> cuáles rechaza, y **no se vuelve a pagar por la misma pregunta**.

---

## 4. Dónde entra la IA (y dónde no)

Cuatro flujos. Ni uno más.

### A. Recomendar la rutina (una vez, al empezar)
8 preguntas cortas: edad, a qué hora te levantas, horario de colegio, qué
quehaceres te tocan, qué te gusta hacer, cuándo prefieres tu devocional.
→ La IA devuelve una semana propuesta en JSON → **tú la editas en pantalla** →
se guarda como plantilla. La IA propone, la persona decide.

### B. Foto → fechas
Foto a Storage → modelo de visión con un formato JSON estricto → filas en
`importaciones_items` → pantalla de revisión (*"encontré 23 fechas, ¿las agrego?"*)
→ las aprobadas se vuelven `eventos`.

Dos detalles que evitan el 90% de los errores:
- Se le pasa **el año actual y la zona horaria** en el prompt, porque los
  calendarios escolares casi nunca escriben el año.
- Se le pide que devuelva **el texto que leyó** junto a la fecha interpretada,
  para poder auditar cualquier error.

### C. Generar el día
**Aquí está el ahorro.** El ~90% de los días **no necesitan IA**: plantilla +
reglas fijas resuelven todo. La IA solo se llama cuando hay un conflicto real
(un feriado, un examen mañana, un evento raro). Un día normal cuesta $0.

Las reglas de prioridad son deterministas, sin IA:
`eventos fijos > bloques anclados > comidas y sueño > estudio > quehaceres > ocio`

### D. Repaso semanal (domingo)
Mira los hábitos cumplidos y las tareas hechas → un resumen corto y alentador +
**un** ajuste sugerido. Uno, no diez.

---

## 5. Pantallas de la primera versión

1. **Hoy** — línea de tiempo vertical, casillas grandes, anillo de progreso.
2. **Semana** — la cuadrícula de lunes a domingo.
3. **Calendario** — eventos, feriados, cumpleaños.
4. **Importar foto** — cámara → revisar → aprobar.
5. **Mis hábitos** — rachas y récords.
6. **Ajustes** — hora del devocional, hora de fin de estudio, despertar/dormir.

---

## 6. Tecnología recomendada

| Pieza | Elección | Por qué |
|---|---|---|
| App | **Next.js + Tailwind**, instalable como PWA | Una sola base de código sirve en el teléfono de Leonora y en tu compu. Sin tiendas de apps. |
| Base de datos + login + archivos | **Supabase** (Postgres) | Da autenticación, almacenamiento de fotos y aislamiento por fila (RLS) sin montar servidores. |
| IA | **API de Claude** (texto + visión) | Un solo proveedor para leer las fotos y armar el horario. |
| Hosting | **Vercel** | Despliegue directo, gratis al principio. |
| Avisos | Web push + email | Sin costo de SMS. |

Costo estimado a escala pequeña: **prácticamente $0/mes** hasta las primeras
decenas de familias, y unos centavos por usuario/mes de IA, porque solo se llama
en importaciones y conflictos.

---

## 7. Privacidad (no es opcional: son datos de una menor)

- **RLS en todas las tablas desde el primer día.** Cada hogar solo ve lo suyo.
- Las fotos del calendario se procesan y se pueden borrar automáticamente.
- Nada es público por defecto. No hay compartir hacia afuera en la v1.
- El tutor tiene acceso; nadie más.

---

## 8. Plan por fases (para no gastar de más)

| Fase | Qué se construye | Tablas |
|---|---|---|
| **1. El esqueleto** | Rutina manual + pantalla "Hoy" + marcar tareas. **Sin IA.** | 8 ⭐ |
| **2. Fe y hábitos** | Devocionales, rachas, reflexiones | +5 |
| **3. Inteligencia** | Foto → fechas, y recomendar la rutina | +3 |
| **4. Avisos** | Recordatorios, cumpleaños, repaso semanal | +3 |
| **5. Vender** | Varios hogares, planes, cobro | +1 |

**La Fase 1 ya le resuelve el problema a Leonora.** Todo lo demás lo mejora.
Se puede parar en cualquier fase y tener algo útil.

---

## 9. Decisiones que faltan por confirmar

1. ¿La usa solo en el teléfono, o también en computadora?
2. ¿Papá/mamá quiere ver el avance, o es solo de ella?
3. ¿Los devocionales los pones tú, o la IA los propone?
4. ¿Empezamos por la Fase 1 completa, o quieres ver primero la pantalla "Hoy"?
