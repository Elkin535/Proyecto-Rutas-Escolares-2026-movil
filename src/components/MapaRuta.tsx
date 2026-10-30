import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';

import { Colors } from '../constants/Colors';
import { styles } from '../styles/ruta.styles';

export type ParadaMapa = { latitud: number; longitud: number; nombreParada: string };

export interface MapaRutaProps {
  paradas: ParadaMapa[];
  bus?: LatLng | null;
  // Índice de la parada del hijo (acudiente), se pinta en ámbar como en la web
  destacada?: number;
  // Diseñador de rutas: cada toque en el mapa agrega una parada
  onPress?: (coord: LatLng) => void;
  // Distancia y duración que calcula OSRM para el trazo
  onRuta?: (info: { distanciaKm: string; duracionMin: number } | null) => void;
  height?: number;
  children?: ReactNode;
}

const BOGOTA = { latitude: 4.711, longitude: -74.0721, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const AMBAR = '#f59e0b';

// Tema oscuro para Google Maps (Android); en iOS se usa userInterfaceStyle
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f1b30' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#081120' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2f4f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06101f' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function MapaRuta({ paradas, bus, destacada, onPress, onRuta, height = 260, children }: MapaRutaProps) {
  const mapRef = useRef<MapView>(null);
  const [trazo, setTrazo] = useState<LatLng[]>([]);
  const coords = paradas.map(p => ({ latitude: Number(p.latitud), longitude: Number(p.longitud) }));
  const clave = coords.map(c => `${c.longitude},${c.latitude}`).join(';');

  // Misma lógica que la web: ruta vial con OSRM cuando hay 2 o más paradas
  useEffect(() => {
    if (coords.length < 2) {
      setTrazo([]);
      onRuta?.(null);
      return;
    }
    let vigente = true;
    fetch(`https://router.project-osrm.org/route/v1/driving/${clave}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        const ruta = data.code === 'Ok' && data.routes?.[0];
        if (!vigente || !ruta) return;
        setTrazo(ruta.geometry.coordinates.map(([lng, lat]: number[]) => ({ latitude: lat, longitude: lng })));
        onRuta?.({ distanciaKm: (ruta.distance / 1000).toFixed(1), duracionMin: Math.round(ruta.duration / 60) });
      })
      .catch(() => setTrazo([]));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const centrar = () => {
    const puntos = bus ? [...coords, bus] : coords;
    if (puntos.length) {
      mapRef.current?.fitToCoordinates(puntos, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Al cargar las paradas por primera vez se encuadra toda la ruta (no en el diseñador, para no saltar)
  useEffect(() => {
    if (!onPress) centrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return (
    <View style={[styles.mapBox, { height }]}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={coords[0] ? { ...coords[0], latitudeDelta: 0.05, longitudeDelta: 0.05 } : BOGOTA}
        customMapStyle={MAP_STYLE}
        userInterfaceStyle="dark"
        showsUserLocation={!!onPress}
        onPress={onPress ? e => onPress(e.nativeEvent.coordinate) : undefined}
      >
        {trazo.length > 0 && <Polyline coordinates={trazo} strokeColor={Colors.primary} strokeWidth={5} />}
        {coords.map((c, i) => (
          <Marker key={`${i}-${clave}`} coordinate={c} title={paradas[i].nombreParada} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.mapStop, i === destacada && { borderColor: AMBAR, backgroundColor: AMBAR }]}>
              <Text style={[styles.mapStopText, i === destacada && { color: Colors.darker }]}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
        {bus && (
          <Marker coordinate={bus} title="Bus escolar" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.mapBus}>
              <Ionicons name="bus" size={18} color={Colors.darker} />
            </View>
          </Marker>
        )}
      </MapView>

      {children}

      {(coords.length > 0 || bus) && (
        <TouchableOpacity style={styles.mapButton} onPress={centrar} accessibilityLabel="Centrar mapa en la ruta">
          <Ionicons name="locate-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
