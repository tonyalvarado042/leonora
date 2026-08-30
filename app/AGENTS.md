# GraceDay

App nativa de iOS y Android con Expo SDK 57.

**Lee los docs versionados en https://docs.expo.dev/versions/v57.0.0/ antes de
escribir código.** Si están bloqueados por red, la fuente de verdad son los
`.d.ts` de `node_modules/` — no la memoria.

## Las reglas viven en `../REGLAS.md`

**Antes de escribir código, leer `../REGLAS.md`.** Ahí está el acuerdo
completo, con su porqué y su fecha. Es el cerebro maestro del proyecto: cada
regla nueva entra ahí, no aquí.

Resumen para tenerlo a mano:

| | Regla |
|---|---|
| **R1** | Documentar siempre, en el mismo commit: `DOCUMENTACION.md`, `CHANGELOG.md`, `README.md` |
| **R2** | Ningún campo se queda callado. Los botones no se apagan: se pulsan y avisan |
| **R3** | Lo puro va aparte de la plataforma |
| **R4** | El repositorio nunca entrega su estado interno |
| **R5** | Se verifica en el navegador, no solo compilando |
| **R6** | Detalles que ya costaron un rato (`role`/`aria-*`, `<Enlace>`, Modal y navegación, cabecera propia) |

## Antes de dar algo por hecho

```bash
npm test && npm run typecheck
npx expo export --platform web --output-dir dist
node servidor.mjs & node prueba-navegador.mjs
```
