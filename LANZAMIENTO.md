# Lanzar GraceDay a las tiendas

Lo que hace falta de verdad para que la app esté en el iPhone y en Android,
con números y tiempos. Nada de esto se puede saltar.

## La cuenta, y lo único que falta probar

GraceDay tiene **su propio proyecto de Supabase**
(`vnjiwlauuezhuoalacwu`), así que `auth.users` es solo suyo: quien se registra
en la app nace con su persona, sus ajustes, sus rachas y su familia.

La pantalla de entrar y crear cuenta ya está, y registra con
`options: { data: { app: 'graceday', nombre } }`.

**Lo único que falta probar, y hace falta tu máquina:** la llamada de red de
verdad. El entorno donde se desarrolla no deja salir a `supabase.co` —el proxy
contesta 403—, así que `signUp` y `signInWithPassword` no se han podido probar
contra el servidor. Todo lo demás sí:

- La subida entera **contra la base real**, con las mismas filas y en el mismo
  orden que hace el código: 2 actividades y 6 bloques de rutina, los 6 bien
  enganchados a su actividad nueva.
- La pantalla entera, y que **cuando la red falla lo dice bien**: «No se pudo
  conectar. Mira que tengas internet y vuelve a probar.» — se vio de verdad.

Para cerrarlo: `cd app && npm start`, crear una cuenta con un correo tuyo, y
mirar que llegue el correo de confirmación y que al entrar esté la rutina.
Si Supabase pide confirmar el correo y no quieres eso mientras pruebas, se
apaga en el panel: Authentication → Sign In / Providers → Confirm email.

## Antes de nada: probar sin publicar

**Expo Go** — se instala Expo Go (gratis) en el teléfono, se corre
`npm start` y se escanea el código. Funciona todo menos lo que necesita
compilación nativa propia. Es lo primero que hay que hacer, y no cuesta nada.

**Build de desarrollo** — `eas build --profile development`. Da un APK
(Android) o un archivo para TestFlight (iOS) con **los avisos funcionando de
verdad**, que es lo único que Expo Go no cubre bien.

## Las cuentas

| Qué | Cuánto | Cuándo se paga |
|---|---|---|
| **Apple Developer Program** | **99 USD al año** | Antes de subir nada a iOS |
| **Google Play Console** | **25 USD una vez** | Antes de subir nada a Android |
| Cuenta de Expo (EAS) | Gratis para empezar | Las builds gratis tienen cola |

**Recomendación: empezar por Android.** Son 25 dólares una vez en lugar de 99
al año, la revisión tarda horas en vez de días, y sirve para descubrir los
problemas de verdad antes de pagar lo de Apple.

## Los pasos

1. **`npx eas login`** y **`npx eas build:configure`** — crea `eas.json`.
2. **Iconos y pantalla de carga.** Ahora mismo son los del template de Expo.
   Hace falta un icono propio de 1024×1024 y una pantalla de carga.
   *Esto es lo único de la lista que todavía no está hecho en el repo.*
3. **`npx eas build --platform android --profile production`** → un `.aab`.
4. **`npx eas submit --platform android`** → lo sube a Play Console.
5. En Play Console: ficha de la tienda, capturas, **política de privacidad**
   (obligatoria) y el cuestionario de seguridad de datos.
6. Lo mismo para iOS con `--platform ios`, más App Store Connect.

## Lo que van a preguntar, y hay que tener listo

**Política de privacidad.** Obligatoria en las dos tiendas, y con más razón
aquí: la app guarda datos de menores. Tiene que decir qué se guarda, dónde
(Supabase), quién lo ve y cómo se borra.

**Apps para menores.** Google tiene el programa *Designed for Families* y
Apple una categoría *Kids*. Entrar ahí trae reglas más duras —sobre todo con
publicidad y con cualquier cosa social— pero también protege el producto.
Conviene decidirlo antes de la fase 7 (el Muro público), no después.

**Permisos.** Los avisos hay que justificarlos en la ficha. Es fácil: la app
es literalmente un recordatorio.

**Cuenta de prueba.** Apple pide una cuenta con la que probar la app. Cuando
llegue el registro (fase 4) hay que dejarles una.

## Antes de la primera build, en el repo

- [ ] Icono propio de 1024×1024 y pantalla de carga
- [ ] `version` y `versionCode` en `app.json`
- [ ] Política de privacidad publicada en una URL
- [ ] Probar los avisos en un build de desarrollo, en un teléfono real
- [ ] Decidir si se entra en el programa de apps para menores

Lo demás —el código, la base de datos, las migraciones— ya está listo.
