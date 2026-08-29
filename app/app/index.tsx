import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { AnilloProgreso } from '@/componentes/AnilloProgreso';
import { Enlace } from '@/componentes/Enlace';
import { FilaTarea } from '@/componentes/FilaTarea';
import { TarjetaAhora } from '@/componentes/TarjetaAhora';
import { avisosDelDia } from '@/lib/avisos';
import { prepararAvisos, reprogramar } from '@/lib/avisosTelefono';
import { foco as calcularFoco, resumenAvance } from '@/lib/dia';
import { fechaLarga, fechaLocal, horaLocal } from '@/lib/fechas';
import { repositorio, type DiaCompleto } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Actividad, Ajustes, Persona } from '@/lib/tipos';

export default function Hoy() {
  const p = usarPaleta();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [dia, setDia] = useState<DiaCompleto | null>(null);
  // Se guarda el minuto para que «lo que toca ahora» se mueva solo con el reloj.
  const [ahora, setAhora] = useState(() => new Date());

  const zona = persona?.zona_horaria ?? 'America/Guatemala';
  const fecha = fechaLocal(ahora, zona);
  const hora = horaLocal(ahora, zona);

  const cargar = useCallback(async () => {
    const [pe, aj, ac] = await Promise.all([
      repositorio.persona(), repositorio.ajustes(), repositorio.actividades(),
    ]);
    setPersona(pe); setAjustes(aj); setActividades(ac);
    setDia(await repositorio.dia(fechaLocal(new Date(), pe.zona_horaria)));
  }, []);

  // Al volver de Rutina o Ajustes hay que releer: el día pudo cambiar.
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { void prepararAvisos(); }, []);

  // Cada vez que cambia lo pendiente se vuelve a dejar la agenda al día: así
  // marcar una tarea calla su alarma.
  useEffect(() => {
    if (!ajustes || !dia) return;
    void reprogramar(avisosDelDia({
      fecha: dia.dia.fecha, zonaHoraria: zona, ajustes, actividades,
      tareas: dia.tareas, ahora: new Date(),
    }));
  }, [ajustes, dia, actividades, zona]);

  const foco = useMemo(
    () => (dia ? calcularFoco(dia.tareas, hora) : null),
    [dia, hora],
  );

  const avisarAntes = useMemo(() => {
    if (!foco?.actual || !ajustes) return null;
    const act = actividades.find((a) => a.id === foco.actual!.actividad_id);
    if (act && !act.avisar) return null;
    return act?.avisar_antes_min ?? ajustes.avisar_antes_min;
  }, [foco, actividades, ajustes]);

  async function marcar(id: string, estado: 'hecha' | 'pendiente' | 'omitida') {
    setDia(await repositorio.marcarTarea(fecha, id, estado));
  }

  if (!persona || !ajustes || !dia || !foco) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.alba} />
      </SafeAreaView>
    );
  }

  const avance = resumenAvance(dia.tareas);

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={e.barra}>
          <View style={[e.avatar, { backgroundColor: p.albaPiso }]}>
            <Text style={e.avatarTexto}>{persona.avatar_valor}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[e.saludo, { color: p.tinta }]}>{saludo(hora)}, {persona.nombre}</Text>
            <Text style={[e.fecha, { color: p.tintaTenue }]}>{fechaLarga(fecha, zona)}</Text>
          </View>
          <Enlace
            href="/ajustes"
            etiqueta="Ajustes"
            estilo={[e.boton, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
          >
            <Text style={e.botonTexto}>⚙️</Text>
          </Enlace>
        </View>

        <TarjetaAhora foco={foco} avisarAntes={avisarAntes} />
        <AnilloProgreso hechas={avance.hechas} total={avance.total} />

        {dia.tareas.length === 0 ? (
          <View style={[e.vacio, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.vacioTitulo, { color: p.tinta }]}>Hoy no tienes nada puesto</Text>
            <Text style={[e.vacioTexto, { color: p.tintaSuave }]}>
              Arma tu semana una vez y la app te la reparte todos los días.
            </Text>
            <Enlace href="/rutina" estilo={[e.botonGrande, { backgroundColor: p.alba }]}>
              <Text style={e.botonGrandeTexto}>Armar mi rutina</Text>
            </Enlace>
          </View>
        ) : (
          dia.tareas.map((t) => (
            <FilaTarea
              key={t.id}
              tarea={t}
              esFoco={foco.enCurso && foco.actual?.id === t.id}
              onMarcar={() => marcar(t.id, t.estado === 'hecha' ? 'pendiente' : 'hecha')}
              onOmitir={() => marcar(t.id, t.estado === 'omitida' ? 'pendiente' : 'omitida')}
            />
          ))
        )}

        <Enlace href="/rutina" estilo={[e.enlace, { borderColor: p.linea }]}>
          <Text style={[e.enlaceTexto, { color: p.alba }]}>Editar mi rutina de la semana →</Text>
        </Enlace>

        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Toca para marcar. Mantén pulsado si te la saltaste.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function saludo(hora: string): string {
  const h = Number(hora.slice(0, 2));
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const e = StyleSheet.create({
  pantalla: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 18, paddingBottom: 48, maxWidth: 620, width: '100%', alignSelf: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 22 },
  saludo: { fontSize: 21, fontWeight: '700' },
  fecha: { fontSize: 13, marginTop: 2 },
  boton: {
    width: 40, height: 40, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  botonTexto: { fontSize: 17 },
  vacio: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 22, alignItems: 'center' },
  vacioTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  vacioTexto: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  botonGrande: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22 },
  botonGrandeTexto: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  enlace: {
    marginTop: 14, paddingVertical: 14, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  enlaceTexto: { fontSize: 15, fontWeight: '600' },
  pista: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
