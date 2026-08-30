/**
 * Los versículos que trae la app.
 *
 * **Sobre los derechos:** el texto que se distribuye aquí es de la
 * Reina-Valera 1909, que es de dominio público. Las traducciones modernas
 * —NVI, NTV, RVR1960, DHH— **tienen derechos de autor** y hace falta licencia
 * del editor para meterlas en una app que se vende. El esquema
 * (`versiculos_versiones`) ya admite varias versiones: añadir una licenciada
 * es meter filas, no tocar código.
 *
 * Este es un juego de arranque de 30 versículos que se repite a lo largo del
 * año. Antes de publicar conviene ampliarlo a 366 y **revisar cada texto**.
 */

export interface Versiculo {
  id: string;
  referencia: string;
  tema: string;
  /** El texto por versión. `rv1909` es la que se distribuye. */
  versiones: { version: string; texto: string }[];
}

export const VERSICULOS: Versiculo[] = [
  { id: 'v01', referencia: 'Filipenses 4:13', tema: 'fuerza', versiones: [
    { version: 'RV1909', texto: 'Todo lo puedo en Cristo que me fortalece.' }] },
  { id: 'v02', referencia: 'Salmos 23:1', tema: 'confianza', versiones: [
    { version: 'RV1909', texto: 'Jehová es mi pastor; nada me faltará.' }] },
  { id: 'v03', referencia: 'Josué 1:9', tema: 'valentía', versiones: [
    { version: 'RV1909', texto: 'Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios será contigo en donde quiera que fueres.' }] },
  { id: 'v04', referencia: 'Proverbios 3:5', tema: 'confianza', versiones: [
    { version: 'RV1909', texto: 'Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia.' }] },
  { id: 'v05', referencia: 'Salmos 119:105', tema: 'guía', versiones: [
    { version: 'RV1909', texto: 'Lámpara es á mis pies tu palabra, y lumbrera á mi camino.' }] },
  { id: 'v06', referencia: 'Isaías 41:10', tema: 'miedo', versiones: [
    { version: 'RV1909', texto: 'No temas, que yo soy contigo; no desmayes, que yo soy tu Dios que te esfuerzo.' }] },
  { id: 'v07', referencia: 'Mateo 6:33', tema: 'prioridades', versiones: [
    { version: 'RV1909', texto: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.' }] },
  { id: 'v08', referencia: 'Salmos 46:1', tema: 'refugio', versiones: [
    { version: 'RV1909', texto: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.' }] },
  { id: 'v09', referencia: 'Juan 3:16', tema: 'amor', versiones: [
    { version: 'RV1909', texto: 'Porque de tal manera amó Dios al mundo, que ha dado á su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.' }] },
  { id: 'v10', referencia: 'Romanos 8:28', tema: 'esperanza', versiones: [
    { version: 'RV1909', texto: 'Y sabemos que á los que á Dios aman, todas las cosas les ayudan á bien.' }] },
  { id: 'v11', referencia: 'Salmos 118:24', tema: 'gozo', versiones: [
    { version: 'RV1909', texto: 'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.' }] },
  { id: 'v12', referencia: 'Proverbios 16:3', tema: 'planes', versiones: [
    { version: 'RV1909', texto: 'Encomienda á Jehová tus obras, y tus pensamientos serán afirmados.' }] },
  { id: 'v13', referencia: 'Salmos 121:1-2', tema: 'ayuda', versiones: [
    { version: 'RV1909', texto: 'Alzaré mis ojos á los montes, de donde vendrá mi socorro. Mi socorro viene de Jehová, que hizo los cielos y la tierra.' }] },
  { id: 'v14', referencia: 'Mateo 11:28', tema: 'descanso', versiones: [
    { version: 'RV1909', texto: 'Venid á mí todos los que estáis trabajados y cargados, que yo os haré descansar.' }] },
  { id: 'v15', referencia: 'Salmos 139:14', tema: 'identidad', versiones: [
    { version: 'RV1909', texto: 'Te alabaré; porque formidables, maravillosas son tus obras.' }] },
  { id: 'v16', referencia: 'Gálatas 5:22-23', tema: 'carácter', versiones: [
    { version: 'RV1909', texto: 'Mas el fruto del Espíritu es: caridad, gozo, paz, tolerancia, benignidad, bondad, fe, mansedumbre, templanza.' }] },
  { id: 'v17', referencia: 'Salmos 51:10', tema: 'corazón', versiones: [
    { version: 'RV1909', texto: 'Crea en mí, oh Dios, un corazón limpio; y renueva un espíritu recto dentro de mí.' }] },
  { id: 'v18', referencia: 'Colosenses 3:23', tema: 'trabajo', versiones: [
    { version: 'RV1909', texto: 'Y todo lo que hagáis, hacedlo de ánimo, como al Señor, y no á los hombres.' }] },
  { id: 'v19', referencia: '1 Tesalonicenses 5:16-18', tema: 'gratitud', versiones: [
    { version: 'RV1909', texto: 'Estad siempre gozosos. Orad sin cesar. Dad gracias en todo.' }] },
  { id: 'v20', referencia: 'Salmos 34:8', tema: 'confianza', versiones: [
    { version: 'RV1909', texto: 'Gustad, y ved que es bueno Jehová: dichoso el hombre que confiará en él.' }] },
  { id: 'v21', referencia: 'Proverbios 17:17', tema: 'amistad', versiones: [
    { version: 'RV1909', texto: 'En todo tiempo ama el amigo; y el hermano para la angustia es nacido.' }] },
  { id: 'v22', referencia: 'Salmos 55:22', tema: 'preocupación', versiones: [
    { version: 'RV1909', texto: 'Echa sobre Jehová tu carga, y él te sustentará.' }] },
  { id: 'v23', referencia: 'Efesios 4:32', tema: 'perdón', versiones: [
    { version: 'RV1909', texto: 'Antes sed los unos con los otros benignos, misericordiosos, perdonándoos los unos á los otros.' }] },
  { id: 'v24', referencia: 'Salmos 27:1', tema: 'miedo', versiones: [
    { version: 'RV1909', texto: 'Jehová es mi luz y mi salvación: ¿de quién temeré?' }] },
  { id: 'v25', referencia: 'Santiago 1:5', tema: 'sabiduría', versiones: [
    { version: 'RV1909', texto: 'Y si alguno de vosotros tiene falta de sabiduría, demándela á Dios, el cual da á todos abundantemente.' }] },
  { id: 'v26', referencia: 'Salmos 37:5', tema: 'planes', versiones: [
    { version: 'RV1909', texto: 'Encomienda á Jehová tu camino, y espera en él; y él hará.' }] },
  { id: 'v27', referencia: 'Lamentaciones 3:22-23', tema: 'esperanza', versiones: [
    { version: 'RV1909', texto: 'Nuevas son cada mañana; grande es tu fidelidad.' }] },
  { id: 'v28', referencia: 'Miqueas 6:8', tema: 'justicia', versiones: [
    { version: 'RV1909', texto: 'Qué pide de ti Jehová: solamente hacer juicio, y amar misericordia, y humillarte para andar con tu Dios.' }] },
  { id: 'v29', referencia: 'Salmos 19:14', tema: 'palabras', versiones: [
    { version: 'RV1909', texto: 'Sean gratos los dichos de mi boca y la meditación de mi corazón delante de ti.' }] },
  { id: 'v30', referencia: '1 Corintios 13:4', tema: 'amor', versiones: [
    { version: 'RV1909', texto: 'La caridad es sufrida, es benigna; la caridad no tiene envidia.' }] },
];
