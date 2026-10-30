import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { fetchApi } from '../services/api';
import { cerrarSesionCompleta } from '../services/push';
import { avisar } from '../services/ruta';
import { RutaColors, styles } from '../styles/ruta.styles';
import { CustomButton } from './CustomButton';
import FormModal, { Campo, Valores } from './FormModal';

type IconName = keyof typeof Ionicons.glyphMap;

interface PerfilViewProps {
  usuario: any;
  // Datos extra según el rol (placa, ruta, hijos...)
  extras?: { icon: IconName; label: string; value: string }[];
}

const CAMPOS_CLAVE: Campo[] = [
  { key: 'actual', label: 'Contraseña actual', tipo: 'clave', requerido: true },
  { key: 'nueva', label: 'Nueva contraseña', tipo: 'clave', requerido: true, placeholder: 'Mínimo 8 caracteres' },
  { key: 'confirmar', label: 'Confirmar nueva contraseña', tipo: 'clave', requerido: true },
];

export default function PerfilView({ usuario, extras = [] }: PerfilViewProps) {
  const router = useRouter();
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const cerrarSesion = async () => {
    await cerrarSesionCompleta();
    router.replace('/login');
  };

  // Los errores lanzados aquí se muestran dentro del formulario
  const cambiarContrasena = async (v: Valores) => {
    if (v.nueva.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    if (v.nueva !== v.confirmar) throw new Error('La nueva contraseña y su confirmación no coinciden.');

    const res = await fetchApi('/Usuario/cambiar-contrasena', {
      method: 'PUT',
      body: JSON.stringify({ contrasenaActual: v.actual, contrasenaNueva: v.nueva }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.mensaje || data?.title || 'No se pudo cambiar la contraseña.');

    setCambiandoClave(false);
    avisar('Tu contraseña se cambió con éxito.');
  };

  const filas: { icon: IconName; label: string; value: string }[] = [
    { icon: 'mail-outline', label: 'Correo', value: usuario?.correo || '-' },
    { icon: 'shield-checkmark-outline', label: 'Rol', value: usuario?.nombreRol || '-' },
    ...extras,
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.profileAvatar}>
        <Ionicons name="person-outline" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.profileName}>{`${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim()}</Text>
      <Text style={[styles.mutedText, { textAlign: 'center', marginBottom: 20 }]}>{usuario?.nombreRol}</Text>

      <View style={styles.card}>
        {filas.map((f, i) => (
          <View key={f.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.profileRow}>
              <Ionicons name={f.icon} size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mutedText}>{f.label}</Text>
                <Text style={[styles.name, { fontSize: 15, fontWeight: '600' }]}>{f.value}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <CustomButton
        title="Cambiar contraseña"
        onPress={() => setCambiandoClave(true)}
        variant="outline"
        style={{ marginTop: 8 }}
      />
      <CustomButton
        title="Cerrar sesión"
        onPress={cerrarSesion}
        variant="outline"
        style={{ borderColor: RutaColors.danger, marginTop: 12 }}
        textStyle={{ color: RutaColors.danger }}
      />

      <FormModal
        visible={cambiandoClave}
        titulo="Cambiar contraseña"
        campos={CAMPOS_CLAVE}
        iniciales={{ actual: '', nueva: '', confirmar: '' }}
        onCerrar={() => setCambiandoClave(false)}
        onGuardar={cambiarContrasena}
      />
    </ScrollView>
  );
}
