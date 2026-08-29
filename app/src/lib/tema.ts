/** Los colores y medidas de GraceDay, en claro y en oscuro. */

import { useColorScheme } from 'react-native';
import type { TipoActividad } from './tipos';

export interface Paleta {
  papel: string; tarjeta: string; tarjeta2: string;
  tinta: string; tintaSuave: string; tintaTenue: string;
  linea: string; lineaFuerte: string;
  alba: string; dia: string; tarde: string; verde: string; fuego: string; rosa: string;
  albaPiso: string; diaPiso: string; tardePiso: string;
  verdePiso: string; fuegoPiso: string;
  oscuro: boolean;
}

export const CLARO: Paleta = {
  papel: '#FAF8FB', tarjeta: '#FFFFFF', tarjeta2: '#F3F0F7',
  tinta: '#241F38', tintaSuave: '#655E7D', tintaTenue: '#918AA8',
  linea: '#E6E1EC', lineaFuerte: '#D3CCDD',
  alba: '#6C5CD4', dia: '#2A768F', tarde: '#C0743A',
  verde: '#3F8468', fuego: '#CF5734', rosa: '#B4497A',
  albaPiso: '#EFECFC', diaPiso: '#E5F1F5', tardePiso: '#F8EDE3',
  verdePiso: '#E6F2EC', fuegoPiso: '#FBEBE5',
  oscuro: false,
};

export const OSCURO: Paleta = {
  papel: '#17142A', tarjeta: '#1F1B36', tarjeta2: '#272242',
  tinta: '#EDE9F5', tintaSuave: '#A9A1C2', tintaTenue: '#7C7498',
  linea: '#322C4D', lineaFuerte: '#453D66',
  alba: '#A092F2', dia: '#63B6CF', tarde: '#E5A06A',
  verde: '#71C29C', fuego: '#F08661', rosa: '#E58CB4',
  albaPiso: '#272049', diaPiso: '#1B303B', tardePiso: '#3A2A1D',
  verdePiso: '#1B3830', fuegoPiso: '#3B2119',
  oscuro: true,
};

export function usarPaleta(): Paleta {
  return useColorScheme() === 'dark' ? OSCURO : CLARO;
}

/** El color de cada tipo de actividad. Es el único sistema que hay que
 *  aprenderse para leer la pantalla. */
export function colorDeTipo(tipo: TipoActividad, p: Paleta): string {
  switch (tipo) {
    case 'fe': return p.alba;
    case 'estudio': return p.dia;
    case 'casa': return p.tarde;
    case 'deporte': return p.verde;
    case 'familia': return p.fuego;
    case 'descanso': return p.tintaTenue;
  }
}

export const NOMBRE_TIPO: Record<TipoActividad, string> = {
  fe: 'Fe', estudio: 'Estudio', casa: 'Casa',
  deporte: 'Deporte', familia: 'Familia', descanso: 'Descanso',
};
