# El día de Leonora

App de horario, hábitos de fe y organización del tiempo, para una familia y sus grupos.

**Versión 3 del diseño.** Todavía no hay código.
Página visual: `docs/dia-de-leonora.html`

---

## 1. Qué cambió en la v3

| # | Cambio | Impacto en datos |
|---|---|---|
| 1 | Alarmas que dicen qué hacer, por defecto 10 min antes | tabla `avisos` + `ajustes.avisar_antes_min` + `actividades.avisar_antes_min` |
| 2 | Varios devocionales al día | ninguno: son varias filas en `rutina` con `tipo = fe` |
| 3 | Colegio **o trabajo** | `ajustes.ocupacion`; el tipo `estudio` cambia de etiqueta |
| 4 | Campanita de avisos, con respuesta a los recados | `encargos.respuesta` + `respondido_en` |
| 5 | Grupos de amigas, con permiso de calendario por persona | `grupos`, `miembros_grupo.ve_mi_calendario` |
| 6 | Chat de familia y de grupo | `mensajes`; `miembros_grupo.chat_leido_en` |
| 7 | Invitar a alguien a tu devocional | `invitaciones` con `medio` (app \| whatsapp) |
| 8 | Oraciones con visibilidad, y oraciones contestadas | `oraciones`, `oraciones_apoyo` |
| 9 | Versículo del día en varias versiones, con imagen | `versiculos`, `versiculos_versiones`, `versiculos_guardados` |
| 10 | Calendario de periodo, privado | `personas.sexo`, tabla `ciclo` |

**`familias` desapareció:** una familia es un `grupo` de tipo familia. Todo lo que
sirve para la familia sirve igual para las amigas.

---

## 2. Las tres capas (no cambia)

1. **Rutina** — cómo es un lunes normal.
2. **Eventos** — feriados, exámenes, cumpleaños, planes de grupo.
3. **Día generado** — el plan del martes 3. Es lo que ella marca.

La capa 3 es una copia: mover algo hoy no daña la rutina.

---

## 3. Las 22 tablas

### El día — Fase 1
- **`personas`** — `id`, `nombre`, `avatar`, `fecha_nacimiento`, `email`, `rol` (tutor|hijo|adulto), `sexo`, `zona_horaria`
- **`ajustes`** — `persona_id`, `hora_despertar`, `hora_dormir`, `ocupacion` (**colegio|trabajo|ambos|ninguno**), `hora_fin_ocupacion` (14:00), `avisar_antes_min` (**10**), `avisos_activos`, `silencio_desde/hasta`, `dias_ocupados`, `idioma`
- **`actividades`** — `id`, `nombre`, `emoji`, `tipo` (**fe|estudio|casa|deporte|familia|descanso**), `duracion_min`, `es_habito`, `meta_semanal`, `es_fijo`, `avisar`, `avisar_antes_min`, `creada_por`
- **`rutina`** — `persona_id`, `modo` (escolar|vacaciones), `dia_semana`, `hora_inicio`, `hora_fin`, `actividad_id`, `es_fijo`
- **`dias`** — `persona_id`, `fecha`, `tipo_dia`, `modo_usado`, `nota_ia`, `estado`
- **`tareas_dia`** — `dia_id`, `actividad_id`, `evento_id`, `encargo_id`, `devocional_id`, `titulo`, `hora_inicio`, `hora_fin`, `estado`, `completado_en`, `nota`
- **`avisos`** — `persona_id`, `tipo` (tarea|recado|invitacion|oracion|evento|ciclo), `referencia_id`, `momento`, `canal`, `titulo`, `cuerpo`, `estado`, `leido_en` — *alimenta la campanita*

### Fe — Fase 3
- **`devocionales`** — `titulo`, `pasaje`, `texto`, `pregunta`, `minutos`, `edad_min/max`
- **`versiculos`** — `dia_del_año`, `referencia`, `tema`
- **`versiculos_versiones`** — `versiculo_id`, `version` (RVR|NVI|NTV…), `texto`
- **`versiculos_guardados`** — `persona_id`, `versiculo_id`

### La gente — Fase 4
- **`grupos`** — `nombre`, `tipo` (**familia|amigos|iglesia|otro**), `emoji`, `creado_por`, `plan`
- **`miembros_grupo`** — `grupo_id`, `persona_id`, `rol` (dueño|tutor|miembro), **`ve_mi_calendario`**, `chat_leido_en`, `estado`
- **`encargos`** — `de_persona_id`, `para_persona_id`, `titulo`, `nota`, `fecha`, `tipo` (tarea|recordatorio|consejo), `estado`, **`respuesta`**, `respondido_en`
- **`eventos`** — `grupo_id`, `persona_id`, `tipo`, `titulo`, `fecha_inicio/fin`, `recurrencia`, `efecto`, `propuesto_por`, `requiere_respuesta`, `origen`, `confianza`, `confirmado`

### Oración — Fase 5
- **`oraciones`** — `persona_id`, `titulo`, `detalle`, **`visibilidad`** (solo_yo|familia|grupo|todas_mis_personas), `grupo_id`, `estado` (activa|**contestada**|archivada), `como_contesto`, `contestada_en`
- **`oraciones_apoyo`** — `oracion_id`, `persona_id`, `oro_en`

### Lo privado — Fase 6
- **`ciclo`** — `persona_id`, `fecha_inicio`, `fecha_fin`, `duracion_estimada`, `nota`
  > **Única tabla sin excepción de tutor.** RLS estricta a `persona_id = auth.uid()`.

### Social — Fase 7
- **`invitaciones`** — `tipo` (grupo|actividad), `grupo_id`, `tarea_id`, `email`, `invitado_por`, `codigo`, `medio` (**app|whatsapp**), `estado`, `caduca_en`
- **`mensajes`** — `grupo_id`, `persona_id`, `texto`, `respuesta_a`, `creado_en`
- **`respuestas_evento`** — `evento_id`, `persona_id`, `respuesta` (**si|no|tal_vez**), `nota`

### Fotos — Fase 8
- **`fotos`** — `grupo_id`, `subida_por`, `tipo`, `archivo_url`, `estado`, `resumen`

**No son tablas:** las rachas (consulta sobre `tareas_dia`), las oraciones
contestadas (filtro por `estado`), la imagen del versículo (se genera en el
teléfono).

---

## 4. Privacidad — tres reglas duras

1. Un tutor ve a sus hijos **menos** `ciclo`.
2. Una oración se ve según su `visibilidad`, y «todas mis personas» significa
   familia y grupos — **nunca internet abierto**. Sin esta regla haría falta
   moderación para publicaciones de menores.
3. Un calendario solo se ve si su dueño puso `ve_mi_calendario = true` para
   ese grupo. Es por persona y por grupo, y se puede revocar.

RLS en las 22 tablas.

---

## 5. Dónde entra la IA

| Momento | ¿IA? |
|---|---|
| Arranque: armar la semana | Sí, una vez |
| Leer una foto de horario o calendario | Sí, al subirla |
| Generar un día normal | **No** — rutina + reglas fijas |
| Día con choque (feriado, examen) | Sí |
| Repaso del domingo | Sí, corto |

Versículos, devocionales y oraciones son **datos**, no llamadas al modelo.
Nueve de cada diez días cuestan $0.

---

## 6. Fases

| Fase | Qué se construye | Tablas |
|---|---|---|
| **1** | **El día con alarmas: pantalla de Hoy, rutina a mano, avisos. Sin IA.** | **7** |
| 2 | El arranque con IA (5 preguntas → semana propuesta) | +0 |
| 3 | Fe: devocionales, versículo del día, rachas | +4 |
| 4 | La familia y la campanita: grupos, recados con respuesta | +4 |
| 5 | Oraciones: visibilidad, «oré por esto», contestadas | +2 |
| 6 | Lo privado: calendario de ciclo | +1 |
| 7 | Amigas: invitaciones, calendario de grupo, chat | +3 |
| 8 | Fotos de horarios y calendarios | +1 |

---

## 7. Guardado para fases posteriores

**No entra ahora.** Escrito aquí para no perderlo.

### 7.1 Entrenar el cuerpo y el espíritu
- La persona elige **cuántos minutos de deporte** al día (15, 30, los que sean)
  y si de día o de noche, en el arranque — igual que el devocional.
- Después puede **mover ese bloque** en su horario como cualquier otra cosa.
- **Al marcar el entrenamiento físico, la app recuerda el entrenamiento del
  espíritu** (el devocional). No solo el cuerpo se entrena.
- Es la idea que diferencia esta app: ninguna app de ejercicio lo hace, y
  ninguna app devocional tampoco.
- Datos: `ajustes.minutos_deporte`, `ajustes.momento_deporte`, y un enlace
  entre la actividad de tipo `deporte` y la de tipo `fe`.

### 7.2 El entrenamiento en sí
- Al tocar el bloque de deporte, sale la rutina del día.
- **Todo funcional**, con lo que hay en casa: un par de mancuernas y un banco o
  una mesa firme. Sin gimnasio ni máquinas.
- Tono: cuidar el cuerpo porque es prestado, no por vanidad.
- Datos: +2 tablas (`ejercicios`, `entrenamientos`).

### 7.3 Nutrición
- Después del entrenamiento, porque comparten la misma idea y sin la parte de
  deporte no tiene dónde apoyarse.

### 7.4 Widget de iOS
- En la pantalla de inicio: devocional del día, lo que toca hoy, y el versículo.
- Se hace cuando las fases 1 a 3 estén andando: el widget solo muestra datos
  que ya deben existir.

---

## 8. Tecnología

| Pieza | Elección |
|---|---|
| App | Next.js + Tailwind, instalable como PWA |
| Datos, login, fotos, tiempo real (chat) | Supabase |
| IA | API de Claude (texto y visión) |
| Hosting | Vercel |
| Avisos | Web push + email |
| Widget iOS (después) | App nativa ligera sobre la misma API |

---

## 9. Pendiente de decidir

1. ¿Fase 1 sola, o fases 1 a 3 juntas (la primera versión enseñable)?
2. Devocionales y versículos: ¿fuente pública, escritos por papá, o propuestos por IA?
3. ¿Invitaciones por correo, o solo enlace de WhatsApp al principio?
4. ¿Cuántas personas desde el principio — solo Leonora, o toda la familia?
