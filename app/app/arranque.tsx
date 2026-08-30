import { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SelectorHora } from '@/componentes/SelectorHora';
import {
  armarSemana, GUSTOS, OCUPACIONES, QUEHACERES, RESPUESTAS_EN_BLANCO,
  type Propuesta, type Respuestas,
} from '@/lib/arranque';
import {
  CONFIANZA_MINIMA, jornada, leerHorario, type MateriaLeida,
} from '@/lib/horarioFoto';
import { aHora, aMinutos } from '@/lib/fechas';
import { colorDeTipo } from '@/lib/tema';
import { fechaLocal } from '@/lib/fechas';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Ocupacion } from '@/lib/tipos';

const DIAS = [
  { n: 1, corto: 'L' }, { n: 2, corto: 'M' }, { n: 3, corto: 'X' },
  { n: 4, corto: 'J' }, { n: 5, corto: 'V' }, { n: 6, corto: 'S' }, { n: 0, corto: 'D' },
];
const PASOS = 5;

export default function Arranque() {
  const p = usarPaleta();
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [r, setR] = useState<Respuestas>(RESPUESTAS_EN_BLANCO);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [edadLibre, setEdadLibre] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [materias, setMaterias] = useState<MateriaLeida[] | null>(null);
  // El día que se está mirando en el preview editable.
  const [diaPreview, setDiaPreview] = useState(1);

  const cambiar = (c: Partial<Respuestas>) => setR((v) => ({ ...v, ...c }));
  const alternar = (lista: 'quehaceres' | 'gustos', id: string) =>
    cambiar({ [lista]: r[lista].includes(id) ? r[lista].filter((x) => x !== id) : [...r[lista], id] } as Partial<Respuestas>);

  // Solo el nombre es obligatorio: todo lo demás trae un valor razonable, y
  // obligar a decidirlo todo antes de ver nada es como se pierde a la gente.
  const puedeSeguir = paso !== 1 || r.nombre.trim().length > 0;

  function siguiente() {
    if (paso < PASOS) { setPaso(paso + 1); return; }
    setPropuesta(armarSemana(r, 'local'));
  }

  /** Editar la propuesta antes de aceptarla. Aceptar algo que no te gusta y
   *  después buscar dónde arreglarlo es peor que arreglarlo aquí mismo. */
  function moverBloque(id: string, minutos: number) {
    setPropuesta((v) => v && {
      ...v,
      rutina: v.rutina.map((b) => {
        if (b.id !== id) return b;
        const largo = aMinutos(b.hora_fin) - aMinutos(b.hora_inicio);
        const inicio = aHora(aMinutos(b.hora_inicio) + minutos);
        return { ...b, hora_inicio: inicio, hora_fin: aHora(aMinutos(inicio) + largo) };
      }),
    });
  }

  function quitarBloque(id: string) {
    setPropuesta((v) => v && { ...v, rutina: v.rutina.filter((b) => b.id !== id) });
  }

  async function aceptar() {
    if (!propuesta) return;
    const persona = await repositorio.persona();
    await repositorio.aplicarArranque(
      propuesta, r.nombre.trim(), fechaLocal(new Date(), persona.zona_horaria),
    );
    router.replace('/');
  }

  // ------------------------------------------------ lo leído de la foto
  if (materias) {
    const j = jornada(materias);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }}>
        <ScrollView contentContainerStyle={e.cuerpo}>
          <Text style={[e.titulo, { color: p.tinta }]}>
            Leí {materias.length} materias
          </Text>
          <Text style={[e.ayuda, { color: p.tintaSuave }]}>
            Revisa antes de aceptar. Lo que salió borroso está marcado en rojo —
            nada entra a tu horario sin que tú lo apruebes.
          </Text>

          {materias.map((m) => {
            const dudosa = m.confianza < CONFIANZA_MINIMA;
            return (
              <View
                key={m.id}
                style={[
                  e.materia,
                  { backgroundColor: p.tarjeta },
                  dudosa ? { borderColor: p.fuego, borderWidth: 1.5 } : { borderColor: p.linea },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={m.nombre}
                    onChangeText={(t) => setMaterias(materias.map((x) =>
                      x.id === m.id ? { ...x, nombre: t } : x))}
                    aria-label={`Nombre de ${m.nombre}`}
                    style={[e.materiaNombre, { color: p.tinta }]}
                  />
                  <Text style={[e.materiaHoras, { color: p.tintaTenue }]}>
                    {m.emoji} {m.hora_inicio}–{m.hora_fin} · {diasATexto(m.dias)}
                  </Text>
                  {dudosa && (
                    <Text style={[e.materiaAviso, { color: p.fuego }]}>
                      Salió borrosa. Leí «{m.texto_leido}»
                    </Text>
                  )}
                </View>
                <Pressable
                  role="button"
                  aria-label={`Quitar ${m.nombre}`}
                  onPress={() => setMaterias(materias.filter((x) => x.id !== m.id))}
                  style={[e.quitar, { borderColor: p.linea }]}
                >
                  <Text style={{ color: p.fuego, fontSize: 15 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}

          <Pressable
            role="button"
            onPress={() => {
              if (j) cambiar({ ocupacion_inicio: j.inicio, ocupacion_fin: j.fin, dias_ocupados: j.dias });
              setMaterias(null);
            }}
            style={[e.principal, { backgroundColor: p.alba }]}
          >
            <Text style={e.principalTexto}>
              {j ? `Aceptar · de ${j.inicio} a ${j.fin}` : 'Aceptar'}
            </Text>
          </Pressable>
          <Pressable role="button" onPress={() => setMaterias(null)} style={e.secundario}>
            <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>No usar esta foto</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------- la propuesta
  if (propuesta) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }}>
        <ScrollView contentContainerStyle={e.cuerpo}>
          <Text style={[e.titulo, { color: p.tinta }]}>
            Listo, {r.nombre.trim()}. Te armé tu semana.
          </Text>
          <Text style={[e.ayuda, { color: p.tintaSuave }]}>
            Así queda. Puedes cambiar lo que quieras después, cuando quieras.
          </Text>

          <View style={[e.tarjeta, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            {propuesta.resumen.map((linea, i) => (
              <View key={i} style={e.lineaResumen}>
                <Text style={[e.vineta, { color: p.alba }]}>•</Text>
                <Text style={[e.textoResumen, { color: p.tinta }]}>{linea}</Text>
              </View>
            ))}
          </View>

          <Text style={[e.etiqueta, { color: p.tintaSuave }]}>
            Mira día por día, y quita lo que no quieras
          </Text>
          <View style={e.dias}>
            {DIAS.map((d) => {
              const puesto = d.n === diaPreview;
              return (
                <Pressable
                  key={d.n}
                  role="tab"
                  aria-selected={puesto}
                  aria-label={`Ver ${NOMBRE_DIA[d.n]}`}
                  onPress={() => setDiaPreview(d.n)}
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

          {(() => {
            const delDia = propuesta.rutina
              .filter((b) => b.dia_semana === diaPreview)
              .sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio));
            if (delDia.length === 0) {
              return (
                <Text style={[e.vacioDia, { color: p.tintaTenue }]}>
                  Este día quedó libre.
                </Text>
              );
            }
            return delDia.map((b) => {
              const a = propuesta.actividades.find((x) => x.id === b.actividad_id);
              if (!a) return null;
              return (
                <View key={b.id} style={[e.bloque, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
                  <View style={[e.rayaBloque, { backgroundColor: colorDeTipo(a.tipo, p) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[e.bloqueNombre, { color: p.tinta }]}>{a.emoji}  {a.nombre}</Text>
                    <Text style={[e.bloqueHoras, { color: p.tintaTenue }]}>
                      {b.hora_inicio} — {b.hora_fin}{a.es_fijo ? ' · no se mueve' : ''}
                    </Text>
                  </View>
                  <Pressable
                    role="button"
                    aria-label={`Adelantar ${a.nombre} 15 minutos`}
                    onPress={() => moverBloque(b.id, -15)}
                    style={[e.mini, { borderColor: p.linea }]}
                  >
                    <Text style={{ color: p.tinta, fontSize: 12 }}>−15</Text>
                  </Pressable>
                  <Pressable
                    role="button"
                    aria-label={`Retrasar ${a.nombre} 15 minutos`}
                    onPress={() => moverBloque(b.id, 15)}
                    style={[e.mini, { borderColor: p.linea }]}
                  >
                    <Text style={{ color: p.tinta, fontSize: 12 }}>+15</Text>
                  </Pressable>
                  <Pressable
                    role="button"
                    aria-label={`Quitar ${a.nombre} del ${NOMBRE_DIA[diaPreview]}`}
                    onPress={() => quitarBloque(b.id)}
                    style={[e.mini, { borderColor: p.linea }]}
                  >
                    <Text style={{ color: p.fuego, fontSize: 13 }}>✕</Text>
                  </Pressable>
                </View>
              );
            });
          })()}

          <View style={[e.cifras, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
            <Text style={[e.cifrasTexto, { color: p.alba }]}>
              {propuesta.actividades.length} cosas · {propuesta.rutina.length} bloques en la semana
            </Text>
          </View>

          <Pressable role="button" onPress={aceptar} style={[e.principal, { backgroundColor: p.alba }]}>
            <Text style={e.principalTexto}>Me gusta, empezar</Text>
          </Pressable>
          <Pressable role="button" onPress={() => { setPropuesta(null); setPaso(1); }} style={e.secundario}>
            <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cambiar mis respuestas</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------ las preguntas
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }}>
      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={e.progreso}>
          {Array.from({ length: PASOS }, (_, i) => (
            <View
              key={i}
              style={[e.tramo, { backgroundColor: i < paso ? p.alba : p.linea }]}
            />
          ))}
        </View>
        <Text style={[e.contador, { color: p.tintaTenue }]}>Pregunta {paso} de {PASOS}</Text>

        {paso === 1 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿Cómo te llamas?</Text>
            <Text style={[e.ayuda, { color: p.tintaSuave }]}>
              Es como te va a saludar la app cada mañana.
            </Text>
            <TextInput
              value={r.nombre}
              onChangeText={(t) => cambiar({ nombre: t })}
              placeholder="Tu nombre"
              placeholderTextColor={p.tintaTenue}
              aria-label="Tu nombre"
              autoFocus
              style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta, borderColor: p.linea }]}
            />
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuántos años tienes?</Text>
            <View style={e.opciones}>
              {[8, 10, 12, 13, 15, 18].map((n) => (
                <Chip key={n} texto={`${n}`} puesto={r.edad === n}
                  onPress={() => { cambiar({ edad: n }); setEdadLibre(''); }} />
              ))}
              <View style={[e.edadOtra, { backgroundColor: p.tarjeta, borderColor: edadLibre ? p.alba : p.linea }]}>
                <TextInput
                  value={edadLibre}
                  onChangeText={(t) => {
                    const limpio = t.replace(/[^0-9]/g, '').slice(0, 3);
                    setEdadLibre(limpio);
                    cambiar({ edad: limpio === '' ? null : Number(limpio) });
                  }}
                  placeholder="Otra"
                  placeholderTextColor={p.tintaTenue}
                  inputMode="numeric"
                  aria-label="Escribe tu edad"
                  style={[e.edadEntrada, { color: p.tinta }]}
                />
              </View>
            </View>
          </>
        )}

        {paso === 2 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿A qué hora vives?</Text>
            <Text style={[e.ayuda, { color: p.tintaSuave }]}>
              Entre estas dos horas cabe todo tu día. Nada se pone fuera.
            </Text>
            <View style={e.horas}>
              <SelectorHora etiqueta="☀️  Me levanto a las"
                valor={r.hora_despertar} onCambiar={(h) => cambiar({ hora_despertar: h })} />
              <SelectorHora etiqueta="🌙  Me acuesto a las"
                valor={r.hora_dormir} onCambiar={(h) => cambiar({ hora_dormir: h })} />
            </View>
          </>
        )}

        {paso === 3 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>Tu devocional</Text>
            <Text style={[e.ayuda, { color: p.tintaSuave }]}>
              Es lo único que se coloca primero, antes que el colegio y que todo lo demás.
            </Text>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuántos minutos al día?</Text>
            <View style={e.opciones}>
              {[15, 30, 45, 60].map((m) => (
                <Chip key={m} texto={m === 60 ? '1 hora' : `${m} min`}
                  puesto={r.devocional_min === m} onPress={() => cambiar({ devocional_min: m })} />
              ))}
            </View>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuándo?</Text>
            <View style={e.opciones}>
              <Chip texto="En la mañana" puesto={r.devocional_momento === 'mañana'}
                onPress={() => cambiar({ devocional_momento: 'mañana' })} />
              <Chip texto="En la noche" puesto={r.devocional_momento === 'noche'}
                onPress={() => cambiar({ devocional_momento: 'noche' })} />
              <Chip texto="Los dos" puesto={r.devocional_momento === 'ambas'}
                onPress={() => cambiar({ devocional_momento: 'ambas' })} />
            </View>
          </>
        )}

        {paso === 4 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿A dónde vas cada día?</Text>
            <View style={e.opciones}>
              {OCUPACIONES.map((o) => (
                <Chip
                  key={o.id}
                  texto={o.id === 'ninguno' ? o.nombre : `${o.emoji} ${o.nombre}`}
                  puesto={r.ocupacion === o.id}
                  onPress={() => cambiar({ ocupacion: o.id as Ocupacion })}
                />
              ))}
            </View>

            {r.ocupacion !== 'ninguno' && (
              <>
                <Text style={[e.etiqueta, { color: p.tintaSuave }]}>
                  ¿Cómo quieres que se llame en tu horario?
                </Text>
                <TextInput
                  value={r.ocupacion_nombre}
                  onChangeText={(t) => cambiar({ ocupacion_nombre: t })}
                  placeholder={OCUPACIONES.find((o) => o.id === r.ocupacion)?.nombre ?? ''}
                  placeholderTextColor={p.tintaTenue}
                  aria-label="Nombre de tu colegio o trabajo"
                  style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta, borderColor: p.linea }]}
                />

                <Pressable
                  role="button"
                  aria-label="Escanear mi horario"
                  disabled={leyendo}
                  onPress={async () => {
                    setLeyendo(true);
                    const h = await leerHorario();
                    setLeyendo(false);
                    setMaterias(h.materias);
                  }}
                  style={[e.foto, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
                >
                  <Text style={[e.fotoTitulo, { color: p.alba }]}>
                    {leyendo ? '⏳  Leyendo tu horario…' : '📷  Escanear mi horario de clases'}
                  </Text>
                  <Text style={[e.fotoTexto, { color: p.tintaSuave }]}>
                    {leyendo
                      ? 'Buscando materias, días y horas.'
                      : 'Tomas una foto y se meten todas las materias solas. Ejemplo de muestra por ahora.'}
                  </Text>
                </Pressable>

                <View style={e.horas}>
                  <SelectorHora etiqueta="Entro a las" valor={r.ocupacion_inicio}
                    onCambiar={(h) => cambiar({ ocupacion_inicio: h })} />
                  <SelectorHora etiqueta="Salgo a las" valor={r.ocupacion_fin}
                    onCambiar={(h) => cambiar({ ocupacion_fin: h })} />
                </View>

                <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Qué días?</Text>
                <View style={e.dias}>
                  {DIAS.map((d) => {
                    const puesto = r.dias_ocupados.includes(d.n);
                    return (
                      <Pressable
                        key={d.n}
                        role="checkbox"
                        aria-checked={puesto}
                        aria-label={`Día ${d.corto}`}
                        onPress={() => cambiar({
                          dias_ocupados: puesto
                            ? r.dias_ocupados.filter((x) => x !== d.n)
                            : [...r.dias_ocupados, d.n],
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
          </>
        )}

        {paso === 5 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿Qué más hay en tu día?</Text>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Lo que te toca en casa</Text>
            <View style={e.opciones}>
              {QUEHACERES.map((q) => (
                <Chip key={q.id} texto={`${q.emoji} ${q.nombre}`}
                  puesto={r.quehaceres.includes(q.id)} onPress={() => alternar('quehaceres', q.id)} />
              ))}
            </View>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Y lo que te gusta</Text>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>
              Un horario sin nada que te guste no se cumple. Esto también entra.
            </Text>
            <View style={e.opciones}>
              {GUSTOS.map((g) => (
                <Chip key={g.id} texto={`${g.emoji} ${g.nombre}`}
                  puesto={r.gustos.includes(g.id)} onPress={() => alternar('gustos', g.id)} />
              ))}
            </View>
          </>
        )}

        <Pressable
          role="button"
          onPress={siguiente}
          disabled={!puedeSeguir}
          style={[e.principal, { backgroundColor: puedeSeguir ? p.alba : p.linea }]}
        >
          <Text style={e.principalTexto}>
            {paso === PASOS ? 'Armar mi semana' : 'Siguiente'}
          </Text>
        </Pressable>

        {paso > 1 && (
          <Pressable role="button" onPress={() => setPaso(paso - 1)} style={e.secundario}>
            <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Atrás</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function diasATexto(dias: number[]): string {
  if (dias.length === 0) return 'ningún día';
  if (dias.length === 7) return 'todos los días';
  const ordenados = [...dias].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (ordenados.join() === '1,2,3,4,5') return 'de lunes a viernes';
  return ordenados.map((d) => NOMBRE_DIA[d].slice(0, 3)).join(', ');
}

function Chip({ texto, puesto, onPress }: { texto: string; puesto: boolean; onPress: () => void }) {
  const p = usarPaleta();
  return (
    <Pressable
      role="checkbox"
      aria-checked={puesto}
      onPress={onPress}
      style={[
        e.chip,
        puesto
          ? { backgroundColor: p.alba, borderColor: p.alba }
          : { backgroundColor: p.tarjeta, borderColor: p.linea },
      ]}
    >
      <Text style={[e.chipTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>{texto}</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  cuerpo: {
    padding: 22, paddingTop: 28, paddingBottom: 40,
    maxWidth: 560, width: '100%', alignSelf: 'center',
  },
  progreso: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  tramo: { flex: 1, height: 4, borderRadius: 2 },
  contador: { fontSize: 12, marginBottom: 20 },
  titulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginBottom: 6 },
  ayuda: { fontSize: 14.5, lineHeight: 20, marginBottom: 16 },
  etiqueta: { fontSize: 13.5, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  entrada: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 15, fontSize: 18,
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 11, paddingHorizontal: 15, borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTexto: { fontSize: 14.5, fontWeight: '600' },
  horas: { gap: 20, marginTop: 8 },
  dias: { flexDirection: 'row', gap: 6 },
  dia: {
    flex: 1, height: 44, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  diaTexto: { fontSize: 15, fontWeight: '700' },
  foto: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 13,
    padding: 15, marginTop: 16, marginBottom: 4,
  },
  fotoTitulo: { fontSize: 14.5, fontWeight: '700' },
  fotoTexto: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  tarjeta: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 18, gap: 11,
  },
  lineaResumen: { flexDirection: 'row', gap: 10 },
  vineta: { fontSize: 17, lineHeight: 22 },
  textoResumen: { flex: 1, fontSize: 15, lineHeight: 22 },
  cifras: { borderWidth: 1, borderRadius: 13, padding: 13, alignItems: 'center', marginTop: 14 },
  cifrasTexto: { fontSize: 14, fontWeight: '700' },
  edadOtra: {
    borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    minWidth: 74, justifyContent: 'center',
  },
  edadEntrada: { paddingVertical: 11, paddingHorizontal: 15, fontSize: 14.5, fontWeight: '600' },
  materia: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8,
  },
  materiaNombre: { fontSize: 15.5, fontWeight: '700', paddingVertical: 2 },
  materiaHoras: { fontSize: 12.5, marginTop: 2 },
  materiaAviso: { fontSize: 11.5, marginTop: 4, fontWeight: '600' },
  quitar: {
    width: 34, height: 34, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  bloque: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 11,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 7, overflow: 'hidden',
  },
  rayaBloque: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  bloqueNombre: { fontSize: 14.5, fontWeight: '600', marginLeft: 6 },
  bloqueHoras: { fontSize: 11.5, marginTop: 2, marginLeft: 6 },
  mini: {
    minWidth: 34, height: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  vacioDia: { fontSize: 14, textAlign: 'center', paddingVertical: 22 },
  principal: { marginTop: 28, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  principalTexto: { color: '#FFF', fontWeight: '700', fontSize: 16.5 },
  secundario: { marginTop: 10, paddingVertical: 13, alignItems: 'center' },
  secundarioTexto: { fontSize: 15, fontWeight: '600' },
});
