# GraceDay

**Tu día, tu fe y tu gente.** App nativa de iOS y Android para organizar el
día, los hábitos de fe y las fechas importantes. Pensada para una niña de 13
años y hecha para vendérsela a familias enteras.

> Probarla ahora mismo, sin instalar nada: `app/publicado/graceday.html` es la
> app compilada en un solo archivo. En el teléfono funciona todo menos los
> avisos, que necesitan la app nativa.

---

## Toda la documentación

| Documento | Qué hay dentro |
|---|---|
| **[DOCUMENTACION.md](DOCUMENTACION.md)** | **La referencia completa.** Las tablas campo por campo, cómo se relacionan, todas las funciones, las reglas de negocio, las once fases y las decisiones con su porqué |
| **[CHANGELOG.md](CHANGELOG.md)** | **Todo lo que se ha hecho**, en orden, con lo que se verificó en cada paso |
| **[REGLAS.md](REGLAS.md)** | **El cerebro maestro.** Cada regla acordada, con su fecha y su porqué |
| [DISENO.md](DISENO.md) | El diseño del producto: qué hace y por qué |
| [docs/dia-de-leonora.html](docs/dia-de-leonora.html) | El diseño visual, explicado para Leonora |
| [LANZAMIENTO.md](LANZAMIENTO.md) | Publicar en App Store y Google Play: cuentas, costos, pasos y lo que exigen |
| [app/README.md](app/README.md) | Cómo correr y probar el código |
| [app/AGENTS.md](app/AGENTS.md) | Resumen de las reglas, para tenerlo junto al código |

---

## Qué hay hecho

| Fase | Qué | Estado |
|---|---|---|
| 1 | El día con alarmas | ✅ |
| 2 | Rachas, niveles y celebración | ✅ |
| 3 | Bienvenida y arranque | ✅ |
| 4 | Fe: devocionales y versículo del día | ✅ |
| 5 | La familia, la campanita y las fechas importantes | ✅ |
| 6-11 | Oraciones, el Muro, ciclo, amigas, cobro, foto | pendientes |

Detalle de cada fase, y lo guardado para después (deporte + espíritu,
entrenamientos, nutrición, widget de iOS): [DOCUMENTACION.md §7](DOCUMENTACION.md).

---

## Cómo está montado

```
README.md                    ← estás aquí
DOCUMENTACION.md             ← la referencia completa
CHANGELOG.md                 ← el historial
REGLAS.md                    ← el cerebro maestro
DISENO.md · LANZAMIENTO.md
docs/dia-de-leonora.html     ← el diseño visual

supabase/migrations/         ← 0001 fase 1 · 0002 fase 2 · 0003 seguridad · 0004 fase 4
                               0005 método · 0006 repeticiones · 0007 fase 5 · 0008 esquema propio
app/
  app/                       ← las pantallas (expo-router)
  src/lib/                   ← la lógica; lo puro va aparte de la plataforma
  src/componentes/
  __tests__/                 ← 217 pruebas: la lógica pura y el repositorio entero
  arrancar.mjs               ← el recorrido de bienvenida, para las demás pruebas
  prueba-*.mjs               ← once pruebas de extremo a extremo sobre el bundle real
```

## Arrancar

```bash
cd app
npm install
npm start          # con Expo Go en el teléfono
npm run web        # o en el navegador
```

## Comprobar

```bash
cd app
npm test           # 217 pruebas: la lógica pura y el repositorio
npm run typecheck  # TypeScript estricto

npx expo export --platform web --output-dir dist
node servidor.mjs &
node prueba-navegador.mjs    # marcar, recargar, mover la rutina
node prueba-crear.mjs        # crear actividades y añadirlas
node prueba-arranque.mjs     # el recorrido de alguien recién llegado
node prueba-mejoras.mjs      # escaneo, preview editable, notas, calendario
node prueba-navegacion.mjs   # volver atrás y la vista previa del calendario
node prueba-avisos-campos.mjs # que ningún campo se quede callado (R2)
node prueba-escuela.mjs      # que el horario de clases se cargue de verdad
node prueba-fase4.mjs        # el versículo del día y el devocional
node prueba-metodo.mjs       # el devocional hecho a tu manera
node prueba-repeticion.mjs   # tareas que se repiten, como en un calendario
node prueba-fase5.mjs        # la familia, la campanita y las fechas importantes
```

O todas de una:

```bash
for f in prueba-*.mjs; do echo "--- $f"; node $f; done
```

## La base de datos

Proyecto propio de Supabase, aparte de cualquier otro. Ocho migraciones
aplicadas y verificadas contra la base real: los disparadores de alta, las
restricciones del esquema y que el aislamiento por fila **de verdad aísla** —
una persona no ve ni puede tocar nada de otra, y sin sesión no se ve nada.

Desde la Fase 5 un tutor **lee** lo de sus hijos, con políticas que se suman a
las de antes: mirar no es escribir. Las funciones que deciden quién ve qué
viven en el esquema `claude_graceday`, fuera de la API pública (regla **R7**).
**El asesor de seguridad da cero avisos.**
