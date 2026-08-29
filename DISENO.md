# El día de Leonora

App familiar de horarios, hábitos de fe y organización del tiempo.

**Versión 2 del diseño — simplificada.** Todavía no hay código.
Página visual del diseño: `docs/dia-de-leonora.html`

---

## 1. La simplificación

En la v1 había cuatro tablas para lo mismo: `actividades`, `habitos`,
`registros_habito` y `rachas`. Pero **un hábito no es otra cosa: es una
actividad que se repite.** El devocional es una actividad; lo que lo vuelve un
hábito es la frecuencia.

Resultado: **20 tablas → 11.**

| Antes | Ahora |
|---|---|
| `actividades` + `habitos` | `actividades` con `tipo` y `es_habito` |
| `registros_habito` | los checks de `tareas_dia` |
| `rachas` | una consulta, no una tabla |
| `plantillas_horario` + `bloques_plantilla` | `rutina` con columna `modo` |
| `importaciones` + `importaciones_items` | `fotos`; las fechas leídas van a `eventos` con `confirmado = false` |
| `plan_devocional` | `tareas_dia.devocional_id` + `tareas_dia.nota` |

---

## 2. Las tres capas (esto no cambia)

1. **Rutina** — cómo es un lunes normal. Casi nunca cambia.
2. **Eventos** — feriados, exámenes, cumpleaños. Cambian siempre.
3. **Día generado** — el plan del martes 3. Es lo que ella marca.

La capa 3 se **genera** combinando 1 y 2, y es una copia: mover algo hoy no
daña la rutina.

---

## 3. Las 11 tablas

### `familias`
`id`, `nombre`, `plan`, `creado_en`
La unidad que se vende. Una compra = una familia.

### `personas`
`id`, `familia_id`, `nombre`, `avatar`, `fecha_nacimiento`, `email`,
`rol` (**tutor** | **hijo**), `zona_horaria`

### `ajustes`
`persona_id`, `hora_despertar`, `hora_dormir`, `minutos_devocional` (60),
`momento_devocional` (mañana | tarde | noche), `hora_fin_estudio` (**14:00**),
`dias_escolares`, `idioma`

> Que "termina de estudiar a las 2:00" sea una fila y no una constante es lo
> que hace que la app sirva para otra familia.

### `actividades` — la tabla fusionada
`id`, `familia_id`, `persona_id`, `nombre`, `emoji`, `color`,
`tipo` (**fe | estudio | casa | deporte | familia | descanso**),
`duracion_min`, `es_habito`, `meta_semanal`, `es_fijo`, `creada_por`, `activa`

- `tipo` es la agrupación que pediste: hábitos de fe, deportivos, etc.
- `es_habito` sustituye toda la maquinaria de hábitos de la v1.
- `es_fijo` marca las anclas: la cena y el devocional no se mueven;
  "leer un capítulo" flota y la IA lo reubica.

### `rutina`
`id`, `persona_id`, `modo` (**escolar | vacaciones**), `dia_semana` (0-6),
`hora_inicio`, `hora_fin`, `actividad_id`, `es_fijo`, `orden`

### `dias`
`id`, `persona_id`, `fecha`, `tipo_dia`, `modo_usado`, `generado_por`,
`nota_ia`, `estado`

`nota_ia` explica el cambio: *"hoy no hay clases: moví el estudio a la tarde"*.

### `tareas_dia` — la tabla que la app lee todo el día
`id`, `dia_id`, `actividad_id`, `evento_id`, `encargo_id`, `devocional_id`,
`titulo`, `hora_inicio`, `hora_fin`, `orden`, `es_fijo`, `origen`,
`estado` (pendiente | hecha | omitida | movida), `completado_en`, `nota`

`nota` guarda la reflexión del devocional. Las rachas se calculan de aquí.

### `eventos`
`id`, `familia_id`, `persona_id` (null = toda la familia),
`tipo` (feriado | escolar | examen | entrega | cumpleaños | cita | viaje),
`titulo`, `fecha_inicio`, `fecha_fin`, `todo_el_dia`, `recurrencia` (RRULE),
`efecto` (**libra_el_dia | bloquea_horas | solo_avisa**),
`origen` (manual | foto), `foto_id`, `confianza`, `confirmado`

> `confirmado` es la regla dura: **nada que la IA lea de una foto entra al
> horario sin aprobación humana.**

### `encargos` — papá/mamá → hijo
`id`, `de_persona_id`, `para_persona_id`, `titulo`, `nota`, `fecha`,
`hora_sugerida`, `tipo` (**tarea | recordatorio | consejo**), `estado`,
`visto_en`, `completado_en`

Al generar el día, los encargos entran a `tareas_dia` marcados en naranja.

### `fotos`
`id`, `familia_id`, `subida_por`, `tipo` (horario_clases | calendario_escolar |
feriados), `archivo_url`, `estado`, `resumen`, `respuesta_cruda`, `creado_en`

### `devocionales`
`id`, `titulo`, `pasaje`, `texto`, `pregunta`, `minutos`, `edad_min`, `edad_max`

---

## 4. El arranque con IA (5 preguntas)

1. Nombre y edad
2. Hora de despertar y de dormir
3. **Devocional: cuántos minutos y en qué momento** — se coloca primero, antes que todo
4. **Colegio: 📷 foto del horario *o* escribirlo a mano** — los dos caminos valen igual
5. Quehaceres de casa y lo que le gusta hacer

→ La IA devuelve una semana en JSON → se muestra completa → ella aprueba o pide
cambios → se guarda en `rutina`. **Nada se guarda sin aprobación.**

La foto es un atajo, no un requisito.

---

## 5. Dónde entra la IA (y dónde no)

| Momento | ¿IA? |
|---|---|
| Arranque: armar la semana | Sí, una vez |
| Leer una foto de horario o calendario | Sí, al subirla |
| Generar un día normal | **No** — rutina + reglas fijas |
| Generar un día con choque (feriado, examen) | Sí |
| Repaso del domingo | Sí, corto |

Reglas de prioridad, sin IA:
`eventos fijos > actividades con es_fijo > comidas y sueño > estudio > casa > ocio`

Nueve de cada diez días cuestan $0.

---

## 6. Roles

- **Tutor** (papá/mamá): ve el día de todos los hijos, manda encargos, ajusta rutinas.
- **Hijo**: ve el suyo, marca sus cosas, ve sus recados y sus rachas.
- Pantalla de entrada: las caras de la familia, cada quien toca la suya.

---

## 7. Tecnología

| Pieza | Elección |
|---|---|
| App | Next.js + Tailwind, instalable como PWA |
| Datos, login, fotos | Supabase (Postgres + RLS + Storage) |
| IA | API de Claude (texto y visión) |
| Hosting | Vercel |
| Avisos | Web push + email |

**Privacidad:** son datos de una menor. RLS en las once tablas desde el primer
día, nada público, y las fotos se pueden borrar tras procesarlas.

---

## 8. Fases

| Fase | Qué se construye | Tablas |
|---|---|---|
| **1** | **Pantalla de Hoy: rutina a mano, lista del día, marcar. Sin IA.** | **7** |
| 2 | El arranque con IA (5 preguntas → semana propuesta) | +0 |
| 3 | Devocionales, rachas, reflexiones | +1 |
| 4 | Familia completa: varias personas, roles, encargos | +2 |
| 5 | Fotos de horario y calendario | +1 |
| 6 | Recordatorios, cumpleaños, repaso semanal, planes de pago | +1 |

La Fase 1 ya resuelve el día de Leonora. Se puede parar en cualquier fase.

---

## 9. Pendiente de decidir

1. ¿Solo teléfono, o también computadora?
2. ¿Los devocionales los escoge papá o los propone la IA?
3. ¿Cuántas personas en la familia desde el principio?
4. ¿Fase 1 completa, o primero la pantalla de Hoy funcionando?
