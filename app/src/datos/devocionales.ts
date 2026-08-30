/**
 * Los devocionales que trae la app.
 *
 * Escritos para esta app, no copiados de ningún libro. El texto bíblico que
 * citan es de la Reina-Valera 1909 (dominio público) — ver `versiculos.ts`.
 *
 * Un devocional no es un sermón: es un pasaje corto, dos párrafos y **una
 * pregunta**. Sin la pregunta, «Devocional 6:30-7:30» vuelve a ser una casilla
 * vacía.
 */

export interface Devocional {
  id: string;
  titulo: string;
  pasaje: string;
  texto: string;
  pregunta: string;
  minutos: number;
  /** Para no darle a alguien de 8 años algo escrito para un adulto. */
  edad_min: number;
  edad_max: number;
}

export const DEVOCIONALES: Devocional[] = [
  {
    id: 'd01', titulo: 'El pastor que no se distrae', pasaje: 'Salmos 23:1-3',
    minutos: 15, edad_min: 8, edad_max: 99,
    texto: 'Un pastor de verdad no cuida a las ovejas de lejos. Camina con ellas, sabe cuál cojea, se da cuenta cuando falta una.\n\nCuando David escribió «nada me faltará» no estaba diciendo que iba a tener todo lo que quería. Estaba diciendo que no le iba a faltar lo que necesitaba. Son dos cosas distintas, y aprender a verlas distintas cambia mucho el día.',
    pregunta: '¿Qué cosa estás pidiendo hoy: algo que quieres o algo que necesitas?',
  },
  {
    id: 'd02', titulo: 'Lo primero de la mañana', pasaje: 'Marcos 1:35',
    minutos: 15, edad_min: 10, edad_max: 99,
    texto: 'Jesús se levantaba «muy de mañana, siendo aún muy oscuro» para orar. Tenía todo el día por delante, gente esperándolo, cosas urgentes. Y aun así empezaba por ahí.\n\nNo era porque le sobrara el tiempo. Era porque sabía que lo primero que uno hace es lo que de verdad le importa.',
    pregunta: '¿Qué es lo primero que haces al despertar? ¿Qué dice eso de lo que te importa?',
  },
  {
    id: 'd03', titulo: 'Hacer las cosas bien cuando nadie mira', pasaje: 'Colosenses 3:23',
    minutos: 15, edad_min: 10, edad_max: 99,
    texto: '«Todo lo que hagáis, hacedlo de ánimo, como al Señor, y no á los hombres.» Pablo le escribió eso a gente que hacía trabajos que nadie agradecía.\n\nOrdenar tu cuarto no va a salir en ningún lado. Nadie te va a felicitar por tender la cama. Y sin embargo, cómo haces las cosas pequeñas es exactamente quien eres cuando nadie mira.',
    pregunta: '¿Qué cosa pequeña vas a hacer bien hoy aunque nadie se dé cuenta?',
  },
  {
    id: 'd04', titulo: 'Nuevas cada mañana', pasaje: 'Lamentaciones 3:22-23',
    minutos: 15, edad_min: 8, edad_max: 99,
    texto: 'Jeremías escribió esto en el peor momento de su vida. Su ciudad estaba destruida. Y en medio de eso escribió: «nuevas son cada mañana».\n\nNo dijo que todo estaba bien. Dijo que cada mañana empieza otra vez. Si ayer te fue mal, ayer ya pasó.',
    pregunta: '¿Hay algo de ayer que necesitas soltar para poder empezar hoy?',
  },
  {
    id: 'd05', titulo: 'La carga que no tienes que cargar', pasaje: 'Salmos 55:22',
    minutos: 15, edad_min: 10, edad_max: 99,
    texto: '«Echa sobre Jehová tu carga.» Echar no es dejarla a un lado por si acaso. Es soltarla.\n\nHay cosas que uno sigue cargando aunque ya las haya orado: un examen, una pelea, un miedo. Orar por algo y seguir preocupado por lo mismo es cargar dos veces.',
    pregunta: '¿Qué estás cargando hoy que ya podrías haber soltado?',
  },
  {
    id: 'd06', titulo: 'Pedir sabiduría no es hacer trampa', pasaje: 'Santiago 1:5',
    minutos: 15, edad_min: 12, edad_max: 99,
    texto: 'Santiago dice que si te falta sabiduría, la pidas. No dice que la merezcas ni que primero te la ganes. Dice que la pidas.\n\nA veces uno cree que pedir ayuda es de débiles. Pero el que pide sabe algo que el otro no: sabe que no lo sabe todo.',
    pregunta: '¿En qué decisión de esta semana necesitas pedir sabiduría antes de decidir?',
  },
  {
    id: 'd07', titulo: 'El fruto no se apura', pasaje: 'Gálatas 5:22-23',
    minutos: 15, edad_min: 10, edad_max: 99,
    texto: 'Pablo no dice «las obras del Espíritu». Dice el **fruto**. Y el fruto no se fabrica: crece.\n\nUn árbol no se esfuerza por dar manzanas. Da manzanas porque es un manzano y está bien plantado. La paciencia, la bondad y el dominio propio funcionan igual: no salen de apretar los dientes, salen de estar plantado en el sitio correcto.',
    pregunta: '¿Cuál de esos frutos te cuesta más? ¿Y qué te está costando estar plantado?',
  },
];
