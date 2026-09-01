# Historial de GraceDay

Todo lo que se ha hecho, en orden, con lo que se verificó en cada paso.
Lo más nuevo arriba.

> **Regla:** cada cambio entra aquí y en `DOCUMENTACION.md` en el mismo commit.

---

## Se puede tener cuenta, y lo del teléfono se va contigo · 2026-09-01

**La app sigue funcionando sin cuenta**, y eso no cambia: es como se usa el
primer día. Ahora, además, se puede crear una y **lo que ya había se sube**.

**Lo que se sube se enseña antes, con números.** «Se sube contigo: 5
actividades, 31 bloques de tu rutina, tus rachas (la más larga va por 24)». Y
lo que **no** viaja se dice igual de claro: los días ya armados se regeneran
desde la rutina, y las otras personas del teléfono necesitan su propia cuenta
—en la nube una persona **es** una cuenta— así que se las invita por correo.

**El orden de la subida es lo que la hace funcionar.** La rutina apunta a las
actividades por su id, y los ids nuevos los pone Postgres: primero las
actividades, se recogen sus ids, y solo entonces la rutina traducida. Al revés
la rutina apuntaría a la nada y **el día saldría vacío sin que nadie supiera
por qué**.

**El repositorio es ahora un envoltorio**, no una variable que se reasigna:
`import` se queda con el valor que había al cargar el módulo, así que las
quince pantallas habrían seguido hablando con el teléfono después de entrar,
**sin dar ningún error** — solo datos viejos, que es la peor forma de fallar.

**Dos columnas que faltaban** (migración 0015). `arranque_hecho` y
`ocupacion_nombre` estaban en el tipo de TypeScript y no en la tabla: como la
app siempre había corrido contra el teléfono, nadie lo notó. Sin la primera, la
nube mandaría a contestar el asistente **cada vez que se abre**. Comprobado uno
por uno: son los únicos dos campos de toda la app que estaban en el tipo y no
en su tabla.

**Dos fallos de redacción que solo salen mirando la pantalla**, no las pruebas:
«Los 1 días que ya viviste», y un «se rehacen con ellas» sin nadie a quien
referirse cuando no hay más gente en el teléfono.

**El `.env` apuntaba al proyecto vacío**, y el bundle se lo quedó: Expo cachea
las variables del build, así que cambiar el archivo y volver a exportar deja el
valor viejo dentro. Compila, arranca, y habla con la base de datos equivocada.
Hay que exportar con `--clear`, y se comprueba mirando el bundle. Va a R6.

**Verificado:** 312 pruebas de unidad (44 nuevas), 17 recorridos de navegador
—uno nuevo para la cuenta—, `typecheck` limpio. Y la subida entera **contra la
base real**: 2 actividades y 6 bloques de rutina, los 6 bien enganchados; el
CRM intacto y las filas de prueba borradas.

**Lo que no se pudo probar aquí:** la llamada de red de verdad. El proxy de
este entorno deniega `supabase.co`, así que `signUp` y `signInWithPassword` no
se han probado contra el servidor. Lo que sí se vio es el camino del error
haciendo lo correcto: «No se pudo conectar. Mira que tengas internet y vuelve a
probar.» Queda anotado en `LANZAMIENTO.md` cómo cerrarlo en un minuto.

## GraceDay se muda al proyecto de Tony, con apellido · 2026-09-01

**No hay base de datos nueva.** GraceDay ahora vive en el mismo proyecto de
Supabase que el CRM de Tony Alvarado, y para que no se haga un enredo **todo lo
suyo lleva `graceday_` delante**: 20 tablas, 25 tipos y 38 índices. Lo que no
se llama desde la app sigue en el esquema `claude_graceday` (R7).

**Las cinco tablas que ya estaban no se tocaron.** Se comprobó antes y después:
872 contactos, 17 prospectos, 5 suscriptores, 2 reservas — y el esquema del CRM
con sus 1.377 contactos y su usuario. Ni una fila, ni una política, ni un
índice de nadie más.

**El prefijo se puso con un guion, no a mano**, y el guion respeta lo que no es
código: no tocó ni un comentario ni una cadena entre comillas. Dio dos sustos
que valía la pena mirar:

- Una **columna que se llama igual que su tipo** —`tipo_cuenta tipo_cuenta`, y
  también `metodo_devocional`— salía renombrada por los dos lados. El tipo
  lleva prefijo; la columna no, o la app pediría una columna que no existe.
- `tareas_dia.metodo_devocional` renombraba **lo que va detrás del punto**, que
  es la columna. Ahora lo de detrás de un punto no se toca.

**El disparador de alta ahora lleva condición** (migración 0012). `auth.users`
es de todo el proyecto: sin condición, cualquiera que se registrara en otra app
nacería con una persona de GraceDay, y si algo fallara ahí dentro **nadie podría
registrarse en ninguna**. Ahora solo corre si el alta trae `app: 'graceday'`.

**Los nombres de tabla, en un solo sitio.** Estaban repetidos en 67 consultas;
ahora hay un mapa `TABLA` en `src/lib/supabase.ts` y cambiar el prefijo es
cambiar una línea. Las dos consultas anidadas usan **alias** (`tareas:`, `dia:`)
para que la clave de la respuesta no dependa del prefijo.

**Verificado:** 268 pruebas de unidad, 16 recorridos de navegador, `typecheck`
limpio, y el **asesor de seguridad de Supabase sin un solo aviso de GraceDay**
—los cuatro que salen son de antes y son a propósito.

**Y el alta quedó arreglada, en dos pasos y en este orden** (migraciones 0013 y
0014, que tocan el CRM, no GraceDay):

1. `cta_alta_usuario` le daba rol `lectura` —que lee **todo** el CRM: 872
   contactos, pagos, correos, documentos— a cualquiera que se registrara sin
   invitación. Lo único que lo tapaba era que nadie pudiera registrarse. Ahora
   sin invitación **no crea fila**.
2. `cta_validar_alta` rechazaba **cada** alta del proyecto que no estuviera en
   su lista de invitaciones, y esa lista está vacía: solo el dueño podía
   registrarse. Ahora solo valida las altas del CRM.

Al revés habría sido un agujero: los metadatos del alta los manda el teléfono,
así que cualquiera podría decir que viene de GraceDay. En este orden el CRM
queda **más cerrado que antes** — su acceso ya no depende de que nadie pueda
registrarse.

**Comprobado contra la base real:** un alta de GraceDay entra y sale con su
persona, sus ajustes, sus cuatro rachas y su familia, y con cero filas en el
CRM; un alta sin marca y sin invitación sigue rechazada; el CRM intacto (1.377
contactos, 872, 17, 5, 2). Las cuentas de prueba se borraron.

## La hora se escribe, y la pregunta se lee como se habla · 2026-08-31

**«¿A qué hora vives?»** era una frase de anuncio, no una pregunta. Ahora dice
lo que pregunta: **«¿A qué hora te levantas y a qué hora te acuestas?»**.

**La hora se escribe.** Antes eran cuatro botones —−1h, −15, +15, +1h— y para
llegar a las 07:15 desde las 06:00 había que tocar tres veces. Ahora son **dos
campos separados**: la hora por un lado y los minutos por otro. Uno solo con
«06:30» dentro obliga a pelearse con el cursor y con los dos puntos para
cambiar solo los minutos; con dos, se toca el que se quiere cambiar y ya.

**Salta solo al siguiente** en cuanto la hora no puede crecer más: dos dígitos,
o un primer dígito mayor que 2 —un 3 ya no puede ser 3X, porque no hay hora 30.
Así se escribe «0715» de corrido. Y quedan los cuatro minutos redondos —:00
:15 :30 :45— a un toque, que en un teléfono es más rápido que escribir.

Una hora imposible **avisa en vez de corregirse sola** (R2), y al salir del
campo lo que no vale vuelve a lo último bueno: dejarlo roto sería guardar una
hora que no existe.

**Tres fallos que solo salen probando, y los tres del mismo sitio:**

1. **El campo se remontaba en cada tecla.** Tenía el componente del campo
   definido *dentro* del render, así que React lo daba por nuevo cada vez y el
   teclado perdía el foco.
2. **El valor de fuera pisaba cada tecla.** Escribir «07» acababa en «00»: el
   «0» se guardaba, volvía como «00», y el «7» ya no cabía.
3. **Saltabas a los minutos, escribías, y no pasaba nada.** `selectTextOnFocus`
   selecciona en el teléfono pero **no en el navegador**, así que los dos
   dígitos nuevos se caían al recortar a dos. Teclear y que no pase nada es más
   desconcertante que un error.

*Verificado:* 268 pruebas y **dieciséis** de navegador, una nueva solo para
esto: que sean dos campos, que salte solo, que un 8 salte ya, que una hora
pegada imposible avise, que al salir vuelva atrás, que los minutos redondos
funcionen, y que la hora escrita a mano **llegue de verdad al día**.

---

## Fase 8 · Hombre o mujer, y el calendario del período · 2026-08-31

**Dónde va la pregunta.** En el primer paso del asistente, junto al nombre y la
edad. No hace falta un paso nuevo, y hay una razón mejor: la pregunta del
período depende de **las dos cosas** —ser mujer y tener 12 o más—, y ambas ya
están en esa pantalla. Puestas ahí, el bloque aparece solo cuando toca.

Tres opciones: mujer, hombre y **prefiero no decir**, que es una respuesta
entera, no un hueco. El sexo se usa **para una sola cosa** en toda la app: esto.
Y cuando no se ofrece, la app dice por qué en vez de callarse.

**El calendario.** Marca los días que te venga, y opcionalmente cuánto y cómo
te sientes. La app calcula cuánto dura su ciclo y cuándo tocaría el siguiente.

**La regla que gobierna el módulo entero: con un solo período no se predice
nada.** Hace falta un intervalo entre dos, y de verdad hacen falta tres para
que la media signifique algo. Enseñarle a una niña de 13 años una fecha
inventada con la misma cara que una calculada es peor que no enseñarle
ninguna: se organiza confiando en ella. Con un período dice «apunta uno más»;
con dos dice «más o menos»; con tres deja de decirlo.

Si los ciclos salen muy largos o muy seguidos, lo comenta **sin diagnosticar
nada** y manda a un adulto: «no suele ser nada, pero cuéntaselo a tu mamá o a
tu doctora». Una app no le dice a una niña que algo va mal.

**Lo único de toda la app que no ve nadie más.** Ni un tutor, ni quien comparte
grupo, ni quien mira el horario. La migración `0011_el_ciclo.sql` no tiene
excepción de tutor, no tiene excepción de grupo, y **no existe un
`cicloDe(personaId)`** en el repositorio: si existiera, alguien acabaría
llamándolo. Estaba decidido desde el diseño; aquí se cumple.

Se enciende y se apaga desde Ajustes, y **apagarlo no borra nada**: apagar una
cosa y perderla son dos acciones distintas.

En Hoy sale una raya rosa discreta, solo los días de alrededor, y solo si ella
lo encendió.

**Dos fallos de accesibilidad que salieron al probarlo:**

1. **Ningún interruptor de Ajustes tenía nombre.** Un lector de pantalla decía
   «casilla» sin decir de qué ajuste. Ahora la fila se lo pone.
2. Al arreglar lo anterior lo pasé de rosca: también renombraba los botones,
   y «Empezar de nuevo» se anunciaba como «Volver a contestar el asistente».
   Ahora solo se nombra el interruptor, que es el que no tiene texto propio.

*Verificado:* 268 pruebas —20 nuevas solo del cálculo del ciclo, con el caso de
un período, dos y tres— y **quince** de navegador: que la pregunta esté en el
primer paso, que a una niña de 11 y a un hombre no se les ofrezca, que a una
mujer de 13 sí y con la promesa de privacidad escrita, que con un solo período
no invente una fecha, que con dos calcule, y que apagarlo lo saque del menú sin
borrar nada. **Cero avisos del asesor de seguridad.**

---

## El menú de las tres rayas, y «Recados» pasa a ser «Mensajes» · 2026-08-31

**El menú.** La navegación estaba apilada al final de Hoy: cinco filas que
había que buscar debajo de todas las tareas, y cuantas más cosas tenía el día,
más lejos quedaban. Ahora hay un **☰ arriba a la izquierda**, en todas las
pantallas, con los nueve sitios a un toque y una marca en el que estás.

**Dos cosas se quedan fuera del menú a propósito.** La racha con las chispas
—no es un sitio al que ir, es el premio, y escondida detrás de un botón deja de
hacer que vuelvas— y la campanita, que tiene que verse sin abrir nada. Lo que
viene (un cumpleaños, un examen) también se queda fuera, y solo aparece cuando
hay algo: avisar de un cumpleaños dentro de un menú es no avisar.

El menú se apaga en una pantalla: **el editor de actividades**. Salirse a media
edición pierde lo escrito.

**«Recados» ahora es «Mensajes».** «Recado» es buena palabra pero cambia de
país —en unos sitios es un mandado, en otros un mensaje— y esto se vende a
familias de varios países. «Chat» no, todavía: lo que hay es *alguien te manda
algo y tú contestas una vez*, y un chat promete ida y vuelta. Eso llega en la
Fase 9, y entonces cabe dentro de esta misma pantalla.

Por dentro la tabla **sigue llamándose `encargos`** a propósito: la Fase 9 tiene
planeada una tabla `mensajes` para el chat de verdad, y darle ese nombre ahora
sería chocar conmigo mismo dentro de dos fases.

**Un fallo que salió al probarlo.** El velo oscuro del menú tapaba la pantalla
entera, incluido lo que hay debajo del cajón, así que un toque en el centro
caía sobre el cajón en vez de cerrar. Ahora el velo va **al lado**.

*Verificado:* 248 pruebas y **catorce** de navegador, incluida una nueva que
comprueba que Hoy ya no lleva la pila, que el menú trae los nueve sitios y
marca dónde estás, que salta de una pantalla a otra, que se cierra tocando
fuera, y que volver a Hoy no deja pantallas apiladas detrás.

---

## Recados: siempre hay botón, y no solo manda papá · 2026-08-31

Abrías «Recados» y **no había ninguna manera de mandar uno**. El botón solo
salía si eras tutor, así que a una niña le aparecía la pantalla vacía sin más
explicación. Un botón que no está y no dice por qué es el mismo fallo que un
botón apagado (R2).

Lo arreglé por los dos lados:

- **El botón está siempre.** Si todavía no tienes a nadie en tus grupos, se
  pulsa y lo dice, con dónde arreglarlo.
- **La línea correcta no era «quién puede escribir»** sino **«quién puede
  meterle algo en el horario a otro»**. Un mensaje o un recordatorio se lo
  manda cualquiera a cualquiera de sus grupos: una hija a su mamá, una hermana
  a otra. Se lee, se contesta, y no toca el día de nadie. **Una tarea** sí
  entra en el horario de quien la recibe, así que sigue siendo cosa de un papá
  o una mamá — y cuando eliges «Tarea» para alguien a quien no toca, la app lo
  dice y te deja mandarle un mensaje.

Migración `0010_escribir_a_los_tuyos.sql`, porque la política de la base de
datos pedía lo mismo.

**Un fallo que salió de rebote.** Al fijar el reloj en las pruebas apareció que
los identificadores se sacaban de `Date.now()` a secas: dos personas añadidas
en el mismo milisegundo salían con **el mismo id**. Con un reloj parado deja de
ser raro y pasa siempre. Ahora llevan un contador.

*Verificado:* 248 pruebas, y trece de navegador.

---

## Las pruebas de navegador ya no dependen del día · 2026-08-31

Tres pruebas pasaban el domingo y fallaban el lunes. No era casualidad: el día
de la semana cambia el horario, y las que hablan del colegio comprobaban lo
contrario de lo que tocaba. **Una prueba que depende del día en que se corre no
protege nada.**

Ahora todas fijan la fecha antes de abrir la app —un miércoles con colegio, y
la del colegio en fin de semana, un sábado— con `install` + `resume`, para que
la fecha sea la que queremos y las animaciones sigan corriendo. Congelar el
reloj del todo dejaba las animaciones a medias y Playwright se quedaba
esperando a que un elemento estuviera quieto.

Y salió otra cosa: al marcar el colegio antes de su hora, la app pregunta
«¿Terminaste, o lo dejas para después?» y esa pregunta tapa la pantalla. No es
un fallo —es lo que decide el premio—, pero las pruebas que marcan tareas
tienen que contestarla.

*Verificado:* las trece pasan, y pasan cualquier día.

---

## Invitar a la familia: por su nombre, o por correo · 2026-08-30

Añadir gente tenía dos huecos.

**Solo podía hacerlo quien administraba el grupo.** Una familia no se arma
pidiéndole permiso a un administrador: si la hija quiere meter a su hermana, la
mete. Ahora puede cualquier miembro. Lo único reservado es **añadir a otro papá
o mamá**: un tutor ve el calendario de todos los hijos de la casa y les puede
mandar tareas, así que fabricar uno no puede estar al alcance de cualquiera. Y
cuando no se puede, el botón se pulsa y lo dice, no se apaga (R2).

**No había manera de invitar a alguien que todavía no tiene la app.** Ahora hay
dos maneras de añadir a alguien, y la diferencia importa:

- **Solo con su nombre.** Entra ya, en este teléfono. Es lo que sirve para la
  casa: mamá toca su nombre arriba y ya está usando la app. Sin correo, sin
  cuenta, sin esperar a nada.
- **Con su correo.** Le llega una invitación con un código. Se abre tu correo o
  tu WhatsApp con el mensaje ya escrito. Entra desde su propio teléfono, y
  entonces ve el grupo y los horarios de quien los comparta.

**Los horarios del grupo.** Tocar a alguien en Familia abre su día. Es **solo
de mirar**: no hay casillas que marcar. El día de alguien lo marca quien lo
vive; un papá que pudiera tachar las tareas de su hija desde su teléfono
estaría llevándole la agenda, no acompañándola. Y mirarlo no se lo guarda: si
lo escribiera, se le quedaría un día armado que ella no abrió.

**Un rodeo que valió la pena.** Lo hice primero con un código por grupo, y para
poder leer el grupo antes de entrar hacía falta una política que dejaba listar
**todos** los grupos: el nombre de la casa de cualquier familia, a cualquiera
con la clave anónima. Además un código de grupo vale para siempre, así que
quien lo encontrara dentro de un año entraría igual.

Lo rehíce con invitaciones: **una invitación, un correo, un solo uso**. Lo que
cierra la puerta es el correo —una invitación solo se ve desde la cuenta a la
que va dirigida—, así que acertar un código a ciegas no sirve de nada. El
código es solo lo que se escribe a mano cuando el enlace no se puede tocar, y
va sin letras que se confundan al copiarlo: fuera 0/O y 1/I/L.

Migración `0009_invitaciones.sql`. **El asesor de seguridad sigue en cero
avisos.**

*Verificado:* 243 pruebas (`npm test`), y en el navegador de punta a punta:
añadir a mamá solo con su nombre y cambiar a ella; invitar a la abuela por
correo y ver salir su código; que un correo mal escrito y un código vacío
avisen; que un código inventado no abra nada; abrir el día de otra persona y
comprobar que no trae casillas; y que un código de verdad **mete de verdad** en
el grupo, y no vale dos veces.

---

## Fase 5 · La familia, la campanita y las fechas importantes · 2026-08-30

La capa 2 del diseño —la que faltaba desde la Fase 1— ya existe, y con ella la
app deja de ser de una sola persona.

**Varias personas en el mismo teléfono.** Cada quien tiene su día, su rutina,
sus rachas y sus chispas. Se cambia tocando el dibujo de arriba en Hoy, o desde
Familia. Lo guardado antes de la Fase 5 **se convierte al arrancar** y se deja
intacto por si hiciera falta rescatarlo: la persona que había pasa a ser la
primera de la casa, con su racha y sus chispas.

**Los grupos.** Una familia **es un grupo de tipo familia** — no hay tabla
aparte, así que lo que sirve para la casa sirve igual para las amigas o la
iglesia. Una cuenta nueva ya viene con su casa, para poder añadir a mamá sin
pasar antes por una pantalla de «crear un grupo».

**Solo dos roles, y esto fue un cambio de última hora que importaba.** Tenía
tres —dueño, tutor, miembro— y con eso la niña de 13 años que monta la app
para su familia salía como jefa del grupo, y **su mamá no podía mandarle
nada**. Quién creó el grupo es un dato (`grupos.creado_por`), no un rol: da
permiso para invitar y renombrar, no para tutelar.

**Quién ve el calendario de quién.** En la familia manda el tutor: papá y mamá
ven el día de sus hijos sin pedir permiso —para eso son los papás— y **la app
se lo dice al hijo en su pantalla, por su nombre**, en vez de mirarlo a
escondidas. En los demás grupos lo decide cada quien y lo puede apagar cuando
quiera. La misma regla vive en `grupos.ts` y en la base de datos: la app puede
equivocarse, la base de datos no.

**La campanita.** Papá o mamá manda una **tarea** (entra en el horario de ese
día), un **recordatorio** (solo avisa) o un **mensaje** (se lee y se contesta).
El número rojo cuenta **lo no abierto, no lo no hecho**. Marcar la tarea aquí
se ve allá: quien la mandó ve que ya está, y lee la respuesta.

Un encargo no es una orden que se cuela en el horario sin avisar. Llega a la
campanita, se ve quién lo mandó, y el que lo recibe puede contestar. Una app
que le mete tareas a una niña sin que ella las vea llegar no es una agenda, es
un vigilante.

**Las fechas importantes.** Feriados, cumpleaños, exámenes, entregas, citas,
viajes. **Un evento no borra la rutina, la tapa:** un feriado libra el día de
colegio y la tarea del colegio, pero deja el devocional, la cena y el recado de
mamá — el colegio se cancela, la vida no. Un cumpleaños anual vuelve cada año
sin volver a apuntarlo, y el del 29 de febrero se celebra el 28 cuando el año
no es bisiesto. Se ven en Hoy y en el calendario **aunque el día no esté
guardado todavía**: un feriado del mes que viene tiene que verse ahora.

**Dos fallos que encontró el navegador, no el typecheck:**

1. **Cambiar a mamá te tiraba al asistente sin decir nada.** Tocabas su nombre
   y aparecías en otra pantalla contestando un cuestionario que no pediste.
   Ahora sale una tarjeta que lo explica y deja volver.
2. **El nombre que oye un lector de pantalla no seguía al de la pantalla.** En
   una tarea de fe se leía «Tu respuesta» y el lector decía «Nota de la tarea».

**La base de datos.** Migración `0007_fase5_familia.sql`: `grupos`,
`miembros_grupo`, `encargos`, `eventos`, más `tareas_dia.encargo_id`. Las
políticas de lectura del tutor se **añaden** a las de antes: mirar no es
escribir, y esto no le da a nadie permiso para marcarle las tareas a otro.

Y `0008_esquema_claude_graceday.sql`, por la regla nueva: las seis funciones
que deciden quién ve qué estaban en `public`, y todo lo que está en `public`
sale publicado como endpoint REST. No enseñaban nada —todas contestan sobre
`auth.uid()`— pero una función que decide quién ve el calendario de una niña no
tiene por qué estar colgada de internet. Ahora viven en el esquema
`claude_graceday`, que PostgREST no publica. **El asesor de seguridad da cero
avisos.**

**Regla nueva, R7:** lo que se crea en una base de datos se llama
`claude_<proyecto>`. Un esquema llamado `interno` no dice de quién es ni de qué
proyecto, y en una cuenta con varios proyectos eso se convierte en cosas
sueltas que nadie sabe si se pueden borrar.

*Verificado:* 217 pruebas (`npm test`), ahora también del repositorio entero
con un AsyncStorage en memoria; y en el navegador, de punta a punta: añadir a
mamá, cambiar de persona, mandar un recado, que le llegue a Leonora con número
rojo y como tarea en su día, contestarlo, marcarlo, que mamá lo vea hecho y
contestado, guardar un feriado, y que quite el colegio dejando el devocional y
la cena — en Hoy, en el mes y en la semana.

---

## Las once pruebas de navegador, otra vez verdes · 2026-08-30

Cinco de las once llevaban tiempo rotas y no lo sabía: no pasaban por la
bienvenida —que llegó después de que se escribieran— y buscaban textos que
habían cambiado de nombre. **Una red de seguridad rota no protege nada** (R5),
y todas fallaban desde antes de la Fase 5.

Ahora hay un `arrancar.mjs` compartido que hace el recorrido de bienvenida, y
las que dependían de una hora concreta comprueban lo que de verdad importa
—que las dos horas se muevan quince minutos juntas— en vez de un `08:00`
escrito a mano que dependía de qué día se corriera la prueba.

*Verificado:* las once pasan, 79 pasos en total.

---

## Tareas que se repiten, como en un calendario · 2026-08-29

Añadir una tarea ya no es «solo para hoy». Ahora pregunta **cada cuánto se
repite**, con las mismas opciones que un calendario: todos los días, cada
semana (marcando qué días), cada tantos días, cada mes, cada año, o solo ese
día.

**Una sola tabla de reglas, no dos sistemas.** Antes `rutina` solo entendía de
días de la semana y el resto no existía. Ahora es la tabla de repeticiones, y
una única función —`tocaEsteDia`— decide si a un bloque le toca en una fecha.

Los casos raros están cubiertos y probados: **el día 31 cae en el 30 de abril y
en el 28 de febrero**, y **el 29 de febrero cae el 28** cuando el año no es
bisiesto. Quien puso «el 31» quiere decir «el último», no «sáltate febrero».

La hoja dice en palabras qué va a pasar —«Se repetirá cada L, X, V»— antes de
guardar, y «cada semana» sin marcar ningún día avisa en lugar de apagarse (R2).

Migración `0006_repeticiones.sql`, con una restricción que obliga a que cada
repetición lleve lo suyo y nada más: sin ella se pueden guardar reglas que no
significan nada y el generador las ignora en silencio.

*Verificado:* las seis opciones, el aviso al faltar los días, que una semanal
de siete días aparece hoy y en la rutina el lunes, el miércoles y el domingo,
y que una mensual también entra.

---

## El horario que «no cargaba», y el devocional propio · 2026-08-29

**La pulga del horario.** Poner escuela de 08:00 a 15:00 y no verla parecía que
la app no la había guardado. Lo comprobé y **los datos estaban bien**: cinco
bloques de lunes a viernes, con sus horas. Lo que fallaba era que **no se veía**
— hoy era sábado, y ni Hoy ni el editor de rutina decían por qué.

Arreglado donde estaba el problema, que era enseñarlo:
- **Hoy:** «Hoy no hay escuela. Tu horario está guardado y vuelve el lunes.»
- **La rutina:** cada día lleva la cuenta de cuántas cosas tiene, así se ve de
  un vistazo que L-V tienen más que S-D.
- Un día del todo vacío dice qué días sí tienen cosas, con un atajo para saltar.

También: el editor de rutina usaba la fecha del aparato en vez de la zona
horaria de la persona al regenerar el día.

**El devocional propio.** Ya no hay que usar el de la app: al abrir la tarea de
fe se pregunta **cómo lo hiciste hoy** — el de GraceDay, leyendo la Biblia, con
un libro, en familia, oyendo la radio, con otra app, en la iglesia o de otra
manera. Todo cuenta igual para la racha. El texto de la app solo se impone si
elegiste el suyo. La fila del día enseña con qué lo hiciste y si dejaste nota.

*La foto del devocional* queda para cuando llegue la cámara (fase 11): necesita
el mismo trabajo de permisos y almacenamiento, y tocar una lista es más rápido
que fotografiar.

Migración `0005_metodo_devocional.sql`.

*Verificado:* la propuesta con las horas, que Hoy explica el sábado, que la
rutina enseña las cuentas por día y que el lunes tiene Escuela 08:00 — 15:00;
y las ocho maneras de hacer el devocional, con y sin el texto de la app.

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
