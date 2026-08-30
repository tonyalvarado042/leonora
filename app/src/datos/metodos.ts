/**
 * Cómo se hizo el devocional hoy.
 *
 * El devocional no es solo el que da la app. La gente lo hace leyendo la
 * Biblia, con un libro, en familia, oyendo la radio o en la iglesia — y todo
 * eso cuenta igual. Lo que importa para la racha es que se hizo; lo que
 * importa para mirar atrás es **cómo**.
 */

export type MetodoDevocional =
  | 'app' | 'biblia' | 'libro' | 'familia' | 'radio' | 'otra_app' | 'iglesia' | 'otro';

export const METODOS: { id: MetodoDevocional; nombre: string; emoji: string }[] = [
  { id: 'app',      nombre: 'El de GraceDay',   emoji: '💜' },
  { id: 'biblia',   nombre: 'Leí la Biblia',    emoji: '📖' },
  { id: 'libro',    nombre: 'Con un libro',     emoji: '📕' },
  { id: 'familia',  nombre: 'En familia',       emoji: '👨‍👩‍👧' },
  { id: 'radio',    nombre: 'Oyendo la radio',  emoji: '📻' },
  { id: 'otra_app', nombre: 'Con otra app',     emoji: '📱' },
  { id: 'iglesia',  nombre: 'En la iglesia',    emoji: '⛪' },
  { id: 'otro',     nombre: 'De otra manera',   emoji: '✍️' },
];

export function metodo(id: MetodoDevocional | null | undefined) {
  return METODOS.find((m) => m.id === id) ?? null;
}
