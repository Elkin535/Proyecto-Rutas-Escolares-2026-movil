import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';

import { Colors } from '../constants/Colors';
import { RutaColors } from '../styles/ruta.styles';
import { styles } from '../styles/disenador.styles';
import type { ParadaMapa } from './MapaRuta';

export interface DisenadorRutaProps {
  visible: boolean;
  // La última parada se trata como el colegio (destino) si su nombre empieza por "Colegio"
  paradasIniciales: ParadaMapa[];
  onCerrar: () => void;
  onGuardar: (paradas: ParadaMapa[]) => void;
}

type Resultado = { lat: string; lon: string; display_name: string };
type Info = { km: number; min: number };

const OSRM = 'https://router.project-osrm.org';
const BOGOTA = { latitude: 4.711, longitude: -74.0721, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const AMBAR = '#f59e0b';

const esColegio = (p?: ParadaMapa) => !!p && /^colegio/i.test(p.nombreParada);
const coordsOsrm = (ps: ParadaMapa[]) => ps.map(p => `${p.longitud},${p.latitud}`).join(';');
const geojsonALatLng = (g: { coordinates: number[][] }) => g.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

/**
 * Diseñador de rutas a pantalla completa. Las rutas se calculan con OSRM (perfil "driving" sobre
 * OpenStreetMap), que respeta los sentidos viales y giros prohibidos, y "Optimizar" resuelve el orden
 * más corto de las paradas (servicio trip) manteniendo fijos el punto de partida y el colegio.
 */
export default function DisenadorRuta({ visible, paradasIniciales, onCerrar, onGuardar }: DisenadorRutaProps) {
  const mapRef = useRef<MapView>(null);
  const [paradas, setParadas] = useState<ParadaMapa[]>([]);
  const [colegio, setColegio] = useState<ParadaMapa | null>(null);
  const [modo, setModo] = useState<'parada' | 'colegio'>('parada');
  const [trazo, setTrazo] = useState<LatLng[]>([]);
  const [info, setInfo] = useState<Info | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [optimizando, setOptimizando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Al abrir: se cargan las paradas existentes y se centra en ellas o en la ubicación del celular
  useEffect(() => {
    if (!visible) return;
    const ultima = paradasIniciales[paradasIniciales.length - 1];
    setColegio(esColegio(ultima) ? ultima : null);
    setParadas(esColegio(ultima) ? paradasIniciales.slice(0, -1) : paradasIniciales);
    setModo('parada');
    setMensaje('');
    setResultados([]);
    setBusqueda('');
    if (paradasIniciales.length === 0) {
      Location.requestForegroundPermissionsAsync()
        .then(({ granted }) => (granted ? Location.getCurrentPositionAsync({}) : null))
        .then(pos => pos && mapRef.current?.animateToRegion({ ...pos.coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const todos = colegio ? [...paradas, colegio] : paradas;
  const clave = coordsOsrm(todos);

  // Trazado vial en el orden actual (con espera corta para no saturar OSRM mientras se arrastra)
  useEffect(() => {
    if (todos.length < 2) {
      setTrazo([]);
      setInfo(null);
      return;
    }
    setCalculando(true);
    let vigente = true;
    const t = setTimeout(() => {
      fetch(`${OSRM}/route/v1/driving/${clave}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          const ruta = data.code === 'Ok' && data.routes?.[0];
          if (!vigente || !ruta) return;
          setTrazo(geojsonALatLng(ruta.geometry));
          setInfo({ km: ruta.distance / 1000, min: ruta.duration / 60 });
        })
        .catch(() => vigente && setMensaje('No se pudo calcular el recorrido. Revisa tu conexión.'))
        .finally(() => vigente && setCalculando(false));
    }, 400);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const agregar = (lat: number, lng: number, nombre?: string) => {
    if (modo === 'colegio') {
      setColegio({ latitud: lat, longitud: lng, nombreParada: nombre ? `Colegio ${nombre}` : 'Colegio' });
      setModo('parada');
    } else {
      setParadas(prev => [...prev, { latitud: lat, longitud: lng, nombreParada: nombre || `Parada ${prev.length + 1}` }]);
    }
    setMensaje('');
  };

  const mover = (i: number, coord: LatLng) =>
    i === paradas.length
      ? setColegio(c => c && { ...c, latitud: coord.latitude, longitud: coord.longitude })
      : setParadas(prev => prev.map((p, j) => (j === i ? { ...p, latitud: coord.latitude, longitud: coord.longitude } : p)));

  const intercambiar = (i: number, j: number) =>
    setParadas(prev => {
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  // OSRM trip: con roundtrip=false solo admite source=first y destination=last, por eso ambos quedan fijos
  const optimizar = async () => {
    if (todos.length < 4) return setMensaje('Agrega al menos 2 paradas intermedias para optimizar el orden.');
    setOptimizando(true);
    setMensaje('');
    try {
      const data = await fetch(
        `${OSRM}/trip/v1/driving/${clave}?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson`
      ).then(r => r.json());
      if (data.code !== 'Ok') throw new Error();
      const ordenados = todos
        .map((p, i) => ({ p, pos: data.waypoints[i].waypoint_index as number }))
        .sort((a, b) => a.pos - b.pos)
        .map(x => x.p);
      const nuevoKm = data.trips[0].distance / 1000;
      const ahorro = info ? info.km - nuevoKm : 0;
      setParadas(colegio ? ordenados.slice(0, -1) : ordenados);
      setMensaje(
        ahorro > 0.05
          ? `✅ Orden optimizado: ahorras ${ahorro.toFixed(1)} km por recorrido.`
          : '✅ El orden actual ya es el más corto.'
      );
    } catch {
      setMensaje('No se pudo optimizar ahora. Intenta de nuevo en unos segundos.');
    } finally {
      setOptimizando(false);
    }
  };

  // Geocodificación con Nominatim (OpenStreetMap); su política pide pocas peticiones, por eso se busca al enviar
  const buscar = async () => {
    const q = busqueda.trim();
    if (q.length < 3) return;
    Keyboard.dismiss();
    setBuscando(true);
    try {
      const data: Resultado[] = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=co&limit=6&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'SchoolTrack/1.0 (app de rutas escolares)', 'Accept-Language': 'es' } }
      ).then(r => r.json());
      setResultados(data);
      if (data.length === 0) setMensaje('No se encontró esa dirección. Prueba con barrio o ciudad.');
    } catch {
      setMensaje('No se pudo buscar la dirección.');
    } finally {
      setBuscando(false);
    }
  };

  const elegirResultado = (r: Resultado) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    agregar(lat, lng, r.display_name.split(',').slice(0, 2).join(',').trim());
    setResultados([]);
    setBusqueda('');
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  };

  const encuadrar = () => {
    const puntos = todos.map(p => ({ latitude: p.latitud, longitude: p.longitud }));
    if (puntos.length) {
      mapRef.current?.fitToCoordinates(puntos, { edgePadding: { top: 120, right: 60, bottom: 60, left: 60 }, animated: true });
    }
  };

  const guardar = () => {
    if (paradas.length === 0) return setMensaje('Agrega al menos una parada.');
    onGuardar(todos);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCerrar} accessibilityLabel="Cerrar diseñador">
            <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.title}>Diseñar recorrido</Text>
          <TouchableOpacity onPress={guardar} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Listo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={
              paradasIniciales[0]
                ? { latitude: paradasIniciales[0].latitud, longitude: paradasIniciales[0].longitud, latitudeDelta: 0.04, longitudeDelta: 0.04 }
                : BOGOTA
            }
            showsUserLocation
            userInterfaceStyle="dark"
            onPress={e => agregar(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          >
            {trazo.length > 0 && <Polyline coordinates={trazo} strokeColor={Colors.primary} strokeWidth={5} />}
            {todos.map((p, i) => {
              const esDestino = colegio && i === paradas.length;
              return (
                <Marker
                  key={`${i}-${p.latitud}-${p.longitud}`}
                  coordinate={{ latitude: p.latitud, longitude: p.longitud }}
                  title={p.nombreParada}
                  description="Mantén presionado y arrastra para mover"
                  draggable
                  onDragEnd={e => mover(i, e.nativeEvent.coordinate)}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.marker, i === 0 && styles.markerInicio, esDestino && styles.markerColegio]}>
                    {esDestino ? (
                      <Ionicons name="school" size={14} color={Colors.darker} />
                    ) : (
                      <Text style={[styles.markerText, i === 0 && { color: Colors.darker }]}>{i + 1}</Text>
                    )}
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Buscador de direcciones sobre el mapa */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.placeholder} />
              <TextInput
                style={styles.searchInput}
                placeholder={modo === 'colegio' ? 'Buscar el colegio…' : 'Buscar dirección de la parada…'}
                placeholderTextColor={Colors.placeholder}
                value={busqueda}
                onChangeText={setBusqueda}
                onSubmitEditing={buscar}
                returnKeyType="search"
              />
              {buscando && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            {resultados.map((r, i) => (
              <TouchableOpacity key={i} style={styles.result} onPress={() => elegirResultado(r)}>
                <Ionicons name="location-outline" size={16} color={Colors.primary} />
                <Text style={styles.resultText} numberOfLines={2}>{r.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modeRow}>
            {(['parada', 'colegio'] as const).map(m => (
              <TouchableOpacity key={m} style={[styles.modeButton, modo === m && styles.modeButtonActive]} onPress={() => setModo(m)}>
                <Ionicons name={m === 'parada' ? 'location' : 'school'} size={14} color={modo === m ? Colors.darker : Colors.darkText} />
                <Text style={[styles.modeText, modo === m && { color: Colors.darker }]}>
                  {m === 'parada' ? 'Agregar paradas' : colegio ? 'Mover colegio' : 'Ubicar colegio'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {todos.length > 0 && (
            <TouchableOpacity style={styles.fitButton} onPress={encuadrar} accessibilityLabel="Ver toda la ruta">
              <Ionicons name="scan-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {paradas.length} parada(s){colegio ? ' + colegio' : ''}
              </Text>
              <Text style={styles.summaryText}>
                {calculando ? 'Calculando por las vías…' : info ? `${info.km.toFixed(1)} km · ${Math.round(info.min)} min en carro` : 'Toca el mapa o busca una dirección'}
              </Text>
            </View>
            <TouchableOpacity style={styles.optimizeButton} onPress={optimizar} disabled={optimizando}>
              {optimizando ? <ActivityIndicator size="small" color={Colors.darker} /> : <Ionicons name="flash" size={16} color={Colors.darker} />}
              <Text style={styles.optimizeText}>Optimizar</Text>
            </TouchableOpacity>
          </View>
          {!!mensaje && <Text style={styles.message}>{mensaje}</Text>}

          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {paradas.length === 0 && !colegio && (
              <Text style={styles.hint}>
                1. Toca el mapa en el punto de partida y luego en cada parada, en orden.{'\n'}
                2. Usa “Ubicar colegio” para marcar el destino final.{'\n'}
                3. Pulsa “Optimizar” para que el sistema ordene las paradas por el camino más corto.
              </Text>
            )}
            {paradas.map((p, i) => (
              <View key={i} style={styles.stopRow}>
                <View style={[styles.marker, i === 0 && styles.markerInicio]}>
                  <Text style={[styles.markerText, i === 0 && { color: Colors.darker }]}>{i + 1}</Text>
                </View>
                <TextInput
                  style={styles.stopInput}
                  value={p.nombreParada}
                  onChangeText={t => setParadas(prev => prev.map((x, j) => (j === i ? { ...x, nombreParada: t } : x)))}
                />
                <TouchableOpacity onPress={() => intercambiar(i, i - 1)} disabled={i === 0} accessibilityLabel="Subir parada">
                  <Ionicons name="chevron-up" size={20} color={i === 0 ? RutaColors.muted : Colors.mutedText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => intercambiar(i, i + 1)} disabled={i === paradas.length - 1} accessibilityLabel="Bajar parada">
                  <Ionicons name="chevron-down" size={20} color={i === paradas.length - 1 ? RutaColors.muted : Colors.mutedText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setParadas(prev => prev.filter((_, j) => j !== i))} accessibilityLabel={`Quitar parada ${i + 1}`}>
                  <Ionicons name="close-circle-outline" size={22} color={RutaColors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            {colegio && (
              <View style={styles.stopRow}>
                <View style={[styles.marker, styles.markerColegio]}>
                  <Ionicons name="school" size={14} color={Colors.darker} />
                </View>
                <TextInput
                  style={styles.stopInput}
                  value={colegio.nombreParada}
                  // El nombre debe seguir empezando por "Colegio" para reconocerlo como destino al editar
                  onChangeText={t => setColegio({ ...colegio, nombreParada: /^colegio/i.test(t) ? t : `Colegio ${t}` })}
                />
                <TouchableOpacity onPress={() => setColegio(null)} accessibilityLabel="Quitar colegio">
                  <Ionicons name="close-circle-outline" size={22} color={RutaColors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          <Text style={[styles.hint, { marginTop: 6 }]}>
            <Text style={{ color: Colors.primary }}>●</Text> partida ·{' '}
            <Text style={{ color: AMBAR }}>●</Text> colegio · mantén presionado un marcador para moverlo
          </Text>
        </View>
      </View>
    </Modal>
  );
}
