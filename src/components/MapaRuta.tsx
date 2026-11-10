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
  // Modo navegación (conductor en recorrido): ruta óptima desde el bus por las paradas que faltan
  navegacion?: { origen: LatLng; pendientes: number[] } | null;
  onPlan?: (plan: PlanRuta | null) => void;
  height?: number;
  children?: ReactNode;
}

export type PlanRuta = {
  orden: number[]; // índices de las paradas en el orden óptimo de visita
  siguiente: number; // índice de la próxima parada
  siguienteKm: string;
  siguienteMin: number;
  totalKm: string;
  totalMin: number;
};

const OSRM = 'https://router.project-osrm.org';
// Se recalcula la ruta cuando el bus se mueve ~100 m (3 decimales), no en cada lectura del GPS
const redondear = (n: number) => n.toFixed(3);

const aLatLng = (geometria: { coordinates: number[][] }) =>
  geometria.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

/**
 * Calcula con OSRM el orden óptimo para recorrer las paradas pendientes saliendo desde el bus.
 * La última parada pendiente queda fija como destino (normalmente el colegio).
 */
async function planificar(origen: LatLng, paradas: LatLng[], pendientes: number[]) {
  const puntos = [origen, ...pendientes.map(i => paradas[i])];
  const coords = puntos.map(p => `${p.longitude},${p.latitude}`).join(';');
  const params = 'overview=full&geometries=geojson';

  if (pendientes.length === 1) {
    const data = await (await fetch(`${OSRM}/route/v1/driving/${coords}?${params}`)).json();
    const r = data.code === 'Ok' && data.routes?.[0];
    if (!r) return null;
    return { trazo: aLatLng(r.geometry), orden: pendientes, primerTramo: r.legs[0], total: r };
  }

  const url = `${OSRM}/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&${params}`;
  const data = await (await fetch(url)).json();
  const viaje = data.code === 'Ok' && data.trips?.[0];
  if (!viaje) return null;
  // waypoints[i].waypoint_index = posición del punto i dentro del recorrido optimizado
  const orden = pendientes
    .map((indiceParada, i) => ({ indiceParada, posicion: data.waypoints[i + 1].waypoint_index }))
    .sort((a, b) => a.posicion - b.posicion)
    .map(x => x.indiceParada);
  return { trazo: aLatLng(viaje.geometry), orden, primerTramo: viaje.legs[0], total: viaje };
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

export default function MapaRuta({
  paradas,
  bus,
  destacada,
  onPress,
  onRuta,
  navegacion,
  onPlan,
  height = 260,
  children,
}: MapaRutaProps) {
  const mapRef = useRef<MapView>(null);
  const [trazo, setTrazo] = useState<LatLng[]>([]);
  const [trazoPlan, setTrazoPlan] = useState<LatLng[]>([]);
  const [siguiente, setSiguiente] = useState<number | null>(null);
  const coords = paradas.map(p => ({ latitude: Number(p.latitud), longitude: Number(p.longitud) }));
  const clave = coords.map(c => `${c.longitude},${c.latitude}`).join(';');

  const pendientes = navegacion?.pendientes ?? [];
  const clavePlan = navegacion
    ? `${redondear(navegacion.origen.latitude)},${redondear(navegacion.origen.longitude)}|${pendientes.join(',')}|${clave}`
    : '';

  // Modo navegación: ruta óptima desde el bus por las paradas pendientes
  useEffect(() => {
    if (!navegacion || pendientes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrazoPlan([]);
      setSiguiente(null);
      onPlan?.(null);
      return;
    }
    let vigente = true;
    planificar(navegacion.origen, coords, pendientes)
      .then(plan => {
        if (!vigente) return;
        if (!plan) {
          setTrazoPlan([]);
          setSiguiente(null);
          onPlan?.(null);
          return;
        }
        setTrazoPlan(plan.trazo);
        setSiguiente(plan.orden[0]);
        onPlan?.({
          orden: plan.orden,
          siguiente: plan.orden[0],
          siguienteKm: (plan.primerTramo.distance / 1000).toFixed(1),
          siguienteMin: Math.max(1, Math.round(plan.primerTramo.duration / 60)),
          totalKm: (plan.total.distance / 1000).toFixed(1),
          totalMin: Math.max(1, Math.round(plan.total.duration / 60)),
        });
      })
      .catch(() => {
        if (vigente) setTrazoPlan([]);
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePlan]);

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
        {/* Con ruta óptima activa, la ruta completa queda tenue de fondo y se resalta el camino a seguir */}
        {trazo.length > 0 && (
          <Polyline
            coordinates={trazo}
            strokeColor={trazoPlan.length ? 'rgba(0, 212, 255, 0.25)' : Colors.primary}
            strokeWidth={trazoPlan.length ? 4 : 5}
          />
        )}
        {trazoPlan.length > 0 && <Polyline coordinates={trazoPlan} strokeColor={Colors.primary} strokeWidth={6} />}
        {coords.map((c, i) => {
          const esSiguiente = i === siguiente;
          const visitada = !!navegacion && !pendientes.includes(i);
          const resaltada = i === destacada || esSiguiente;
          return (
            <Marker
              key={`${i}-${clave}-${esSiguiente ? 's' : visitada ? 'v' : 'p'}`}
              coordinate={c}
              title={paradas[i].nombreParada}
              description={esSiguiente ? 'Siguiente parada' : visitada ? 'Ya visitada' : undefined}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.mapStop,
                  visitada && { opacity: 0.4 },
                  resaltada && { borderColor: AMBAR, backgroundColor: AMBAR },
                ]}
              >
                {visitada ? (
                  <Ionicons name="checkmark" size={14} color={Colors.primary} />
                ) : (
                  <Text style={[styles.mapStopText, resaltada && { color: Colors.darker }]}>{i + 1}</Text>
                )}
              </View>
            </Marker>
          );
        })}
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
