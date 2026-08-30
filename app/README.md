# GraceDay · Fase 1 — El día, con alarmas

App nativa de iOS y Android (Expo). Esta fase hace una cosa y la hace entera:
**tu día en una pantalla, con avisos que suenan a tiempo.**

Sin IA, sin cuentas, sin nube: se abre y funciona.

## Arrancar

```bash
cd app
npm install
npm start          # y se abre con Expo Go en el teléfono
npm run web        # o en el navegador
```

## Comprobar que está bien

```bash
npm test           # 35 pruebas de la lógica pura (generar el día, avisos, horas)
npm run typecheck  # TypeScript en modo estricto
```

Y la prueba de extremo a extremo sobre el bundle web real:

```bash
npx expo export --platform web --output-dir dist
node servidor.mjs &          # sirve dist/ con vuelta a index.html
node prueba-navegador.mjs    # marca tareas, recarga, mueve la rutina
node capturas.mjs            # deja capturas en capturas/
```

## Cómo está montado

El diseño de las tres capas, en código:

| Capa | Dónde vive |
|---|---|
| **1. Rutina** — cómo es un lunes normal | `rutina`, se edita en `app/rutina.tsx` |
| **2. Eventos** — feriados, exámenes | llega en la fase 5 |
| **3. El día** — el plan del martes 3 | `dias` + `tareas_dia`, generados por `src/lib/dia.ts` |

La capa 3 es una **copia**: mover algo hoy no toca la rutina, y regenerar el
día con los mismos datos da siempre el mismo resultado.

```
src/lib/
  tipos.ts        los tipos, con el mismo vocabulario que la base de datos
  fechas.ts       horas y fechas — puro, sin dependencias
  dia.ts          generar el día, saber qué toca ahora, el avance — puro
  avisos.ts       qué avisar y cuándo — puro, sin Expo ni React Native
  avisosTelefono.ts   ponerlo en la agenda del sistema — solo en el teléfono
  repositorio.ts  guardar y leer, contra AsyncStorage
  supabase.ts     lo mismo contra la base de datos real
  tema.ts         los colores, en claro y en oscuro
app/
  index.tsx       Hoy
  rutina.tsx      editar la semana
  ajustes.tsx     ícono, avisos y sonidos
```

**Lo puro está separado a propósito.** `dia.ts`, `fechas.ts` y `avisos.ts` no
importan nada de React Native, así que se prueban con `node --test` sin
simulador ni bundler. Ahí es donde están los errores que de verdad duelen
—zonas horarias, medianoche, el silencio nocturno— y ahí es donde hay pruebas.

## Los avisos

- Por defecto **10 minutos antes**, y el aviso dice qué toca.
- Cada actividad puede llevarle la contraria (`actividades.avisar_antes_min`).
- **El devocional suena distinto** del resto, para reconocerlo sin mirar.
- El silencio nocturno se mide **en la hora del aviso**, no en la de la tarea:
  no sirve callar una alarma de las 5:50 por una tarea de las 6:00.
- Al marcar una tarea se reprograma todo, así su alarma deja de sonar.

En el navegador no suenan: los avisos de verdad necesitan la app nativa. Es
justo la razón por la que el diseño dejó de ser una web.

## La base de datos

`../supabase/migrations/0001_fase1_el_dia.sql` — las siete tablas de la fase,
con seguridad por fila desde el primer día (cada quien ve lo suyo y nada más)
y un disparador que crea la persona y sus ajustes al registrarse.

Para pasar de guardar en el teléfono a guardar en la nube: aplicar la
migración, copiar `.env.example` a `.env` con los datos del proyecto, y cambiar
la última línea de `repositorio.ts` por `new RepositorioSupabase()`. Las
pantallas no se tocan.

> `supabase.ts` está escrito contra este esquema y compila, pero todavía no se
> ha ejecutado contra una base de datos real.

## Fase 2 — Rachas, niveles y celebración

Cuatro rachas separadas (`src/lib/rachas.ts`), no una: perder cuarenta días de
devocional por no ordenar el cuarto una vez desanima tanto que la gente deja la
app. Cada vía tiene su escalera de seis insignias, 24 en total, con nombres
neutros — la app se vende a familias enteras y a un papá no le puede salir
«Disciplinada».

- **Un día de gracia al mes**: fallar un día no rompe la racha.
- **Un día contado no se descuenta**: si lo hiciste, lo hiciste.
- **Los premios cambian según el tipo.** En quehaceres se premia la rapidez.
  En estudio, *haber terminado* — premiar la velocidad ahí sería pagar por
  estudiar menos, así que al marcar antes de tiempo la app pregunta
  «¿terminaste, o lo dejas para después?». En fe y deporte, el tiempo completo.
- **La celebración cae por encima de toda la app** (`Celebracion.tsx`), vive en
  la raíz del enrutador y respeta «menos movimiento» del sistema.

## Fase 3 — Bienvenida y arranque

`app/bienvenida.tsx` es lo primero que ve alguien recién instalada la app: qué
es y por qué le sirve, no un formulario.

`app/arranque.tsx` son cinco preguntas —nombre y edad, a qué hora vives, tu
devocional, colegio o trabajo, quehaceres y gustos— y al final la semana
propuesta con su resumen antes de guardar nada.

`src/lib/arranque.ts` la arma. **Con reglas, no con IA todavía**: es puro y
determinista, así que se prueba sin bundler y funciona sin red ni clave de API.
Cuando entre la IA sustituye a `armarSemana` y devuelve la misma forma; el
resto de la app no se entera.

Reglas que sigue: el devocional primero, antes que nada; el estudio justo al
salir del colegio; los quehaceres después, y **solo si caben antes de la cena**
—apilarlos haría un día que no se puede cumplir—; un gusto al día, rotando; y
el fin de semana se empieza una hora más tarde, porque nadie madruga el sábado
igual que el martes.

`ajustes.arranque_hecho` decide si se abre la bienvenida o el día. Se puede
volver a empezar desde Ajustes.

## Crear y modificar

- `app/actividad.tsx` — crear o cambiar una cosa del catálogo.
- En **Tu rutina**, «+ Añadir algo a este día» elige qué y a qué hora.
- En **Hoy**, «+ Añadir algo solo para hoy» para lo que no es rutina.

## La base de datos

`../supabase/migrations/` — 0001 (fase 1), 0002 (fase 2) y 0003 (cerrar las
funciones de trigger). **Aplicadas y verificadas** en un proyecto de Supabase
propio de GraceDay, aparte de los demás proyectos.

Comprobado contra la base real: los disparadores de alta crean persona, ajustes
y las cuatro rachas; las restricciones rechazan una duración de cero, un bloque
que acaba antes de empezar, un día de la semana fuera de 0-6, una tarea «hecha»
sin fecha y una racha por encima de su récord; borrar la cuenta se lleva todo
en cascada; y el aislamiento por fila aísla de verdad — una persona no ve ni
puede tocar nada de otra, y sin sesión no se ve nada.

## Lo que no está todavía

**Leer el horario de una foto** (fase 11) — es lo que más se nota que falta,
pero necesita la cámara y el modelo de visión.

Y: arranque con IA (3), devocionales y versículo del día (4), familia y
campanita (5), oraciones (6), el Muro (7), ciclo (8), amigas (9), cobro (10).

El diseño completo: `../docs/dia-de-leonora.html`
