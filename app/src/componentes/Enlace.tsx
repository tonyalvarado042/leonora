import { Link } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';

interface Props {
  href: ComponentProps<typeof Link>['href'];
  estilo?: StyleProp<ViewStyle>;
  etiqueta?: string;
  children: ReactNode;
}

/**
 * Un `Link` que se puede tocar.
 *
 * En web, `Link asChild` acaba pasando el estilo al `<a>` del DOM, y un array
 * de estilos revienta ahí («Failed to set an indexed property»). Aplanarlo
 * antes lo evita, y como pasa por un solo sitio no hay que acordarse en cada
 * pantalla.
 */
export function Enlace({ href, estilo, etiqueta, children }: Props) {
  return (
    <Link href={href} asChild>
      <Pressable
        role="link"
        aria-label={etiqueta}
        style={StyleSheet.flatten(estilo)}
      >
        {children}
      </Pressable>
    </Link>
  );
}
