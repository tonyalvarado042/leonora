import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProveedorCelebracion } from '@/componentes/Celebracion';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';

export default function Disposicion() {
  const p = usarPaleta();
  // La celebración se monta en la raíz para que caiga por encima de todo,
  // incluida la barra de navegación.
  const [activadas, setActivadas] = useState(true);
  useEffect(() => {
    void repositorio.ajustes().then((a) => setActivadas(a.celebraciones));
  }, []);

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
