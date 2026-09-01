# Lanzar GraceDay a las tiendas

Lo que hace falta de verdad para que la app esté en el iPhone y en Android,
con números y tiempos. Nada de esto se puede saltar.

## El alta, en un proyecto compartido

GraceDay comparte proyecto de Supabase con el CRM de Tony, y `auth.users` es de
los dos. Eso se arregló en dos pasos, **y el orden era lo importante**:

1. **`cta_alta_usuario` (migración 0013).** A quien pasara el filtro sin
   invitación le creaba igual una fila en `cta_usuarios` con rol `lectura`, y
   ese rol **lee todo el CRM**. Ahora sin invitación no crea fila.
2. **`cta_validar_alta` (migración 0014).** Rechazaba **cada** alta del
   proyecto cuyo correo no estuviera en su lista —vacía—, así que solo el dueño
   podía registrarse. Ahora solo valida las altas del CRM.

Haciéndolo al revés cualquiera podría registrarse diciendo que viene de
GraceDay y salir leyendo los 872 contactos. En este orden, el CRM queda **más
cerrado que antes**: su control de acceso ya no depende de que nadie pueda
registrarse, sino de tener fila y rol en `cta_usuarios`, que es lo que mira
`cta_es`.

**Comprobado contra la base real:** un alta de GraceDay entra y sale con su
persona, sus ajustes, sus cuatro rachas y su familia, y con **cero** filas en el
CRM; un alta sin marca y sin invitación **sigue rechazada**. Las cuentas de
prueba se borraron.

**Lo que falta para tener cuenta en la nube:** la pantalla de entrar y crear
cuenta, que debe registrar con `options: { data: { app: 'graceday', nombre } }`.
Al no pasar ya por la puerta del CRM, el correo **no se confirma solo**:
Supabase manda su correo de confirmación, así que la pantalla tiene que decir
«te mandamos un correo» en vez de quedarse callada.

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
