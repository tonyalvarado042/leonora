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
