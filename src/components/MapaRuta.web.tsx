import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { styles } from '../styles/ruta.styles';
import type { MapaRutaProps, MapaRutaRef } from './MapaRuta';

// react-native-maps no funciona en navegador: en web se muestra un aviso y las paradas en texto
const MapaRuta = forwardRef<MapaRutaRef, MapaRutaProps>(function MapaRuta(
  { paradas, onPress, height = 260, style, children }: MapaRutaProps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ref
) {
  const boxStyle: any = height != null ? { height } : { flex: 1 };
  return (
    <View style={[styles.mapBox, boxStyle, style, { alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
      {children}
      <Ionicons name="map-outline" size={36} color={Colors.placeholder} />
      <Text style={[styles.emptyText, { marginTop: 8 }]}>
        {onPress
          ? 'Para ubicar paradas en el mapa abre la app en Expo Go.'
          : `El mapa se ve en la app móvil (Expo Go).\n${paradas.length} parada(s) en esta ruta.`}
      </Text>
    </View>
  );
});

export default MapaRuta;
