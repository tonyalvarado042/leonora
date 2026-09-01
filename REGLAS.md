# Reglas de GraceDay

**El cerebro maestro del proyecto.** Cada regla que se acuerda entra aquí, con
su fecha y su porqué. No se borran: si una cambia, se corrige y se dice.

`app/AGENTS.md` apunta a este archivo. Antes de escribir código, se lee esto.

---

## R1 · Documentar siempre, en el mismo commit
*Acordada el 2026-08-29*

Cada cambio actualiza **los tres documentos**, en el mismo commit. No al final,
no cuando haya tiempo.

| Documento | Qué se actualiza |
|---|---|
| `DOCUMENTACION.md` | Tablas campo por campo, relaciones, funciones, reglas de negocio, fases, y las decisiones **con su porqué** |
| `CHANGELOG.md` | Qué se hizo, qué se arregló y **qué se verificó**. Lo nuevo arriba |
| `README.md` | El índice y el estado de las fases, si cambió |

Si se añade una columna, una función o una pantalla y no aparece en los tres,
**el trabajo no está terminado**. Lo mismo vale para cada PR: la descripción
apunta a lo que cambió en la documentación.

Todo en Markdown y en el repositorio, para poder leerlo desde GitHub sin bajar
nada.

---

## R2 · Ningún campo se queda callado
*Acordada el 2026-08-29, después de que el botón «Siguiente» quedara muerto sin
decir que faltaba el nombre.*

**Un botón apagado sin decir por qué es un fallo, no un diseño.**

- Todo campo lleva su **etiqueta**, y los obligatorios lo dicen.
- Todo campo lleva **ayuda** de qué se espera, o un **aviso** de qué falta.
- **Los botones no se apagan: se pulsan y avisan.** Si falta algo, al tocar
  «Siguiente» o «Guardar» sale un aviso que dice qué falta y dónde.
- El aviso va **junto al botón y junto al campo**, nunca en un cartel que tapa
  la pantalla: hay que ver a la vez qué falta y dónde arreglarlo.
- **Nada se arregla en silencio.** Si un campo vacío va a tomar un valor por
  defecto, se dice antes.
- Lo opcional también se dice, para que nadie se quede parado creyendo que
  falta algo.

**La única excepción:** un botón puede apagarse *mientras trabaja*, y solo si
dice que está trabajando («⏳ Leyendo tu horario…»).

Para no tener que acordarse: **`<CampoTexto>`** ya trae etiqueta, ayuda, marca
de obligatorio y aviso; **`<Aviso>`** va junto al botón.

---

## R3 · Lo puro va aparte de la plataforma
*Acordada el 2026-08-29*

`src/lib/fechas.ts`, `dia.ts`, `avisos.ts`, `rachas.ts`, `arranque.ts` y
`horarioFoto.ts` **no importan nada de React Native ni de Expo**. Así se prueban
con `node --test`, sin bundler ni simulador — y ahí es donde están los errores
que duelen: zonas horarias, medianoche, el silencio nocturno.

Lo que toca la plataforma va en archivos aparte (`avisosTelefono.ts`).

---

## R4 · El repositorio nunca entrega su estado interno
*Acordada el 2026-08-29, después de dos bugs del mismo tipo.*

Todos los lectores devuelven **copias**. Si devuelven la referencia guardada,
React ve el mismo objeto, no vuelve a pintar, y la pantalla miente.

Pasó dos veces: marcar una tarea no se veía, y mover un bloque de la rutina
tampoco.

---

## R5 · Se verifica en el navegador, no solo compilando
*Acordada el 2026-08-29*

Que compile no es que funcione. Antes de dar algo por hecho:

```bash
npm test && npm run typecheck
npx expo export --platform web --output-dir dist
node servidor.mjs & node prueba-*.mjs
```

Los tres primeros bugs de la fase 1 —pantalla en blanco, marcar sin efecto,
mover sin efecto— **pasaban el typecheck**.

---

## R6 · Detalles que ya costaron un rato
*Acordadas sobre la marcha*

- **Accesibilidad con `role` y `aria-*`**, no con `accessibility*`:
  react-native-web no traduce `accessibilityState`.
- **Enlaces con `<Enlace>`**, no con `<Link asChild>` a pelo: en web el estilo
  acaba en un `<a>` del DOM y un array de estilos revienta ahí.
- **Navegar no cierra un `Modal`.** Hay que bajarlo antes de empujar una
  pantalla, o se queda flotando encima de la nueva.
- **Cabecera propia, no la del navegador**: react-navigation no pinta el botón
  de volver en web, y la app se queda sin salida.
- **`app/+not-found.tsx` enseña Hoy a propósito**, para que arranque aunque se
  sirva en una ruta que no sea la raíz.
- **Los nombres van en español**, igual que las tablas, porque el dominio se
  piensa en español.
- **Un componente no se define dentro de otro.** React lo da por nuevo en cada
  render, lo desmonta y lo vuelve a montar, y el teclado pierde el foco a media
  palabra. Pasó en `SelectorHora`.
- **Un campo controlado no se sincroniza mientras se escribe.** Si el valor de
  fuera vuelve en cada tecla, pisa lo tecleado: escribir «07» acababa en «00».
- **`selectTextOnFocus` no funciona en el navegador.** Hay que llamar a
  `select()` en el `onFocus`, o se escribe encima de un campo lleno y no pasa
  nada — que desconcierta más que un error.
- **Un `export const` no se actualiza para quien ya lo importó.** `import` se
  queda con el valor que había al cargar el módulo, así que reasignarlo deja a
  las pantallas hablando con el objeto viejo **sin dar ningún error**. Para algo
  que cambia en caliente —el repositorio al entrar en la cuenta— hace falta un
  envoltorio.
- **Expo cachea las variables `EXPO_PUBLIC_*` del build.** Cambiar `.env` y
  volver a exportar deja el valor viejo dentro del bundle: compila, arranca, y
  habla con la base de datos equivocada. Hay que exportar con `--clear`. Se
  comprueba mirando el bundle:
  `grep -o "https://[a-z0-9]*\.supabase\.co" dist/_expo/static/js/web/*.js`.

---

## R7 · Lo que se crea en una base de datos se llama `claude_<proyecto>`
*Acordada el 2026-08-30*

Todo lo que yo cree dentro de una base de datos —el proyecto, un esquema, un
rol, un bucket— lleva el nombre del proyecto por delante:

```
claude_graceday
```

**Nada de nombres genéricos.** Un esquema llamado `interno`, `utils` o `temp`
no dice de quién es ni de qué proyecto, y en una cuenta con varios proyectos
—aquí conviven GraceDay y el CRM— eso se convierte en un montón de cosas
sueltas que nadie sabe si se pueden borrar.

Pasó el 2026-08-30: creé un esquema `interno` para sacar de la API las
funciones que deciden quién ve el calendario de quién. La idea estaba bien, el
nombre no. Se renombró a `claude_graceday` en la migración 0008.

Las tablas de dentro **no** llevan prefijo: ya están dentro del esquema del
proyecto, y `claude_graceday.claude_graceday_grupos` no ayuda a nadie.

---

## R8 · Enseñar dónde está la base de datos antes de decidir sobre ella
*Acordada el 2026-09-01*

**Antes de mover, unir, separar o borrar una base de datos, se enseña primero
cómo está todo.** No un resumen: el estado de verdad —qué proyectos hay, qué
tablas tiene cada uno, cuántas filas, cuántas cuentas— y el enlace para verlo.
La decisión la toma quien manda, y no puede tomarla a ciegas.

También, en cada respuesta que toque datos: **decir dónde vive lo que se está
tocando**. «La tabla X» no dice nada si hay dos proyectos.

Y `DOCUMENTACION.md` lleva siempre al día la sección de arquitectura y de dónde
vive cada cosa, en el mismo commit (R1). Un documento que va por detrás de la
base de datos es peor que no tenerlo: se decide sobre algo que ya no es así.

**Pasó el 2026-09-01, y costó una mudanza entera.** Se pidió meter GraceDay en
el proyecto del CRM «porque GraceDay no tenía proyecto propio». Sí lo tenía
—`vnjiwlauuezhuoalacwu`, creado dos días antes, con sus veinte tablas— y yo lo
sabía. No lo enseñé antes de mover: apliqué quince migraciones, toqué dos
disparadores del CRM, y solo al final salió que la premisa era falsa. Con una
tabla de dos líneas enseñada al principio, la decisión habría sido otra desde
el minuto uno.

**Lo que hay que enseñar, siempre, antes de decidir:**

| | |
|---|---|
| Qué proyectos hay | nombre, id, para qué es cada uno |
| Qué tiene cada uno | tablas, filas, cuentas |
| Qué se va a tocar | y qué **no** se toca |
| Qué no tiene vuelta atrás | borrar, y cualquier cambio de permisos |
| El enlace | `https://supabase.com/dashboard/project/<id>` |
