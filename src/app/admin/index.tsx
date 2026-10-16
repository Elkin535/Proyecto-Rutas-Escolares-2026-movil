import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../../constants/Colors';
import { clearAuthData, fetchApi, getStoredAuthData } from '../../services/api';
import { MetricColors, styles } from '../../styles/admin.styles';

type IconName = keyof typeof Ionicons.glyphMap;
type Tab = 'resumen' | 'rutas' | 'estudiantes' | 'acudientes' | 'conductores' | 'vehiculos';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'resumen', label: 'Resumen', icon: 'grid-outline' },
  { key: 'rutas', label: 'Rutas', icon: 'map-outline' },
  { key: 'estudiantes', label: 'Estudiantes', icon: 'school-outline' },
  { key: 'acudientes', label: 'Acudientes', icon: 'people-outline' },
  { key: 'conductores', label: 'Conductores', icon: 'id-card-outline' },
  { key: 'vehiculos', label: 'Vehículos', icon: 'bus-outline' },
];

type Item = {
  key: string;
  title: string;
  lines: string[];
  badge?: string;
  onDelete: () => void;
};

// Devuelve [] si el endpoint falla, para que una lista caída no rompa todo el panel
const getJson = async (endpoint: string, fallback: any = []) => {
  try {
    const res = await fetchApi(endpoint);
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
};

// Alert con botones no funciona en react-native-web, ahí usamos window.confirm
const confirmar = (mensaje: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(mensaje)) onOk();
    return;
  }
  Alert.alert('Confirmar', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: onOk },
  ]);
};

const avisar = (mensaje: string) =>
  Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Aviso', mensaje);

const formatearFecha = (fecha?: string) => (fecha ? new Date(fecha).toLocaleDateString() : '-');

export default function AdminScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('resumen');
  const [search, setSearch] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [nombreAdmin, setNombreAdmin] = useState('');

  const [metricas, setMetricas] = useState<any>({});
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [paradas, setParadas] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [acudientes, setAcudientes] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);

  const cargarTodo = useCallback(async () => {
    const [met, usu, veh, rut, par, est, acu, con] = await Promise.all([
      getJson('/Usuario/dashboard-metricas', {}),
      getJson('/Usuario/obtener-todos'),
      getJson('/Vehiculo/obtener-todos'),
      getJson('/Ruta/obtener-todas'),
      getJson('/Parada/obtener-todas'),
      getJson('/Estudiante/obtener-todos'),
      getJson('/Acudiente/obtener-todos'),
      getJson('/Conductor/obtener-todos'),
    ]);
    setMetricas(met);
    setUsuarios(usu);
    setVehiculos(veh);
    setRutas(rut);
    setParadas(par);
    setEstudiantes(est);
    setAcudientes(acu);
    setConductores(con);
  }, []);

  useEffect(() => {
    getStoredAuthData().then(({ usuario }) => setNombreAdmin(usuario?.nombre || 'Administrador'));
    cargarTodo().finally(() => setCargando(false));
  }, [cargarTodo]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarTodo();
    setRefrescando(false);
  };

  const cerrarSesion = async () => {
    await clearAuthData();
    router.replace('/login');
  };

  const cambiarTab = (t: Tab) => {
    setTab(t);
    setSearch('');
  };

  // Ejecuta uno o varios DELETE en orden y recarga; se detiene en el primero que falle
  const eliminar = (mensaje: string, endpoints: string[]) =>
    confirmar(mensaje, async () => {
      try {
        for (const ep of endpoints) {
          const res = await fetchApi(ep, { method: 'DELETE' });
          if (!res.ok) throw new Error();
        }
        await cargarTodo();
      } catch {
        avisar('No se pudo eliminar el registro.');
      }
    });

  const usuarioDe = (idUsuario: number) => usuarios.find(u => u.idUsuario === idUsuario) || {};
  const nombreUsuario = (idUsuario: number) => {
    const u = usuarioDe(idUsuario);
    return u.nombre ? `${u.nombre} ${u.apellido || ''}`.trim() : 'Sin nombre';
  };
  const placaDe = (idVehiculo?: number) =>
    vehiculos.find(v => v.idVehiculo === idVehiculo)?.placa || 'Sin asignar';
  const nombreRuta = (idRuta?: number) =>
    rutas.find(r => r.idRuta === idRuta)?.nombreRuta || 'Sin asignar';

  // Misma lógica que el web: la descripción guarda "Conductor: X | Vehículo: Y"
  const conductorYVehiculo = (descripcion?: string) => {
    if (descripcion?.includes('Conductor:') && descripcion.includes('Vehículo:')) {
      const [c, v] = descripcion.split(' | ');
      return { conductor: c.replace('Conductor: ', ''), vehiculo: v.replace('Vehículo: ', '') };
    }
    return { conductor: descripcion || 'No asignado', vehiculo: 'Sin placa' };
  };

  const itemsDeTab = (): Item[] => {
    switch (tab) {
      case 'rutas':
        return rutas.map(r => {
          const { conductor, vehiculo } = conductorYVehiculo(r.descripcion);
          const nParadas = paradas.filter(p => p.idRuta === r.idRuta).length;
          return {
            key: `r${r.idRuta}`,
            title: r.nombreRuta,
            lines: [`Conductor: ${conductor}`, `${nParadas} paradas · ${r.estado ? 'En servicio' : 'Mantenimiento'}`],
            badge: vehiculo,
            onDelete: () => eliminar('¿Eliminar esta ruta escolar?', [`/Ruta/eliminar?id=${r.idRuta}`]),
          };
        });
      case 'estudiantes':
        return estudiantes.map(e => {
          const acu = acudientes.find(a => a.idAcudiente === e.idAcudiente);
          return {
            key: `e${e.idEstudiante}`,
            title: `${e.nombre} ${e.apellido || ''}`.trim(),
            lines: [`Acudiente: ${acu ? nombreUsuario(acu.idUsuario) : 'Sin asignar'}`, `Colegio: ${e.colegio || '-'}`],
            badge: e.idRuta ? nombreRuta(e.idRuta) : undefined,
            onDelete: () => eliminar('¿Eliminar este estudiante?', [`/Estudiante/eliminar?id=${e.idEstudiante}`]),
          };
        });
      case 'acudientes':
        return acudientes.map(a => {
          const u = usuarioDe(a.idUsuario);
          return {
            key: `a${a.idAcudiente}`,
            title: nombreUsuario(a.idUsuario),
            lines: [u.correo || '-', `Tel: ${u.telefono || '-'}`, `Dir: ${a.direccionResidencia || '-'}`],
            onDelete: () =>
              eliminar('¿Eliminar este acudiente? También se eliminará su usuario.', [
                `/Acudiente/eliminar?id=${a.idAcudiente}`,
                `/Usuario/eliminar?id=${a.idUsuario}`,
              ]),
          };
        });
      case 'conductores':
        return conductores.map(c => ({
          key: `c${c.idConductor}`,
          title: nombreUsuario(c.idUsuario),
          lines: [usuarioDe(c.idUsuario).correo || '-', `Licencia: ${c.numeroLicencia} (${c.categoriaLicencia || '-'})`],
          badge: placaDe(c.idVehiculo),
          onDelete: () =>
            eliminar('¿Eliminar este conductor? También se eliminará su usuario.', [
              `/Conductor/eliminar?id=${c.idConductor}`,
              `/Usuario/eliminar?id=${c.idUsuario}`,
            ]),
        }));
      case 'vehiculos':
        return vehiculos.map(v => ({
          key: `v${v.idVehiculo}`,
          title: v.modelo || 'Vehículo',
          lines: [
            `Capacidad: ${v.capacidadPasajeros} pasajeros`,
            `SOAT: ${formatearFecha(v.soatVencimiento)} · Tecno: ${formatearFecha(v.tecnomecanicaVencimiento)}`,
          ],
          badge: v.placa,
          onDelete: () => eliminar('¿Eliminar este vehículo?', [`/Vehiculo/eliminar?id=${v.idVehiculo}`]),
        }));
      default:
        return [];
    }
  };

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const term = search.toLowerCase().trim();
  const items = itemsDeTab().filter(
    i => !term || [i.title, i.badge, ...i.lines].join(' ').toLowerCase().includes(term)
  );
  const tabActual = TABS.find(t => t.key === tab)!;

  const metricasCards: { label: string; value: number; icon: IconName; color: string; tab: Tab }[] = [
    { label: 'Rutas creadas', value: metricas.totalRutas ?? rutas.length, icon: 'map-outline', color: MetricColors.routes, tab: 'rutas' },
    { label: 'Conductores', value: metricas.totalConductores ?? conductores.length, icon: 'id-card-outline', color: MetricColors.drivers, tab: 'conductores' },
    { label: 'Vehículos', value: metricas.totalVehiculos ?? vehiculos.length, icon: 'bus-outline', color: MetricColors.vehicles, tab: 'vehiculos' },
    { label: 'Alumnos asignados', value: metricas.totalEstudiantes ?? estudiantes.length, icon: 'school-outline', color: MetricColors.students, tab: 'estudiantes' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Hola, {nombreAdmin} 👋</Text>
          <Text style={styles.headerTitle}>Panel Administrativo</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion} accessibilityLabel="Cerrar sesión">
          <Ionicons name="log-out-outline" size={22} color={MetricColors.danger} />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map(t => {
            const activo = t.key === tab;
            return (
              <TouchableOpacity key={t.key} style={[styles.tab, activo && styles.tabActive]} onPress={() => cambiarTab(t.key)}>
                <Ionicons name={t.icon} size={16} color={activo ? Colors.darker : Colors.mutedText} />
                <Text style={[styles.tabText, activo && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {tab === 'resumen' ? (
          <>
            <Text style={styles.sectionTitle}>Métricas generales</Text>
            <View style={styles.metricsGrid}>
              {metricasCards.map(m => (
                <TouchableOpacity key={m.label} style={styles.metricCard} onPress={() => cambiarTab(m.tab)}>
                  <View style={[styles.metricIcon, { backgroundColor: `${m.color}26` }]}>
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Gestión</Text>
            {TABS.slice(1).map(t => (
              <TouchableOpacity key={t.key} style={styles.shortcut} onPress={() => cambiarTab(t.key)}>
                <Ionicons name={t.icon} size={20} color={Colors.primary} />
                <Text style={styles.shortcutText}>{t.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.mutedText} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.placeholder} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Buscar en ${tabActual.label.toLowerCase()}...`}
                placeholderTextColor={Colors.placeholder}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <Text style={styles.countText}>{items.length} registro(s)</Text>

            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name={tabActual.icon} size={40} color={Colors.placeholder} />
                <Text style={styles.emptyText}>No hay {tabActual.label.toLowerCase()} registrados</Text>
              </View>
            ) : (
              items.map(i => (
                <View key={i.key} style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{i.title}</Text>
                    {i.lines.map((l, idx) => (
                      <Text key={idx} style={styles.cardLine}>{l}</Text>
                    ))}
                    {i.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{i.badge}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={i.onDelete} accessibilityLabel="Eliminar">
                    <Ionicons name="trash-outline" size={18} color={MetricColors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
