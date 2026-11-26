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
import PanelEstudianteBottomSheet, {
  RutaInfoExtendida,
  obtenerEstadoEstudiante,
} from '../../components/PanelEstudianteBottomSheet';
import PerfilView from '../../components/PerfilView';
import { Colors } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { API_URL, getJson, getStoredAuthData, safeStorage } from '../../services/api';
import { registrarPush } from '../../services/push';
import {
  InfoEta,
  calcularEta,
  conductorDeRuta,
  estadoDeViaje,
  ordenarPorParada,
  placaDeRuta,
  progresoRuta,
  telefonoDeRuta,
  viajeDeHoy,
} from '../../services/ruta';
import { RutaColors, styles } from '../../styles/ruta.styles';

const TABS = [
  { key: 'inicio', label: 'Inicio', icon: 'home-outline' as const },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline' as const },
];

const REFRESCO_MS = 30000;
const HUB_URL = `${API_URL.replace(/\/api$/, '')}/trackingHub`;

export default function AcudienteScreen() {
  const { colors } = useTheme();
  const mapaRef = useRef<MapaRutaRef>(null);
  const [tab, setTab] = useState('inicio');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [usuario, setUsuario] = useState<any>(null);
  const [acudiente, setAcudiente] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);
  const [idEstudianteSeleccionado, setIdEstudianteSeleccionado] = useState<number | null>(null);
  const [rutasInfo, setRutasInfo] = useState<Record<number, RutaInfoExtendida>>({});

  // Ubicación en tiempo real del bus por cada viaje activo
  const [buses, setBuses] = useState<Record<number, { latitude: number; longitude: number }>>({});
  const [infoEta, setInfoEta] = useState<InfoEta | null>(null);

  const cargarTodo = useCallback(async () => {
    const { usuario: u } = await getStoredAuthData();
    setUsuario(u);

    const [acudientes, rutas, vehiculos, conductores, usuariosApi, historial, todos] = await Promise.all([
      getJson('/Acudiente/obtener-todos'),
      getJson('/Ruta/obtener-todas'),
      getJson('/Vehiculo/obtener-todos'),
      getJson('/Conductor/obtener-todos'),
      getJson('/Usuario/obtener-todos'),
      getJson('/Historial/obtener-todos'),
      getJson('/Estudiante/obtener-todos'),
    ]);

    let usuarios: any[] = Array.isArray(usuariosApi) ? usuariosApi : [];
    if (usuarios.length > 0) {
      await safeStorage.setItem('usuarios_cache', JSON.stringify(usuarios)).catch(() => { });
    } else {
      const cached = await safeStorage.getItem('usuarios_cache').catch(() => null);
      if (cached) {
        try {
          usuarios = JSON.parse(cached);
        } catch {
          usuarios = [];
        }
      }
    }

    const idUsuActual = Number(u?.idUsuario ?? u?.id_usuario);
    const listaAcudientes = Array.isArray(acudientes) ? acudientes : [];
    const misRegistrosAcudiente = listaAcudientes.filter(
      (a: any) => Number(a.idUsuario ?? a.id_usuario) === idUsuActual
    );
    const acu = misRegistrosAcudiente[0] || null;
    const misAcudientesIds = new Set(
      misRegistrosAcudiente.map((a: any) => Number(a.idAcudiente ?? a.id_acudiente))
    );

    const listaEstudiantes = Array.isArray(todos) ? todos : [];
    const misHijos =
      misAcudientesIds.size > 0
        ? listaEstudiantes.filter((e: any) =>
          misAcudientesIds.has(Number(e.idAcudiente ?? e.id_acudiente))
        )
        : [];

    const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const conductoresOrdenados = Array.isArray(conductores)
      ? [...conductores].sort((a: any, b: any) => (b.idConductor || 0) - (a.idConductor || 0))
      : [];

    // Una consulta por ruta distinta, aunque varios hijos compartan bus
    const idsRuta = [...new Set<number>(misHijos.map((e: any) => e.idRuta).filter(Boolean))];
    const infos = await Promise.all(
      idsRuta.map(async (idRuta): Promise<[number, RutaInfoExtendida]> => {
        const ruta = (Array.isArray(rutas) ? rutas : []).find((r: any) => r.idRuta === idRuta);
        const paradas: any[] = await getJson(`/Parada/obtener-por-ruta?idRuta=${idRuta}`);
        paradas.sort((a, b) => a.ordenVisita - b.ordenVisita);

        const placaDesc = placaDeRuta(ruta?.descripcion);
        const vehiculo = (Array.isArray(vehiculos) ? vehiculos : []).find(
          (v: any) => norm(v.placa) === norm(placaDesc)
        );
        const idVehiculo = vehiculo?.idVehiculo;
        const viaje = idVehiculo
          ? viajeDeHoy(Array.isArray(historial) ? historial : [], h => h.idVehiculo === idVehiculo)
          : null;
        const asistencias = viaje
          ? await getJson(`/AsistenciaViaje/obtener-viaje?idViaje=${viaje.idViaje}`)
          : [];
        const ordenados = ordenarPorParada(
          listaEstudiantes.filter((e: any) => e.idRuta === idRuta),
          paradas
        );

        const nombreDesc = conductorDeRuta(ruta?.descripcion);
        const telDesc = telefonoDeRuta(ruta?.descripcion);
        const condObj =
          (viaje?.idConductor
            ? conductoresOrdenados.find((c: any) => c.idConductor === viaje.idConductor)
            : null) ||
          (idVehiculo
            ? conductoresOrdenados.find((c: any) => c.idVehiculo === idVehiculo)
            : null) ||
          (nombreDesc
            ? conductoresOrdenados.find((c: any) => {
              const uCond = usuarios.find((x: any) => x.idUsuario === c.idUsuario);
              return uCond && norm(`${uCond.nombre || ''} ${uCond.apellido || ''}`) === norm(nombreDesc);
            })
            : null);

        let usuarioConductor =
          (condObj ? usuarios.find((x: any) => x.idUsuario === condObj.idUsuario) : null) ||
          (nombreDesc
            ? usuarios.find(
              (x: any) => norm(`${x.nombre || ''} ${x.apellido || ''}`) === norm(nombreDesc)
            )
            : null);

        if (!usuarioConductor && condObj?.idUsuario) {
          usuarioConductor = await getJson(`/Usuario/obtener-por-id?id=${condObj.idUsuario}`, null);
        }

        const conductorNombre =
          (usuarioConductor
            ? `${usuarioConductor.nombre || ''} ${usuarioConductor.apellido || ''}`.replace(/\s+/g, ' ').trim()
            : '') ||
          nombreDesc ||
          'No asignado';

        const conductorTelefono =
          telDesc ||
          usuarioConductor?.telefono ||
          condObj?.telefono ||
          '';

        return [
          idRuta,
          {
            ruta,
            paradas,
            ordenados,
            viaje,
            asistencias,
            vehiculo,
            conductorNombre,
            conductorTelefono,
          },
        ];
      })
    );

    setAcudiente(acu);
    setHijos(misHijos);
    setIdEstudianteSeleccionado(prev =>
      prev && misHijos.some((e: any) => e.idEstudiante === prev)
        ? prev
        : misHijos[0]?.idEstudiante ?? null
    );
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

  // Estudiante seleccionado (entre todos los hijos del acudiente) y su información de ruta
  const estudianteActivo =
    hijos.find(e => e.idEstudiante === idEstudianteSeleccionado) || hijos[0] || null;
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

  const placa = infoActiva?.vehiculo?.placa || placaDeRuta(infoActiva?.ruta?.descripcion);

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
    bus,
    estudianteActivo,
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabecera superior común */}
      <View style={styles.header}>
        <Text style={[styles.headerKicker, { color: colors.primary }]}>CENTRO DE CONTROL</Text>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>
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
        /* Vista de Monitoreo en Tiempo Real: Selector de Todos los Hijos + Mapa con Bus Animado + Bottom Sheet */
        <View style={localStyles.mapAreaContainer}>
          {/* Barra superior con todos los niños/estudiantes a cargo del acudiente (1, 2, 3, 4 o más) */}
          <View style={localStyles.hijosBarContainer}>
            <View style={localStyles.hijosBarHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people" size={14} color={Colors.primary} />
                <Text style={localStyles.hijosBarTitle}>
                  MIS ESTUDIANTES A CARGO ({hijos.length})
                </Text>
              </View>
              {hijos.length > 1 && (
                <Text style={localStyles.hijosBarSubtitle}>
                  Selecciona un niño para ver su bus
                </Text>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={localStyles.hijosChipsScroll}
            >
              {hijos.map(h => {
                const esActivo = h.idEstudiante === estudianteActivo?.idEstudiante;
                const infoHijo = h.idRuta ? rutasInfo[h.idRuta] : undefined;
                const estHijo = obtenerEstadoEstudiante(h, infoHijo);
                const nombreCompleto = `${h.nombre || ''} ${h.apellido || ''}`.trim();

                return (
                  <TouchableOpacity
                    key={h.idEstudiante}
                    activeOpacity={0.85}
                    onPress={() => setIdEstudianteSeleccionado(h.idEstudiante)}
                    style={[
                      localStyles.hijoChip,
                      esActivo && localStyles.hijoChipActivo,
                    ]}
                  >
                    <View
                      style={[
                        localStyles.hijoChipAvatar,
                        esActivo && { backgroundColor: 'rgba(0, 212, 255, 0.2)', borderColor: Colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={estHijo.abordo ? 'bus' : estHijo.entregado ? 'checkmark-circle' : 'person'}
                        size={14}
                        color={esActivo ? Colors.primary : estHijo.pill.color}
                      />
                    </View>
                    <View style={{ maxWidth: 155 }}>
                      <Text
                        style={[
                          localStyles.hijoChipName,
                          esActivo && { color: Colors.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {nombreCompleto}
                      </Text>
                      <View style={localStyles.hijoChipStatusRow}>
                        <View
                          style={[
                            localStyles.hijoChipDot,
                            { backgroundColor: estHijo.pill.color },
                          ]}
                        />
                        <Text
                          style={[
                            localStyles.hijoChipStatusText,
                            { color: estHijo.pill.color },
                          ]}
                          numberOfLines={1}
                        >
                          {estHijo.pill.shortText}
                        </Text>
                        {h.cursoGrado ? (
                          <Text style={localStyles.hijoChipGrade} numberOfLines={1}>
                            · {h.cursoGrado}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

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
            estudiantes={hijos}
            rutasInfo={rutasInfo}
            onSelectEstudiante={setIdEstudianteSeleccionado}
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
  hijosBarContainer: {
    backgroundColor: '#0c1729',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e2f4f',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  hijosBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hijosBarTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  hijosBarSubtitle: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  hijosChipsScroll: {
    gap: 10,
    paddingRight: 8,
  },
  hijoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#12203a',
    borderWidth: 1.5,
    borderColor: '#1e2f4f',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hijoChipActivo: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
  },
  hijoChipAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0c1729',
    borderWidth: 1,
    borderColor: '#1e2f4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hijoChipName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  hijoChipStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  hijoChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hijoChipStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hijoChipGrade: {
    color: Colors.mutedText,
    fontSize: 11,
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
