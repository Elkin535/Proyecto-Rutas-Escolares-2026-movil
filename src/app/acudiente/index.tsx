import { Ionicons } from '@expo/vector-icons';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import BottomNav from '../../components/BottomNav';
import MapaRuta, { MapaRutaRef } from '../../components/MapaRuta';
import MenuUsuario from '../../components/MenuUsuario';
import PanelEstudianteBottomSheet from '../../components/PanelEstudianteBottomSheet';
import PerfilView from '../../components/PerfilView';
import { Colors } from '../../constants/Colors';
import { API_URL, getJson, getStoredAuthData } from '../../services/api';
import { registrarPush } from '../../services/push';
import {
  InfoEta,
  calcularEta,
  estadoDeViaje,
  ordenarPorParada,
  placaDeRuta,
  progresoRuta,
  viajeDeHoy,
} from '../../services/ruta';
import { RutaColors, styles } from '../../styles/ruta.styles';

const TABS = [
  { key: 'inicio', label: 'Inicio', icon: 'home-outline' as const },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline' as const },
];

const REFRESCO_MS = 30000;
const HUB_URL = `${API_URL.replace(/\/api$/, '')}/trackingHub`;

type RutaInfo = { ruta: any; paradas: any[]; ordenados: any[]; viaje: any; asistencias: any[] };

export default function AcudienteScreen() {
  const mapaRef = useRef<MapaRutaRef>(null);
  const [tab, setTab] = useState('inicio');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [usuario, setUsuario] = useState<any>(null);
  const [acudiente, setAcudiente] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);
  const [rutasInfo, setRutasInfo] = useState<Record<number, RutaInfo>>({});

  // Ubicación en tiempo real del bus por cada viaje activo
  const [buses, setBuses] = useState<Record<number, { latitude: number; longitude: number }>>({});
  const [infoEta, setInfoEta] = useState<InfoEta | null>(null);

  const cargarTodo = useCallback(async () => {
    const { usuario: u } = await getStoredAuthData();
    setUsuario(u);

    const [acudientes, rutas, vehiculos, historial, todos] = await Promise.all([
      getJson('/Acudiente/obtener-todos'),
      getJson('/Ruta/obtener-todas'),
      getJson('/Vehiculo/obtener-todos'),
      getJson('/Historial/obtener-todos'),
      getJson('/Estudiante/obtener-todos'),
    ]);

    const acu = acudientes.find((a: any) => a.idUsuario === u?.idUsuario) || null;
    const misHijos = acu ? todos.filter((e: any) => e.idAcudiente === acu.idAcudiente) : [];

    // Una consulta por ruta distinta, aunque varios hijos compartan bus
    const idsRuta = [...new Set<number>(misHijos.map((e: any) => e.idRuta).filter(Boolean))];
    const infos = await Promise.all(
      idsRuta.map(async (idRuta): Promise<[number, RutaInfo]> => {
        const ruta = rutas.find((r: any) => r.idRuta === idRuta);
        const paradas: any[] = await getJson(`/Parada/obtener-por-ruta?idRuta=${idRuta}`);
        paradas.sort((a, b) => a.ordenVisita - b.ordenVisita);
        const idVehiculo = vehiculos.find((v: any) => v.placa === placaDeRuta(ruta?.descripcion))?.idVehiculo;
        const viaje = idVehiculo ? viajeDeHoy(historial, h => h.idVehiculo === idVehiculo) : null;
        const asistencias = viaje ? await getJson(`/AsistenciaViaje/obtener-viaje?idViaje=${viaje.idViaje}`) : [];
        const ordenados = ordenarPorParada(todos.filter((e: any) => e.idRuta === idRuta), paradas);
        return [idRuta, { ruta, paradas, ordenados, viaje, asistencias }];
      })
    );

    setAcudiente(acu);
    setHijos(misHijos);
    setRutasInfo(Object.fromEntries(infos));
  }, []);

  useEffect(() => {
    registrarPush();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarTodo().finally(() => setCargando(false));
    const id = setInterval(cargarTodo, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargarTodo]);

  // Conexión SignalR por viaje activo para recibir ubicación en vivo del bus
  const viajesActivos = Object.values(rutasInfo)
    .filter(i => i.viaje?.estadoViaje === 'En progreso')
    .map(i => i.viaje.idViaje as number)
    .join(',');

  useEffect(() => {
    if (!viajesActivos) return;
    const conexiones = viajesActivos.split(',').map(Number).map(idViaje => {
      const conn = new HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: async () => (await getStoredAuthData()).token || '' })
        .withAutomaticReconnect()
        .build();
      conn.on('RecibirUbicacion', ({ latitud, longitud }) =>
        setBuses(prev => ({ ...prev, [idViaje]: { latitude: Number(latitud), longitude: Number(longitud) } }))
      );
      conn
        .start()
        .then(() => conn.invoke('SuscribirseAlViaje', idViaje))
        .catch(err => console.warn('SignalR no disponible, se usa el sondeo:', err?.message));
      return conn;
    });
    return () => conexiones.forEach(c => c.stop());
  }, [viajesActivos]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarTodo();
    setRefrescando(false);
  };

  // Estudiante a cargo y su información de ruta
  const estudianteActivo = hijos[0] || null;
  const infoActiva = estudianteActivo?.idRuta ? rutasInfo[estudianteActivo.idRuta] : undefined;

  const estado = estadoDeViaje(infoActiva?.viaje);
  const bus =
    estado !== 'en-curso'
      ? null
      : (infoActiva?.viaje?.idViaje && buses[infoActiva.viaje.idViaje]) ||
        (infoActiva?.viaje?.latitudActual != null
          ? { latitude: Number(infoActiva.viaje.latitudActual), longitude: Number(infoActiva.viaje.longitudActual) }
          : null);

  const miParadaIndex =
    infoActiva?.paradas && estudianteActivo
      ? infoActiva.paradas.findIndex(p => p.idParada === estudianteActivo.idParada)
      : -1;

  const placa = placaDeRuta(infoActiva?.ruta?.descripcion);

  // Recálculo dinámico de ETA en tiempo real
  useEffect(() => {
    if (!bus || !infoActiva || estado !== 'en-curso' || !estudianteActivo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInfoEta(null);
      return;
    }

    const { busIndex } = progresoRuta(
      estado,
      infoActiva.paradas,
      infoActiva.ordenados,
      infoActiva.asistencias
    );
    const asistencia = infoActiva.asistencias.find(
      a => a.idEstudiante === estudianteActivo.idEstudiante
    );
    const abordo = asistencia?.estadoAbordaje === 'Abordo';

    // Si ya abordó, el destino es la última parada (colegio o terminal); si no, su parada asignada
    const destinoIndex = abordo ? infoActiva.paradas.length - 1 : miParadaIndex;
    const destinoParada = infoActiva.paradas[destinoIndex];

    if (!destinoParada) {
      setInfoEta(null);
      return;
    }

    const paradasIntermedias = Math.max(0, destinoIndex - busIndex - 1);
    const destinoCoord = {
      latitude: Number(destinoParada.latitud),
      longitude: Number(destinoParada.longitud),
    };

    let vigente = true;
    calcularEta(bus, destinoCoord, paradasIntermedias)
      .then(eta => {
        if (vigente) setInfoEta(eta);
      })
      .catch(() => {
        if (vigente) setInfoEta(null);
      });

    return () => {
      vigente = false;
    };
  }, [
    bus?.latitude,
    bus?.longitude,
    estudianteActivo?.idEstudiante,
    estudianteActivo?.idParada,
    infoActiva,
    estado,
    miParadaIndex,
  ]);

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera superior común */}
      <View style={styles.header}>
        <Text style={styles.headerKicker}>centro de control</Text>
        <Text style={styles.headerTitle}>
          {tab === 'inicio' ? `Hola, ${usuario?.nombre || 'acudiente'}` : 'MI PERFIL'}
        </Text>
        <View style={styles.headerMenu}>
          <MenuUsuario usuario={usuario} rol="Acudiente" />
        </View>
      </View>

      {tab === 'perfil' ? (
        <PerfilView
          usuario={usuario}
          extras={[
            { icon: 'home-outline', label: 'Dirección', value: acudiente?.direccionResidencia || '-' },
            { icon: 'people-outline', label: 'Estudiantes a cargo', value: String(hijos.length) },
          ]}
        />
      ) : hijos.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={40} color={Colors.placeholder} />
            <Text style={styles.emptyText}>
              No tienes estudiantes registrados.{'\n'}Contacta al administrador.
            </Text>
          </View>
        </ScrollView>
      ) : (
        /* Vista de Monitoreo en Tiempo Real: Mapa con Bus Animado + Bottom Sheet */
        <View style={localStyles.mapAreaContainer}>
          {/* Mapa con Bus Animado e itinerario */}
          <MapaRuta
            ref={mapaRef}
            paradas={infoActiva?.paradas || []}
            bus={bus}
            placaBus={placa}
            animarBus={true}
            destacada={miParadaIndex}
            height="100%"
            style={localStyles.mapView}
          >
            {/* Overlay superior con indicador de estado en vivo */}
            <View style={localStyles.topOverlay}>
              <View style={localStyles.liveIndicatorBadge}>
                <View
                  style={[
                    localStyles.liveDot,
                    { backgroundColor: estado === 'en-curso' ? '#22c55e' : '#94a3b8' },
                  ]}
                />
                <Text style={localStyles.liveText}>
                  {estado === 'en-curso' ? 'SEGUIMIENTO EN VIVO' : 'RUTA INACTIVA'}
                </Text>
              </View>

              <TouchableOpacity
                style={localStyles.refreshBtn}
                onPress={onRefresh}
                accessibilityLabel="Refrescar datos"
              >
                <Ionicons
                  name={refrescando ? 'sync' : 'refresh-outline'}
                  size={18}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
          </MapaRuta>

          {/* Panel Flotante Deslizable (Bottom Sheet) */}
          <PanelEstudianteBottomSheet
            estudiante={estudianteActivo}
            infoRuta={infoActiva}
            bus={bus}
            infoEta={infoEta}
            onCentrarBus={() => mapaRef.current?.centrarEnBus()}
            onCentrarParada={() => {
              if (miParadaIndex >= 0) mapaRef.current?.centrarEnParada(miParadaIndex);
            }}
            onCentrarRuta={() => mapaRef.current?.centrar()}
          />
        </View>
      )}

      {/* Barra de navegación inferior */}
      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  mapAreaContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  mapView: {
    flex: 1,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 17, 32, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(8, 17, 32, 0.85)',
    borderWidth: 1,
    borderColor: RutaColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
