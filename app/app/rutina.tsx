import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cabecera } from '@/componentes/Cabecera';
import { useFocusEffect, useRouter } from 'expo-router';

import { SelectorHora } from '@/componentes/SelectorHora';
import { colorDeTipo, usarPaleta } from '@/lib/tema';
import { repositorio } from '@/lib/repositorio';
import { aHora, aMinutos, diaSemana, duracionMin, fechaLocal } from '@/lib/fechas';
import type { Actividad, BloqueRutina, Hora } from '@/lib/tipos';

const DIAS = [
  { n: 1, corto: 'L', largo: 'lunes', plural: 'lunes' },
  { n: 2, corto: 'M', largo: 'martes', plural: 'martes' },
  { n: 3, corto: 'X', largo: 'miércoles', plural: 'miércoles' },
  { n: 4, corto: 'J', largo: 'jueves', plural: 'jueves' },
  { n: 5, corto: 'V', largo: 'viernes', plural: 'viernes' },
  { n: 6, corto: 'S', largo: 'sábado', plural: 'sábados' },
  { n: 0, corto: 'D', largo: 'domingo', plural: 'domingos' },
];

export default function Rutina() {
  const p = usarPaleta();
  const router = useRouter();
  const [dia, setDia] = useState(() => new Date().getDay());
  const [zona, setZona] = useState('America/Guatemala');
  const [bloques, setBloques] = useState<BloqueRutina[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  // null = cerrado; una actividad = eligiendo su hora.
  const [anadiendo, setAnadiendo] = useState<Actividad | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [inicio, setInicio] = useState<Hora>('08:00');

  const cargar = useCallback(async () => {
    const persona = await repositorio.persona();
    setZona(persona.zona_horaria);
    setBloques(await repositorio.rutina());
    setActividades(await repositorio.actividades());
  }, []);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const delDia = bloques
    .filter((b) => b.activo && b.dia_semana === dia)
    .sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio));

  // Qué días sí tienen algo, para no dejar a nadie creyendo que la rutina no
  // se guardó cuando lo que pasa es que hoy es sábado.
  const conAlgo = DIAS.filter((d) => bloques.some((b) => b.activo && b.dia_semana === d.n));

  const cuentaPorDia = new Map<number, number>();
  for (const b of bloques) {
    if (b.activo) cuentaPorDia.set(b.dia_semana, (cuentaPorDia.get(b.dia_semana) ?? 0) + 1);
  }

  async function mover(b: BloqueRutina, minutos: number) {
    const largo = duracionMin(b.hora_inicio, b.hora_fin);
    const inicio = aHora(aMinutos(b.hora_inicio) + minutos);
    const actualizado = { ...b, hora_inicio: inicio, hora_fin: aHora(aMinutos(inicio) + largo) };
    await repositorio.guardarBloque(actualizado);
    // El día de hoy es una copia de la rutina, así que hay que rehacerlo para
    // que el cambio se vea en la pantalla de Hoy.
    await repositorio.regenerarDia(fechaLocal(new Date(), zona));
    await cargar();
  }

  async function quitar(b: BloqueRutina) {
    await repositorio.borrarBloque(b.id);
    await repositorio.regenerarDia(fechaLocal(new Date(), zona));
    await cargar();
  }

  function empezarAAnadir(act: Actividad) {
    setEligiendo(false);
    // Se propone la hora siguiente a lo último del día, que casi siempre es
    // donde la persona quiere ponerlo.
    const ultimo = delDia[delDia.length - 1];
    setInicio(ultimo ? aHora(aMinutos(ultimo.hora_fin)) : '08:00');
    setAnadiendo(act);
  }

  async function confirmarAnadir() {
    const act = anadiendo;
    if (!act) return;
    setAnadiendo(null);
    const persona = await repositorio.persona();
    await repositorio.guardarBloque({
      id: `rut-${dia}-${act.id}-${Date.now()}`,
      persona_id: persona.id,
      actividad_id: act.id,
      modo: 'escolar',
      dia_semana: dia,
      hora_inicio: inicio,
      hora_fin: aHora(aMinutos(inicio) + act.duracion_min),
      activo: true,
    });
    await repositorio.regenerarDia(fechaLocal(new Date(), zona));
    await cargar();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }} edges={['top']}>
      <Cabecera titulo="Tu rutina" />
      <ScrollView style={{ backgroundColor: p.papel }} contentContainerStyle={e.cuerpo}>
      <Text style={[e.intro, { color: p.tintaSuave }]}>
        Esto es tu semana normal. La app la reparte en tus días — cambiar algo aquí
        cambia todos los {DIAS.find((d) => d.n === dia)!.plural} que vienen.
      </Text>

      <View style={e.dias}>
        {DIAS.map((d) => {
          const puesto = d.n === dia;
          return (
            <Pressable
              key={d.n}
              onPress={() => setDia(d.n)}
              role="tab"
              aria-selected={puesto}
              aria-label={d.largo}
              style={[
                e.diaBoton,
                puesto
                  ? { backgroundColor: p.alba, borderColor: p.alba }
                  : { backgroundColor: p.tarjeta, borderColor: p.linea },
              ]}
            >
              <Text style={[e.diaTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>{d.corto}</Text>
              {/* Cuántas cosas tiene cada día. Sin esto, mirar el sábado y no
                  ver el colegio se lee como que la rutina no se guardó. */}
              <Text style={[e.diaCuenta, { color: puesto ? 'rgba(255,255,255,0.75)' : p.tintaTenue }]}>
                {cuentaPorDia.get(d.n) ?? 0}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {delDia.length === 0 && (
        <View style={[e.vacioCaja, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
          <Text style={[e.vacioTitulo, { color: p.tinta }]}>
            El {DIAS.find((d) => d.n === dia)!.largo} lo tienes libre
          </Text>
          {conAlgo.length > 0 ? (
            <>
              <Text style={[e.vacioTexto, { color: p.tintaSuave }]}>
                Tu rutina sí está guardada: hay cosas puestas en{' '}
                {conAlgo.map((d) => d.plural).join(', ')}.
              </Text>
              <Pressable
                role="button"
                onPress={() => setDia(conAlgo[0].n)}
                style={[e.irA, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
              >
                <Text style={[e.irATexto, { color: p.alba }]}>
                  Ver los {conAlgo[0].plural} →
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={[e.vacioTexto, { color: p.tintaSuave }]}>
              Todavía no has puesto nada en ningún día. Empieza aquí abajo.
            </Text>
          )}
        </View>
      )}

      {delDia.map((b) => {
        const act = actividades.find((a) => a.id === b.actividad_id);
        if (!act) return null;
        return (
          <View
            key={b.id}
            style={[e.bloque, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
          >
            <View style={[e.raya, { backgroundColor: colorDeTipo(act.tipo, p) }]} />
            <View style={{ flex: 1 }}>
              <Text style={[e.nombre, { color: p.tinta }]}>{act.emoji}  {act.nombre}</Text>
              <Text style={[e.horas, { color: p.tintaTenue }]}>
                {b.hora_inicio} — {b.hora_fin}
                {act.es_fijo ? ' · anclada' : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => mover(b, -15)}
              aria-label={`Adelantar ${act.nombre} 15 minutos`}
              role="button"
              style={[e.mini, { borderColor: p.linea }]}
            >
              <Text style={{ color: p.tinta }}>−15</Text>
            </Pressable>
            <Pressable
              onPress={() => mover(b, 15)}
              aria-label={`Retrasar ${act.nombre} 15 minutos`}
              role="button"
              style={[e.mini, { borderColor: p.linea }]}
            >
              <Text style={{ color: p.tinta }}>+15</Text>
            </Pressable>
            <Pressable
              onPress={() => quitar(b)}
              aria-label={`Quitar ${act.nombre} del ${DIAS.find((d) => d.n === dia)!.largo}`}
              role="button"
              style={[e.mini, { borderColor: p.linea }]}
            >
              <Text style={{ color: p.fuego }}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        role="button"
        onPress={() => setEligiendo(true)}
        style={[e.anadir, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
      >
        <Text style={[e.anadirTexto, { color: p.alba }]}>
          + Añadir algo a este día
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={[e.listo, { backgroundColor: p.alba }]}
      >
        <Text style={e.listoTexto}>Listo</Text>
      </Pressable>

      {/* Elegir qué añadir */}
      <Modal visible={eligiendo} transparent animationType="slide" onRequestClose={() => setEligiendo(false)}>
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>¿Qué quieres añadir?</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {actividades.map((a) => (
                <Pressable
                  key={a.id}
                  role="button"
                  onPress={() => empezarAAnadir(a)}
                  style={[e.opcionAct, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
                >
                  <View style={[e.puntoTipo, { backgroundColor: colorDeTipo(a.tipo, p) }]} />
                  <Text style={[e.opcionTexto, { color: p.tinta }]}>{a.emoji}  {a.nombre}</Text>
                  <Text style={[e.opcionDur, { color: p.tintaTenue }]}>{a.duracion_min} min</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Navegar no cierra un Modal por sí solo: si no se baja antes, la
                hoja se queda flotando encima de la pantalla nueva. */}
            <Pressable
              role="button"
              aria-label="Crear una cosa nueva"
              onPress={() => { setEligiendo(false); router.push('/actividad'); }}
              style={[e.crearNueva, { borderColor: p.alba }]}
            >
              <Text style={[e.crearTexto, { color: p.alba }]}>+ Crear una cosa nueva</Text>
            </Pressable>

            <Pressable role="button" onPress={() => setEligiendo(false)} style={e.cerrar}>
              <Text style={[e.cerrarTexto, { color: p.tintaSuave }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Elegir a qué hora */}
      <Modal visible={anadiendo !== null} transparent animationType="fade" onRequestClose={() => setAnadiendo(null)}>
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>
              {anadiendo?.emoji}  {anadiendo?.nombre}
            </Text>
            <Text style={[e.hojaAyuda, { color: p.tintaSuave }]}>
              Dura {anadiendo?.duracion_min} min, así que acabaría a las{' '}
              {aHora(aMinutos(inicio) + (anadiendo?.duracion_min ?? 0))}.
            </Text>
            <SelectorHora etiqueta="Empieza a las" valor={inicio} onCambiar={setInicio} />
            <Pressable
              role="button"
              onPress={confirmarAnadir}
              style={[e.listo, { backgroundColor: p.alba, marginTop: 18 }]}
            >
              <Text style={e.listoTexto}>Añadir</Text>
            </Pressable>
            <Pressable role="button" onPress={() => setAnadiendo(null)} style={e.cerrar}>
              <Text style={[e.cerrarTexto, { color: p.tintaSuave }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}



const e = StyleSheet.create({
  cuerpo: { padding: 18, paddingBottom: 48, maxWidth: 620, width: '100%', alignSelf: 'center' },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  dias: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  diaBoton: {
    flex: 1, height: 50, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', gap: 1,
  },
  diaTexto: { fontSize: 15, fontWeight: '700' },
  diaCuenta: { fontSize: 10, fontVariant: ['tabular-nums'] },
  vacioCaja: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 18,
    marginBottom: 10, gap: 8,
  },
  vacioTitulo: { fontSize: 16, fontWeight: '700' },
  vacioTexto: { fontSize: 14, lineHeight: 20 },
  irA: {
    borderWidth: 1.5, borderRadius: 11, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  irATexto: { fontSize: 14.5, fontWeight: '700' },
  bloque: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8, overflow: 'hidden',
  },
  raya: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  nombre: { fontSize: 15, fontWeight: '600', marginLeft: 6 },
  horas: { fontSize: 12, marginTop: 2, marginLeft: 6, fontVariant: ['tabular-nums'] },
  mini: {
    minWidth: 38, height: 32, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  listo: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  listoTexto: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  anadir: {
    marginTop: 14, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed',
  },
  anadirTexto: { fontSize: 15.5, fontWeight: '700' },
  fondo: { flex: 1, backgroundColor: 'rgba(20,16,36,0.55)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
  hojaTitulo: { fontSize: 19, fontWeight: '700', marginBottom: 6 },
  hojaAyuda: { fontSize: 13.5, marginBottom: 16 },
  opcionAct: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 7,
  },
  puntoTipo: { width: 9, height: 9, borderRadius: 5 },
  opcionTexto: { flex: 1, fontSize: 15, fontWeight: '600' },
  opcionDur: { fontSize: 12 },
  crearNueva: {
    marginTop: 10, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed',
  },
  crearTexto: { fontSize: 15, fontWeight: '700' },
  cerrar: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  cerrarTexto: { fontSize: 15, fontWeight: '600' },
});
