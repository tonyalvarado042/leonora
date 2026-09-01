import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProveedorCelebracion } from '@/componentes/Celebracion';
import { recuperarSesion } from '@/lib/cuenta';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';

export default function Disposicion() {
  const p = usarPaleta();
  // La celebración se monta en la raíz para que caiga por encima de todo,
  // incluida la barra de navegación.
  const [activadas, setActivadas] = useState(true);

  /**
   * Nada se pinta hasta saber contra qué se guarda.
   *
   * Si se pintara antes, quien tiene cuenta vería un segundo el día del
   * teléfono —a veces vacío, a veces de otra persona— y luego cambiaría solo.
   * Ese parpadeo parece un fallo, y con los datos de otro sería uno de verdad.
   */
  const [listo, setListo] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        await recuperarSesion();
      } catch {
        // Sin red o con la sesión caducada se sigue con el teléfono: la app
        // tiene que abrir igual, no quedarse en una pantalla en blanco.
      }
      setActivadas((await repositorio.ajustes()).celebraciones);
      setListo(true);
    })();
  }, []);

  if (!listo) return <View style={{ flex: 1, backgroundColor: p.papel }} />;

  return (
    <ProveedorCelebracion activadas={activadas}>
      <StatusBar style={p.oscuro ? 'light' : 'dark'} />
      {/* Sin cabecera del navegador: cada pantalla pone la suya con
          <Cabecera>, porque la de react-navigation no pinta el botón de
          volver en web y la app se quedaba sin salida. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.papel } }} />
    </ProveedorCelebracion>
  );
}
