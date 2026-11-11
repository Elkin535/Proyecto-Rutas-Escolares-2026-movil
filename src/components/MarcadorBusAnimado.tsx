import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LatLng, Marker } from 'react-native-maps';

import { Colors } from '../constants/Colors';
import { calcularRumbo } from '../services/ruta';

interface MarcadorBusAnimadoProps {
  bus: LatLng;
  placa?: string;
  duracionAnimacion?: number; // ms para interpolar el movimiento suave (default 1800ms)
}

export default function MarcadorBusAnimado({
  bus,
  placa,
  duracionAnimacion = 1800,
}: MarcadorBusAnimadoProps) {
  const [coordActual, setCoordActual] = useState<LatLng>(bus);
  const prevCoordRef = useRef<LatLng>(bus);
  const targetCoordRef = useRef<LatLng>(bus);

  // Animaciones memoizadas para compatibilidad estricta con React 19
  const animProgress = useMemo(() => new Animated.Value(1), []);
  const rotacionAnim = useMemo(() => new Animated.Value(0), []);
  const escalaPulso = useMemo(() => new Animated.Value(1), []);
  const opacidadPulso = useMemo(() => new Animated.Value(0.7), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(escalaPulso, {
            toValue: 2.3,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(escalaPulso, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacidadPulso, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(opacidadPulso, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [escalaPulso, opacidadPulso]);

  // Listener para calcular coordenadas interpoladas a 60 fps
  useEffect(() => {
    const listenerId = animProgress.addListener(({ value }) => {
      const p = prevCoordRef.current;
      const t = targetCoordRef.current;
      setCoordActual({
        latitude: p.latitude + (t.latitude - p.latitude) * value,
        longitude: p.longitude + (t.longitude - p.longitude) * value,
      });
    });

    return () => {
      animProgress.removeListener(listenerId);
    };
  }, [animProgress]);

  // Cuando cambian las coordenadas del bus
  useEffect(() => {
    const prev = targetCoordRef.current;
    const cambioSignificativo =
      Math.abs(bus.latitude - prev.latitude) > 0.00001 ||
      Math.abs(bus.longitude - prev.longitude) > 0.00001;

    if (cambioSignificativo) {
      const nuevoRumbo = calcularRumbo(
        prev.latitude,
        prev.longitude,
        bus.latitude,
        bus.longitude
      );

      Animated.timing(rotacionAnim, {
        toValue: nuevoRumbo,
        duration: 400,
        useNativeDriver: false,
      }).start();

      prevCoordRef.current = coordActual;
      targetCoordRef.current = bus;

      animProgress.stopAnimation();
      animProgress.setValue(0);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: duracionAnimacion,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [bus.latitude, bus.longitude, animProgress, coordActual, duracionAnimacion, rotacionAnim]);

  const rotacionInterpolada = rotacionAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Marker
      coordinate={coordActual}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={false}
      tracksViewChanges={true}
    >
      <View style={styles.container}>
        {/* Onda expansiva de señal GPS activa */}
        <Animated.View
          style={[
            styles.pulso,
            {
              transform: [{ scale: escalaPulso }],
              opacity: opacidadPulso,
            },
          ]}
        />

        {/* Halo secundario suave */}
        <View style={styles.halo} />

        {/* Contenedor rotatorio del bus con flecha direccional */}
        <Animated.View
          style={[
            styles.busWrapper,
            { transform: [{ rotate: rotacionInterpolada }] },
          ]}
        >
          {/* Pequeño puntero frontal indicando la dirección del recorrido */}
          <View style={styles.punteroDireccion} />
          <View style={styles.busIcono}>
            <Ionicons name="bus" size={20} color="#081120" />
          </View>
        </Animated.View>

        {/* Placa o badge de transmisión en vivo */}
        <View style={styles.badgePlaca}>
          <View style={styles.dotVivo} />
          <Text style={styles.placaTexto}>{placa ? placa : 'EN VIVO'}</Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  pulso: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 212, 255, 0.45)',
  },
  halo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 212, 255, 0.4)',
  },
  busWrapper: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punteroDireccion: {
    position: 'absolute',
    top: -3,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary,
  },
  busIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  badgePlaca: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#081120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.5)',
  },
  dotVivo: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  placaTexto: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
