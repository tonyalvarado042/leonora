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
| [DISENO.md](DISENO.md) | El diseño del producto: qué hace y por qué |
| [docs/dia-de-leonora.html](docs/dia-de-leonora.html) | El diseño visual, explicado para Leonora |
| [LANZAMIENTO.md](LANZAMIENTO.md) | Publicar en App Store y Google Play: cuentas, costos, pasos y lo que exigen |
| [app/README.md](app/README.md) | Cómo correr y probar el código |
| [app/AGENTS.md](app/AGENTS.md) | Las reglas de la casa al escribir código |

---

## Qué hay hecho

| Fase | Qué | Estado |
|---|---|---|
| 1 | El día con alarmas | ✅ |
| 2 | Rachas, niveles y celebración | ✅ |
| 3 | Bienvenida y arranque | ✅ |
| 4-11 | Fe, familia, oraciones, el Muro, ciclo, amigas, cobro, foto | pendientes |

Detalle de cada fase, y lo guardado para después (deporte + espíritu,
entrenamientos, nutrición, widget de iOS): [DOCUMENTACION.md §7](DOCUMENTACION.md).

---

## Cómo está montado

```
README.md                    ← estás aquí
DOCUMENTACION.md             ← la referencia completa
CHANGELOG.md                 ← el historial
DISENO.md · LANZAMIENTO.md
docs/dia-de-leonora.html     ← el diseño visual

supabase/migrations/         ← 0001 fase 1 · 0002 fase 2 · 0003 seguridad
app/
  app/                       ← las pantallas (expo-router)
  src/lib/                   ← la lógica; lo puro va aparte de la plataforma
  src/componentes/
  __tests__/                 ← 83 pruebas de la lógica pura
  prueba-*.mjs               ← pruebas de extremo a extremo sobre el bundle real
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
npm test           # 83 pruebas de la lógica pura
npm run typecheck  # TypeScript estricto

npx expo export --platform web --output-dir dist
node servidor.mjs &
node prueba-navegador.mjs    # marcar, recargar, mover la rutina
node prueba-crear.mjs        # crear actividades y añadirlas
node prueba-arranque.mjs     # el recorrido de alguien recién llegado
node prueba-mejoras.mjs      # escaneo, preview editable, notas, calendario
node prueba-navegacion.mjs   # volver atrás y la vista previa del calendario
```

## La base de datos

Proyecto propio de Supabase, aparte de cualquier otro. Tres migraciones
aplicadas y verificadas contra la base real: los disparadores de alta, las
restricciones del esquema y que el aislamiento por fila **de verdad aísla** —
una persona no ve ni puede tocar nada de otra, y sin sesión no se ve nada.
