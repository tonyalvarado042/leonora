import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usarPaleta } from '@/lib/tema';
import type { TipoRepeticion } from '@/lib/tipos';

export interface Cada {
  tipo: 'unica' | TipoRepeticion;
  /** Solo en `semanal`. */
  dias_semana?: number[];
  /** Solo en `cada_n_dias`. */
  cada_n?: number;
}

const DIAS = [
  { n: 1, corto: 'L' }, { n: 2, corto: 'M' }, { n: 3, corto: 'X' },
  { n: 4, corto: 'J' }, { n: 5, corto: 'V' }, { n: 6, corto: 'S' }, { n: 0, corto: 'D' },
];
const CADA_N = [2, 3, 7, 15, 21, 30];

interface Props {
  valor: Cada;
  onCambiar: (c: Cada) => void;
  /** Para decir «cada mes el 3» y «cada año el 3 de septiembre». */
  fecha: string;
}

/**
 * Cada cuánto se repite algo.
 *
 * Las mismas opciones que un calendario normal, para no tener que meter la
 * misma tarea una y otra vez. Una sola regla cubre todas: no hay un sistema
 * para la semana y otro para el resto.
 */
export function Repeticion({ valor, onCambiar, fecha }: Props) {
  const p = usarPaleta();
  const [, mes, dia] = fecha.split('-').map(Number);
  const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][mes - 1];

  const opciones: { tipo: Cada['tipo']; texto: string }[] = [
    { tipo: 'unica', texto: 'Solo este día' },
    { tipo: 'diaria', texto: 'Todos los días' },
    { tipo: 'semanal', texto: 'Cada semana' },
    { tipo: 'cada_n_dias', texto: 'Cada tantos días' },
    { tipo: 'mensual', texto: `Cada mes el ${dia}` },
    { tipo: 'anual', texto: `Cada año el ${dia} de ${NOMBRE_MES}` },
  ];

  return (
    <View style={e.caja}>
      <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cada cuánto?</Text>

      <View style={e.opciones}>
        {opciones.map((o) => {
          const puesta = valor.tipo === o.tipo;
          return (
            <Pressable
              key={o.tipo}
              role="radio"
              aria-checked={puesta}
              aria-label={o.texto}
              onPress={() => onCambiar(
                o.tipo === 'semanal'
                  ? { tipo: 'semanal', dias_semana: valor.dias_semana ?? [] }
                  : o.tipo === 'cada_n_dias'
                    ? { tipo: 'cada_n_dias', cada_n: valor.cada_n ?? 15 }
                    : { tipo: o.tipo },
              )}
              style={[
                e.chip,
                puesta
                  ? { backgroundColor: p.alba, borderColor: p.alba }
                  : { backgroundColor: p.tarjeta, borderColor: p.linea },
              ]}
            >
              <Text style={[e.chipTexto, { color: puesta ? '#FFF' : p.tintaSuave }]}>
                {o.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {valor.tipo === 'semanal' && (
        <>
          <Text style={[e.sub, { color: p.tintaTenue }]}>¿Qué días? (al menos uno)</Text>
          <View style={e.dias}>
            {DIAS.map((d) => {
              const puesto = (valor.dias_semana ?? []).includes(d.n);
              return (
                <Pressable
                  key={d.n}
                  role="checkbox"
                  aria-checked={puesto}
                  aria-label={`Repetir el día ${d.corto}`}
                  onPress={() => onCambiar({
                    tipo: 'semanal',
                    dias_semana: puesto
                      ? (valor.dias_semana ?? []).filter((x) => x !== d.n)
                      : [...(valor.dias_semana ?? []), d.n],
                  })}
                  style={[
                    e.dia,
                    puesto
                      ? { backgroundColor: p.alba, borderColor: p.alba }
                      : { backgroundColor: p.tarjeta, borderColor: p.linea },
                  ]}
                >
                  <Text style={[e.diaTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>
                    {d.corto}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {valor.tipo === 'cada_n_dias' && (
        <>
          <Text style={[e.sub, { color: p.tintaTenue }]}>¿Cada cuántos días?</Text>
          <View style={e.opciones}>
            {CADA_N.map((n) => {
              const puesto = valor.cada_n === n;
              return (
                <Pressable
                  key={n}
                  role="radio"
                  aria-checked={puesto}
                  aria-label={`Cada ${n} días`}
                  onPress={() => onCambiar({ tipo: 'cada_n_dias', cada_n: n })}
                  style={[
                    e.chip,
                    puesto
                      ? { backgroundColor: p.alba, borderColor: p.alba }
                      : { backgroundColor: p.tarjeta, borderColor: p.linea },
                  ]}
                >
                  <Text style={[e.chipTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>
                    {n} días
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

/** Cómo se lee la regla, para enseñarla ya guardada. */
export function comoSeLee(c: Cada, fecha: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][mes - 1];
  const LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  switch (c.tipo) {
    case 'unica': return 'solo este día';
    case 'diaria': return 'todos los días';
    case 'semanal': {
      const d = (c.dias_semana ?? []).slice().sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      return d.length === 0 ? 'cada semana' : `cada ${d.map((x) => LETRA[x]).join(', ')}`;
    }
    case 'cada_n_dias': return `cada ${c.cada_n ?? 15} días`;
    case 'mensual': return `cada mes el ${dia}`;
    case 'anual': return `cada año el ${dia} de ${NOMBRE_MES}`;
  }
}

const e = StyleSheet.create({
  caja: { gap: 9 },
  etiqueta: { fontSize: 13.5, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 4 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTexto: { fontSize: 13.5, fontWeight: '600' },
  dias: { flexDirection: 'row', gap: 6 },
  dia: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  diaTexto: { fontSize: 14.5, fontWeight: '700' },
});
