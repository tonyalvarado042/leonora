# El día de Leonora

App de horario, hábitos de fe y organización del tiempo, para una familia y sus grupos.

**Versión 6 del diseño.** Todavía no hay código.
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
| 11 | **El Muro**: oración pública para todo el mundo + web abierta | `oraciones.visibilidad = publica`, `es_anonima`, `estado_moderacion`, tabla `reportes` |
| 12 | Bienvenida con video antes de configurar | ninguno |
| 13 | **App nativa iOS + Android** (avisos de verdad) | cambia el stack completo |
| 14 | Invitados con funciones básicas; el resto se paga | `personas.tipo_cuenta`, `miembros_grupo.nivel_acceso`, tabla `suscripciones` |
| 15 | **Cuatro rachas separadas** con niveles desbloqueables | tablas `rachas`, `logros`, `logros_ganados` |
| 16 | Premios por terminar + celebración a pantalla completa | `tareas_dia.minutos_reales/termino_de_verdad/puntos`, `dias.porcentaje_cumplido` |
| 17 | **Ajustes**: ícono o foto, sonidos, tema, privacidad | solo columnas en `personas` y `ajustes` — **cero tablas nuevas** |

**`familias` desapareció:** una familia es un `grupo` de tipo familia. Todo lo que
sirve para la familia sirve igual para las amigas.

---

## 2. Las tres capas (no cambia)

1. **Rutina** — cómo es un lunes normal.
2. **Eventos** — feriados, exámenes, cumpleaños, planes de grupo.
3. **Día generado** — el plan del martes 3. Es lo que ella marca.

La capa 3 es una copia: mover algo hoy no daña la rutina.

---

## 3. Las 27 tablas

### El día — Fase 1
- **`personas`** — `id`, `nombre`, `fecha_nacimiento`, `email`, `rol` (tutor|hijo|adulto),
  `sexo`, `zona_horaria`, **`tipo_cuenta`** (invitada|completa), `tutor_email`,
  **`avatar_tipo`** (emoji|ilustracion|foto), **`avatar_valor`**, **`foto_url`**
- **`ajustes`** — `persona_id`, `hora_despertar`, `hora_dormir`,
  `ocupacion` (**colegio|trabajo|ambos|ninguno**), `hora_fin_ocupacion` (14:00),
  `avisar_antes_min` (**10**), `avisos_activos`, `silencio_desde/hasta`, `dias_ocupados`,
  **`sonido_aviso`**, **`sonido_devocional`**, **`vibrar`**,
  **`tema`** (claro|oscuro|auto), **`color_acento`**, **`tamano_letra`**,
  **`celebraciones`**, `idioma`
- **`actividades`** — `id`, `nombre`, `emoji`, `tipo` (**fe|estudio|casa|deporte|familia|descanso**), `duracion_min`, `es_habito`, `meta_semanal`, `es_fijo`, `avisar`, `avisar_antes_min`, `creada_por`
- **`rutina`** — `persona_id`, `modo` (escolar|vacaciones), `dia_semana`, `hora_inicio`, `hora_fin`, `actividad_id`, `es_fijo`
- **`dias`** — `persona_id`, `fecha`, `tipo_dia`, `modo_usado`, `nota_ia`, `estado`, **`porcentaje_cumplido`**
- **`tareas_dia`** — `dia_id`, `actividad_id`, `evento_id`, `encargo_id`, `devocional_id`, `titulo`, `hora_inicio`, `hora_fin`, `estado`, `completado_en`, `nota`, **`minutos_reales`**, **`termino_de_verdad`**, **`puntos`**
- **`avisos`** — `persona_id`, `tipo` (tarea|recado|invitacion|oracion|evento|ciclo), `referencia_id`, `momento`, `canal`, `titulo`, `cuerpo`, `estado`, `leido_en` — *alimenta la campanita*

### Rachas y premios — Fase 2
- **`rachas`** — `persona_id`, **`via`** (apertura|dia|devocional|oracion), `racha_actual`,
  `racha_mejor`, `total_dias`, `ultimo_dia`, `gracia_usada_mes`
- **`logros`** — `via`, `dias_requeridos`, `nombre`, `emoji`, `orden` — *el catálogo*
- **`logros_ganados`** — `persona_id`, `logro_id`, `ganado_en`, **`visto_en`**

> **Corrijo la v3:** ahí dije que las rachas eran una consulta y no una tabla.
> Con cuatro vías, niveles y día de gracia ya no aplica: se leen en *cada*
> apertura y hay que guardar cuándo se ganó cada insignia.

### Fe — Fase 4
- **`devocionales`** — `titulo`, `pasaje`, `texto`, `pregunta`, `minutos`, `edad_min/max`
- **`versiculos`** — `dia_del_año`, `referencia`, `tema`
- **`versiculos_versiones`** — `versiculo_id`, `version` (RVR|NVI|NTV…), `texto`
- **`versiculos_guardados`** — `persona_id`, `versiculo_id`

### La gente — Fase 5
- **`grupos`** — `nombre`, `tipo` (**familia|amigos|iglesia|otro**), `emoji`, `creado_por`, `plan`
- **`miembros_grupo`** — `grupo_id`, `persona_id`, `rol` (dueño|tutor|miembro), **`ve_mi_calendario`**, **`nivel_acceso`** (invitado|completo), `chat_leido_en`, `estado`
- **`encargos`** — `de_persona_id`, `para_persona_id`, `titulo`, `nota`, `fecha`, `tipo` (tarea|recordatorio|consejo), `estado`, **`respuesta`**, `respondido_en`
- **`eventos`** — `grupo_id`, `persona_id`, `tipo`, `titulo`, `fecha_inicio/fin`, `recurrencia`, `efecto`, `propuesto_por`, `requiere_respuesta`, `origen`, `confianza`, `confirmado`

### Oración — Fase 6
- **`oraciones`** — `persona_id`, `titulo`, `detalle`, **`visibilidad`** (solo_yo|familia|grupo|todas_mis_personas|**publica**), `grupo_id`, `estado` (activa|**contestada**|archivada), **`es_anonima`**, **`estado_moderacion`** (pendiente|aprobada|rechazada), `como_contesto`, `contestada_en`
- **`oraciones_apoyo`** — `oracion_id`, `persona_id`, `oro_en`

### El Muro — Fase 7
- **`reportes`** — `oracion_id`, `reportado_por`, `motivo`, `estado`, `resuelto_en`
  > La revisión con IA corre antes de publicar; esto es la segunda red.

### Lo privado — Fase 8
- **`ciclo`** — `persona_id`, `fecha_inicio`, `fecha_fin`, `duracion_estimada`, `nota`
  > **Única tabla sin excepción de tutor.** RLS estricta a `persona_id = auth.uid()`.

### Social — Fase 9
- **`invitaciones`** — `tipo` (grupo|actividad), `grupo_id`, `tarea_id`, `email`, `invitado_por`, `codigo`, `medio` (**app|whatsapp**), `estado`, `caduca_en`
- **`mensajes`** — `grupo_id`, `persona_id`, `texto`, `respuesta_a`, `creado_en`
- **`respuestas_evento`** — `evento_id`, `persona_id`, `respuesta` (**si|no|tal_vez**), `nota`

### Dinero — Fase 10
- **`suscripciones`** — **`grupo_id`** (paga la familia, no la persona), `plan`, `estado`, `vence_en`, `proveedor` (apple|google), `id_externo`, `renovacion_automatica`

### Fotos — Fase 11
- **`fotos`** — `grupo_id`, `subida_por`, `tipo`, `archivo_url`, `estado`, `resumen`

**No son tablas:** las oraciones contestadas (filtro por `estado`), el chat
leído (columna), el nivel de acceso del invitado (columna), la imagen del
versículo (se genera en el teléfono).

---

## 4. Privacidad — cuatro reglas duras

1. Un tutor ve a sus hijos **menos** `ciclo`.
2. Una oración se ve según su `visibilidad` y nada más.
3. Un calendario solo se ve si su dueño puso `ve_mi_calendario = true` para
   ese grupo. Es por persona y por grupo, y se puede revocar.
4. En el Muro solo salen filas con `visibilidad = publica`
   **y** `estado_moderacion = aprobada`. Nunca apellido, ciudad ni forma de
   contacto.

RLS en las 27 tablas.

### El Muro es público: tres protecciones de diseño
- **`es_anonima`** — se puede publicar sin nombre.
- **Revisión antes de salir** — la IA lee cada petición y detiene insultos,
  datos de contacto, direcciones. Cualquiera puede reportar (`reportes`).
- **Un menor necesita permiso de tutor para publicar.** Leer y decir amén,
  desde el primer día; publicar es un permiso aparte.
  Subir de «mi grupo» a «el Muro» pasa por una pantalla de confirmación:
  nunca por accidente.

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

## 6. Rachas, niveles y premios

### Cuatro vías, no una
Una racha única castiga demasiado: perder 40 días de devocional por no ordenar
el cuarto una vez desanima y la gente abandona. Cuatro vías separadas dan
cuatro razones distintas de volver mañana.

| Vía | Cuenta | Escalera (24 insignias en total) |
|---|---|---|
| 💜 Devocional | días con devocional hecho | 3 Semilla · 7 Raíz · 14 Brote · 30 Árbol · 100 Fruto · 365 Cosecha |
| ✅ Cumplir tu día | días con el día completo | 3 En marcha · 7 Constante · 14 Disciplinada · 30 Imparable · 100 De hierro · 365 Leyenda |
| 👋 Abrir la app | días con apertura | 3 Presente · 7 Fiel · 30 Siempre aquí · 100 Ancla |
| 🙏 Orar por otros | días con un amén dado | 3 Primer amén · 7 Intercesora · 30 Guerrera · 100 Centinela |

Los nombres viven en `logros`: cambiarlos es editar filas, no código.

### Dos reglas que evitan el abandono
- **Un día de gracia al mes** (`rachas.gracia_usada_mes`). Fallar una vez no
  rompe la racha. Sin esto, quien falla un día deja la app entera.
- **La racha usa el día real de la persona**, no la fecha del servidor: marcar
  el devocional a las 00:30 cuenta para el día que estaba viviendo.

### Los premios por terminar — con un matiz importante
El usuario pidió premiar terminar antes de tiempo. En quehaceres es correcto;
**en estudio y fe, premiar la velocidad enseña lo contrario de lo que se
busca** — pagar por estudiar menos, o por devocionales de dos minutos.

La regla, por tipo de actividad:

| Tipo | Qué se premia |
|---|---|
| `casa` | **La velocidad.** Más puntos mientras más tiempo ahorres. |
| `estudio` | **Terminar la tarea.** Al marcar antes, la app pregunta: *¿terminaste, o lo dejas para después?* Solo el primer caso paga. |
| `fe`, `deporte` | **El tiempo completo.** Aquí correr no tiene sentido. |
| — | **Día perfecto:** todo el día cumplido, premio aparte. |

### La celebración
Capa a pantalla completa (canvas), por encima de la app, ~2 segundos, y se va
sola. Tres formas distintas para que se sepa qué pasó sin leer:
**🔥 fuego** velocidad y rachas · **🎉 confeti** insignia nueva ·
**⭐ estrellas** día perfecto. Respeta `prefers-reduced-motion`.
`logros_ganados.visto_en` decide si toca lanzarla.

---

## 7. Ajustes

Cinco grupos, en el orden en que se usan:

| Grupo | Qué tiene |
|---|---|
| **Tú** | Ícono o foto, nombre, color, cumpleaños |
| **Avisos y sonidos** | Avisar sí/no, minutos antes, sonido normal, **sonido del devocional**, vibrar, no molestar |
| **Tu día** | Despertar, dormir, colegio o trabajo, hora de fin, cuántos devocionales |
| **Cómo se ve** | Tema claro/oscuro/auto, tamaño de letra, celebraciones sí/no |
| **Quién ve qué** | Mi calendario por grupo, publicar en el Muro, calendario personal |

### Decisiones
- **Diez íconos ilustrados o una foto.** El ícono viene por defecto; la foto es
  opcional.
- **La foto nunca sale en el Muro.** La ven la familia y los grupos — gente que
  ya la conoce. En la página pública va el ícono, o nada si publica sin nombre.
  Para una menor en una página abierta, esa es la posición por defecto.
- **El devocional tiene su propio sonido.** Separa el aviso que llama a orar
  del que recuerda sacar la basura, sin sacar el teléfono del bolsillo.
- **Cada sonido se oye antes de elegirlo** (play en la lista).
- **Ajustes es la regla general**; cada actividad puede llevarle la contraria
  con su `avisar_antes_min` propio.
- **Las celebraciones se apagan en un toque**, y se respeta
  `prefers-reduced-motion` del sistema sin que haya que configurarlo.

La lista de sonidos va dentro de la app, no en la base de datos.

---

## 8. El modelo de invitados

Cuando Leonora invita a Emma, Emma entra **a lo que la invitaron**, no a toda
la app. Su horario es asunto de su familia, y esa familia todavía no está aquí.

**Gratis (`tipo_cuenta = invitada`):** chatear en el grupo al que la
invitaron, entrar al devocional al que la llamaron, ver el Muro y decir amén,
ver el versículo del día, responder a los planes del grupo.

**De pago (`completa`):** su propio horario y rutina, sus hábitos y rachas,
sus oraciones, avisos en su celular, su familia y sus grupos, compartir su
calendario, subir fotos.

Dos notas:
- **Paga el `grupo` de tipo familia**, no la persona. Una suscripción cubre a
  todos los hijos.
- Emma es menor, así que su cuenta necesita el correo de un tutor para
  activarse — obligatorio en ambas tiendas. **La persona que la ley obliga a
  meter en el proceso es exactamente la que va a pagar:** el requisito legal y
  el momento de venta son el mismo paso.

---

## 9. Fases

| Fase | Qué se construye | Tablas |
|---|---|---|
| **1** | **El día con alarmas: pantalla de Hoy, rutina a mano, avisos nativos.** | **7** |
| **2** | **Rachas, niveles y celebración.** Barato, y es lo que hace volver. | **+3** |
| 3 | Bienvenida con video + arranque con IA | +0 |
| 4 | Fe: devocionales y versículo del día | +4 |
| 5 | La familia y la campanita: grupos, recados con respuesta | +4 |
| 6 | Oraciones: visibilidad, «amén», contestadas | +2 |
| 7 | El Muro: público, web abierta, anónimo, moderación | +1 |
| 8 | Lo privado: calendario de ciclo | +1 |
| 9 | Amigas: invitaciones, calendario de grupo, chat | +3 |
| 10 | Invitados y cobro por las tiendas | +1 |
| 11 | Fotos de horarios y calendarios | +1 |

Las rachas suben al segundo puesto: cuestan 3 tablas simples y son lo que
consigue que la app se abra mañana. Sin ellas, las fases siguientes le llegan
a nadie.

---

## 10. Guardado para fases posteriores

**No entra ahora.** Escrito aquí para no perderlo.

### 10.1 Entrenar el cuerpo y el espíritu
- La persona elige **cuántos minutos de deporte** al día (15, 30, los que sean)
  y si de día o de noche, en el arranque — igual que el devocional.
- Después puede **mover ese bloque** en su horario como cualquier otra cosa.
- **Al marcar el entrenamiento físico, la app recuerda el entrenamiento del
  espíritu** (el devocional). No solo el cuerpo se entrena.
- Es la idea que diferencia esta app: ninguna app de ejercicio lo hace, y
  ninguna app devocional tampoco.
- Datos: `ajustes.minutos_deporte`, `ajustes.momento_deporte`, y un enlace
  entre la actividad de tipo `deporte` y la de tipo `fe`.

### 10.2 El entrenamiento en sí
- Al tocar el bloque de deporte, sale la rutina del día.
- **Todo funcional**, con lo que hay en casa: un par de mancuernas y un banco o
  una mesa firme. Sin gimnasio ni máquinas.
- Tono: cuidar el cuerpo porque es prestado, no por vanidad.
- Datos: +2 tablas (`ejercicios`, `entrenamientos`).

### 10.3 Nutrición
- Después del entrenamiento, porque comparten la misma idea y sin la parte de
  deporte no tiene dónde apoyarse.

### 10.4 Widget de iOS
- En la pantalla de inicio: devocional del día, lo que toca hoy, y el versículo.
- Se hace cuando las fases 1 a 3 estén andando: el widget solo muestra datos
  que ya deben existir.

---

## 11. Tecnología — ahora nativa

Que sea app nativa cambia una cosa de raíz: **los avisos ahora sí sirven.**
Una web no despierta el teléfono con la pantalla apagada; una app nativa sí.
Como toda la app se apoya en avisar a tiempo, no era negociable.

| Pieza | Elección |
|---|---|
| App | **React Native + Expo** — un código, iOS y Android |
| El Muro | **Next.js en Vercel** — página web abierta, sin cuenta ni descarga |
| Datos, cuentas, fotos, chat en vivo | Supabase (compartido por app y web) |
| Avisos | APNs + FCM vía Expo, con un cron que despacha cada minuto |
| Cobro | Compras dentro de la app (App Store / Google Play) |
| IA | Claude — armar la semana, leer fotos, moderar el Muro |
| Widget iOS (después) | Nativo sobre la misma API |

**El peaje de ser nativa:** 99 USD/año la cuenta de Apple, 25 USD una vez la
de Google, y cada versión pasa por revisión (de horas a un par de días).
Por eso **el Muro va en web**: lo que tiene que llegar a todo el mundo no
debería depender de una descarga.

---

## 12. El nombre

Veinte candidatos en `docs/dia-de-leonora.html`. Mi recomendación:

| | Nombre | Por qué |
|---|---|---|
| 1 | **Maná** | Caía cada mañana y **no se podía guardar**: había que recogerlo de nuevo cada día. Es literalmente una app de hábitos diarios. Corto, conocido y registrable como marca. |
| 2 | **Amén** | Lo que dices cuando alguien más ora. En el Muro, el botón de apoyo **es** un amén: nombre y acción principal, la misma palabra. Difícil de registrar. |
| 3 | **Primera Hora** | Dice la promesa entera en dos palabras, y se entiende sin saber nada de la Biblia — que es lo que hace falta para vender fuera de la iglesia. |

**Cómo los combinaría:** la app se llama **Maná**, la sección pública es
**El Muro**, y el botón dice **Amén**.

---

## 13. Pendiente de decidir

1. **¿Cómo se llama?** Sin nombre no hay ícono, bienvenida ni video.
2. ¿Fases 1 a 3 juntas (la primera versión enseñable)?
3. El Muro se ve muerto si está vacío. ¿De dónde salen las primeras cien oraciones?
4. Devocionales y versículos: ¿fuente pública, escritos por ti, o propuestos por IA?
5. ¿Precio de la suscripción familiar? Decide si el plan gratis puede ser tan
   generoso como está diseñado.
