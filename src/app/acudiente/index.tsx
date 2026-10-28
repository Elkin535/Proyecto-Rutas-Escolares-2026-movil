import { Ionicons } from '@expo/vector-icons';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import BottomNav from '../../components/BottomNav';
import MapaRuta from '../../components/MapaRuta';
import PerfilView from '../../components/PerfilView';
import { Colors } from '../../constants/Colors';
import { API_URL, getJson, getStoredAuthData } from '../../services/api';
import { registrarPush } from '../../services/push';
import {
  ESTADO_LABEL,
  distanciaKm,
  estadoDeViaje,
  ordenarPorParada,
  pillAsistencia,
  placaDeRuta,
  progresoRuta,
  viajeDeHoy,
} from '../../services/ruta';
import { RutaColors, styles } from '../../styles/ruta.styles';

const TABS = [
  { key: 'inicio', label: 'Inicio', icon: 'home-outline' as const },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline' as const },
];

// La ubicación del bus llega por SignalR; el sondeo solo refresca asistencias y estado del viaje
const REFRESCO_MS = 30000;
const HUB_URL = `${API_URL.replace(/\/api$/, '')}/trackingHub`;

type RutaInfo = { ruta: any; paradas: any[]; ordenados: any[]; viaje: any; asistencias: any[] };

export default function AcudienteScreen() {
  const [tab, setTab] = useState('inicio');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [usuario, setUsuario] = useState<any>(null);
  const [acudiente, setAcudiente] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);
  const [rutasInfo, setRutasInfo] = useState<Record<number, RutaInfo>>({});

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
    cargarTodo().finally(() => setCargando(false));
    const id = setInterval(cargarTodo, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargarTodo]);

  // Una conexión por viaje activo: el evento RecibirUbicacion no trae el id del viaje
  const [buses, setBuses] = useState<Record<number, { latitude: number; longitude: number }>>({});
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

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>centro de control</Text>
        <Text style={styles.headerTitle}>{tab === 'inicio' ? `Hola, ${usuario?.nombre || 'acudiente'}` : 'MI PERFIL'}</Text>
      </View>

      {tab === 'perfil' ? (
        <PerfilView
          usuario={usuario}
          extras={[
            { icon: 'home-outline', label: 'Dirección', value: acudiente?.direccionResidencia || '-' },
            { icon: 'people-outline', label: 'Estudiantes a cargo', value: String(hijos.length) },
          ]}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {hijos.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={40} color={Colors.placeholder} />
              <Text style={styles.emptyText}>No tienes estudiantes registrados.{'\n'}Contacta al administrador.</Text>
            </View>
          )}

          {hijos.map(e => {
            const info = e.idRuta ? rutasInfo[e.idRuta] : undefined;
            const nombre = `${e.nombre} ${e.apellido || ''}`.trim();

            if (!info) {
              return (
                <View key={e.idEstudiante} style={styles.card}>
                  <Text style={styles.name}>{nombre}</Text>
                  <Text style={styles.mutedText}>{e.colegio || 'Sin colegio'}</Text>
                  <Text style={[styles.mutedText, { marginTop: 8 }]}>Sin ruta asignada.</Text>
                </View>
              );
            }

            const estado = estadoDeViaje(info.viaje);
            const { busIndex } = progresoRuta(estado, info.paradas, info.ordenados, info.asistencias);
            const asistencia = info.asistencias.find(a => a.idEstudiante === e.idEstudiante);
            const pill = estado === 'sin-iniciar' ? { text: 'El recorrido no ha iniciado', color: Colors.mutedText } : pillAsistencia(asistencia);
            const miParada = info.paradas.findIndex(p => p.idParada === e.idParada);
            const faltan = miParada - busIndex;
            const bus =
              estado !== 'en-curso' ? null
              : buses[info.viaje.idViaje] ||
                (info.viaje.latitudActual != null
                  ? { latitude: Number(info.viaje.latitudActual), longitude: Number(info.viaje.longitudActual) }
                  : null);
            const parada = info.paradas[miParada];
            const km = bus && parada ? distanciaKm(bus.latitude, bus.longitude, Number(parada.latitud), Number(parada.longitud)) : null;
            const esperando = estado === 'en-curso' && asistencia?.estadoAbordaje === 'Pendiente';

            const chip =
              esperando && km != null && km < 0.5
                ? { text: `¡El bus está llegando a tu parada!`, color: '#f59e0b' }
                : esperando && km != null
                  ? { text: `El bus está a ${km.toFixed(1)} km de tu parada`, color: Colors.primary }
                : esperando && faltan > 0
                  ? { text: `El bus está a ${faltan} parada(s) de ${e.nombre}`, color: Colors.primary }
                : estado === 'en-curso'
                  ? { text: 'Bus en movimiento', color: RutaColors.success }
                  : { text: `Recorrido ${ESTADO_LABEL[estado].toLowerCase()}`, color: estado === 'finalizado' ? RutaColors.success : Colors.mutedText };

            return (
              <View key={e.idEstudiante}>
                <View style={[styles.card, styles.row]}>
                  <View style={styles.avatar}>
                    <Ionicons name="school-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{nombre}</Text>
                    <Text style={styles.accentText}>{info.ruta?.nombreRuta}</Text>
                    <Text style={styles.mutedText}>
                      {info.paradas[miParada]?.nombreParada || 'Sin parada'} · {e.colegio || 'Sin colegio'}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: `${pill.color}22` }]}>
                      <Text style={[styles.pillText, { color: pill.color }]}>{pill.text}</Text>
                    </View>
                  </View>
                </View>
                <MapaRuta paradas={info.paradas} bus={bus} destacada={miParada}>
                  <View style={styles.mapOverlayTop}>
                    <View style={[styles.chip, { marginBottom: 0 }]}>
                      <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                      <Text style={{ color: chip.color, fontSize: 13, fontWeight: '600' }}>{chip.text}</Text>
                    </View>
                  </View>
                  <View style={styles.mapOverlayBottom}>
                    <View style={[styles.chip, { marginBottom: 0 }]}>
                      <Ionicons name="bus-outline" size={14} color={Colors.darkText} />
                      <Text style={{ color: Colors.darkText, fontSize: 13, fontWeight: '600' }}>
                        Placa {placaDeRuta(info.ruta?.descripcion) || '-'}
                      </Text>
                    </View>
                  </View>
                </MapaRuta>
              </View>
            );
          })}
        </ScrollView>
      )}

      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}
