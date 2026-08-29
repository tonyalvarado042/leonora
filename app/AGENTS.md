# GraceDay

App nativa de iOS y Android con Expo SDK 57.

**Lee los docs versionados en https://docs.expo.dev/versions/v57.0.0/ antes de
escribir código.** Si están bloqueados por red, la fuente de verdad son los
`.d.ts` de `node_modules/` — no la memoria.

## Reglas de la casa

- **Lo puro va aparte.** `src/lib/fechas.ts`, `dia.ts` y `avisos.ts` no importan
  nada de React Native ni de Expo, y así se prueban con `node --test` sin
  bundler. Lo que toca la plataforma va en archivos aparte
  (`avisosTelefono.ts`). No mezclarlos.
- **El repositorio nunca entrega su estado interno.** Todos los lectores
  devuelven copias; si no, React ve la misma referencia y no vuelve a pintar.
- **Los nombres van en español**, igual que las tablas, porque el dominio se
  piensa en español.
- **Accesibilidad con `role` y `aria-*`**, no con `accessibility*`:
  react-native-web no traduce `accessibilityState`.
- **Enlaces con `<Enlace>`**, no con `<Link asChild>` a pelo: en web el estilo
  acaba en un `<a>` del DOM y un array de estilos revienta ahí.
- **Navegar no cierra un `Modal`.** Hay que bajarlo antes de empujar una
  pantalla, o se queda flotando encima de la nueva.
- **`app/+not-found.tsx` enseña Hoy a propósito**, para que la app arranque
  aunque se sirva en una ruta que no sea la raíz (vista previa, artefacto,
  subcarpeta).

## Antes de dar algo por hecho

```bash
npm test && npm run typecheck
npx expo export --platform web --output-dir dist
node servidor.mjs & node prueba-navegador.mjs
```
