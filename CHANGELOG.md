# Historial de GraceDay

Todo lo que se ha hecho, en orden, con lo que se verificó en cada paso.
Lo más nuevo arriba.

> **Regla:** cada cambio entra aquí y en `DOCUMENTACION.md` en el mismo commit.

---

## Fase 4 — Fe: devocionales y versículo del día · 2026-08-29

**El versículo del día** sale arriba en Hoy y se abre en una lámina que **es**
la imagen para compartir. **El devocional** vive dentro de la tarea de fe: al
abrirla salen el pasaje, el texto y la pregunta, y la nota pasa a llamarse «Tu
respuesta».

Ambos se eligen **por la fecha**, no por el reloj ni por sorteo: no cambian a
media mañana ni al volver a abrir la app.

**Sobre los derechos de autor.** El texto bíblico que trae la app es de la
**Reina-Valera 1909, de dominio público**. NVI, NTV, RVR1960 y DHH tienen
derechos y necesitan licencia del editor para venderse dentro de una app. Por
eso `versiculos_versiones` es una tabla aparte y no una columna: añadir una
versión licenciada será **meter filas**, no tocar la app. La pantalla del
versículo lo explica, en vez de dejarlo como un hueco raro.

Contenido de arranque: **30 versículos y 7 devocionales**, escritos para esta
app. Antes de publicar hay que ampliar los versículos a 366 y **revisar cada
texto**.

Migración `0004_fase4_fe.sql`: `devocionales`, `versiculos`,
`versiculos_versiones`, `versiculos_guardados`, y `tareas_dia.devocional_id`.

*Verificado:* el versículo en Hoy y en su pantalla, la nota de derechos, el
devocional dentro de la tarea de fe con su pregunta, que la respuesta se
guarda, y que una tarea que no es de fe no trae devocional.

---

## Ningún campo se queda callado · 2026-08-29

**Arreglado — el botón «Siguiente» se quedaba muerto sin decir nada.** Al no
escribir el nombre en el arranque, el botón se apagaba y no había ninguna
explicación: la persona se quedaba mirando la pantalla sin saber qué hacer.

Ahora **los botones no se apagan: se pulsan y avisan.** Cinco sitios revisados
—el nombre, los días de colegio, añadir algo a hoy, crear una actividad y el
nombre en Ajustes— cada uno con su mensaje de qué falta, junto al campo y junto
al botón. El aviso se quita en cuanto se escribe. Lo opcional también se dice.

Dos componentes nuevos para que sea difícil volver a hacerlo mal:
`<CampoTexto>` (etiqueta, ayuda, marca de obligatorio y aviso en el mismo
sitio) y `<Aviso>` (el mensaje junto al botón).

**Nace `REGLAS.md`, el cerebro maestro del proyecto:** cada regla acordada, con
su fecha y su porqué. `AGENTS.md` pasa a ser un resumen que apunta ahí.
Recoge R1 (documentar siempre), R2 (ningún campo callado), R3 (lo puro aparte),
R4 (el repositorio devuelve copias), R5 (verificar en el navegador) y R6
(detalles que ya costaron un rato).

*Verificado:* los cinco avisos, que el aviso se quita al escribir, y que **no
queda ni un botón apagado en las seis pantallas**.

---

## Navegación y vista previa del calendario · 2026-08-29

**Arreglado — no había forma de volver atrás.** La cabecera de react-navigation
**no pinta el botón de volver en web**, así que desde el calendario, la rutina,
los ajustes, las rachas o el editor de actividades la app se quedaba sin
salida. Ahora hay una `Cabecera` propia con flecha de volver, igual en iPhone,
Android y navegador.

**El calendario ahora previsualiza.**
- **Mes:** hasta cuatro barritas de color por celda, una por tipo de cosa. Llena
  = terminada, a media tinta = pendiente. Fondo verde el día cumplido del todo,
  gris el fin de semana, rojizo el feriado.
- **Semana:** deja de ser una rejilla y pasa a ser una **agenda**: los siete
  días en vertical con sus tareas, hora, color y tic. Siete columnas no se leen
  en un teléfono; siete filas sí.

`ResumenDia` gana `tipo_dia` y una lista ligera de tareas.

*Verificado:* volver atrás desde las cinco pantallas, incluido el editor de
actividades que está dos niveles adentro; barras en el mes; agenda con horas y
nombres en la semana.

---

## Siete mejoras del recorrido · 2026-08-29

1. **Edad escrita a mano**, no solo elegida de una lista.
2. **Seis ocupaciones** —colegio, escuela, universidad, trabajo, otra, ninguno—
   y cada quien le pone el nombre que quiera. Solo quien estudia recibe el
   bloque de terminar la tarea.
3. **Cambiar el nombre** desde Ajustes.
4. **Escanear el horario de clases**: el flujo entero —leer, revisar, corregir,
   quitar, aceptar— con nueve materias de ejemplo, dos marcadas como borrosas y
   mostrando lo que literalmente se leyó. *Todavía no lee de verdad.*
5. **Preview editable** en el arranque: deja de ser un resumen y pasa a ser la
   semana día por día, con mover y quitar antes de aceptar.
6. **Arreglado el bug del toque largo.** Saltarse una tarea tachaba el texto
   igual que hacerla pero dejaba la casilla vacía, y parecía roto. Ahora son
   tres gestos separados —el círculo marca, el cuerpo abre el detalle, dejar
   apretado la salta— y saltada se ve distinta: fondo gris, etiqueta SALTADA y
   un guion en vez del tic.
7. **Detalle de tarea** con cuánto duró, cuántas chispas dio y una nota que se
   guarda. En la fila queda un 📝.
8. **Calendario** con vista de semana y mes, navegación e historial.

También: `DOCUMENTACION.md` completa, y la regla de mantenerla al día.

*Verificado:* las siete, una por una, en el navegador.

---

## Fase 3 — Bienvenida y arranque · 2026-08-29

Lo primero al instalar deja de ser un día vacío. Bienvenida con video y un
asistente de cinco preguntas —nombre y edad, a qué hora vives, tu devocional,
colegio o trabajo, quehaceres y gustos— que termina enseñando la semana armada
antes de guardar nada.

**La semana se arma con reglas, no llamando a la IA**: es pura y determinista,
se prueba sin bundler y funciona sin red ni clave de API. Cuando entre la IA
sustituye a `armarSemana` y devuelve la misma forma.

Reglas: el devocional primero antes que nada, el estudio justo al salir, los
quehaceres **solo si caben antes de la cena**, un gusto al día rotando, y el
fin de semana empieza una hora más tarde.

Añade «empezar de nuevo» en Ajustes, y `LANZAMIENTO.md`.

*Verificado:* el recorrido completo de alguien recién llegado, y que al volver
a abrir va directo a su día.

---

## Fase 2 — Rachas, niveles y celebración · 2026-08-29

**Cuatro rachas separadas**, no una: abrir la app, cumplir el día, el
devocional y orar por otros. Una racha única castiga demasiado — perder 40 días
de devocional por no ordenar el cuarto una vez hace que la gente abandone.

24 insignias en cuatro escaleras iguales, de 3 días a un año, **con nombres
neutros**: la app se vende a familias y a un papá no le puede salir
«Disciplinada».

**Un día de gracia al mes.** **Un día contado no se descuenta.**

**Los premios cambian según el tipo:** rapidez en los quehaceres, *haber
terminado* en el estudio, tiempo completo en fe y deporte. Premiar la velocidad
en el estudio sería pagar por estudiar menos.

Celebración a pantalla completa —fuego, confeti, estrellas— que respeta «menos
movimiento» del sistema.

**Corrección de la v3 del diseño:** las rachas dejan de ser una consulta y
pasan a tres tablas, porque se leen en cada apertura y hay que guardar cuándo
se ganó cada insignia.

*También:* faltaba poder crear y añadir cosas — sin eso la app solo servía si
te gustaba la rutina de fábrica.

*Arreglados:* la racha de apertura subía en el almacén pero no en la pantalla;
navegar desde un Modal lo dejaba flotando encima; el enrutador sacaba
«Unmatched Route» si la app no se servía en la raíz.

---

## Fase 1 — El día, con alarmas · 2026-08-29

App nativa con Expo SDK 57 y expo-router. Tres pantallas: Hoy con lo que toca
resaltado, el editor de la rutina semanal y los ajustes.

**La lógica de negocio va separada de la plataforma** a propósito: generar el
día, decidir qué toca ahora y calcular los avisos no importan nada de React
Native, así que se prueban sin bundler ni simulador. Ahí están los errores que
duelen —zonas horarias, medianoche, el silencio nocturno— y ahí están las
pruebas.

El día generado es una **copia** de la rutina: moverlo hoy no toca la semana.

Avisos 10 min antes por defecto, cada actividad puede llevar la contraria, el
devocional suena distinto, y el silencio se mide **en la hora del aviso**.

*Arreglados al probar en el navegador:* la pantalla salía en blanco por un
array de estilos en un `<a>` del DOM; marcar una tarea no repintaba porque el
repositorio devolvía la misma referencia; mover un bloque tampoco, por lo
mismo con el array.

---

## La base de datos · 2026-08-29

Proyecto de Supabase propio, **aparte** de los demás proyectos de la cuenta.

- `0001_fase1_el_dia.sql` — 7 tablas, RLS desde el primer día, disparador de alta
- `0002_fase2_rachas.sql` — 3 tablas y el catálogo de 24 insignias
- `0003_cerrar_funciones_de_trigger.sql` — **arreglo de seguridad**: las
  funciones `SECURITY DEFINER` quedaban publicadas como RPC

*Verificado contra la base real:* los disparadores crean persona, ajustes y las
cuatro rachas; las restricciones rechazan una duración de cero, un bloque al
revés, un día fuera de 0-6, una tarea «hecha» sin fecha y una racha por encima
de su récord; borrar la cuenta se lleva todo en cascada; y **el aislamiento por
fila aísla** — con dos personas, una no ve ni puede tocar nada de la otra, y
sin sesión no se ve nada. Cero avisos del linter de seguridad.

---

## El diseño · antes de programar

Seis versiones antes de escribir una línea de código, en
`docs/dia-de-leonora.html`.

De 20 tablas a 11 fusionando hábitos con actividades y familias con grupos;
después a 27 al añadir el Muro, el cobro y las rachas. Once fases, más lo
guardado para después. El nombre salió de una lista de veinte.
