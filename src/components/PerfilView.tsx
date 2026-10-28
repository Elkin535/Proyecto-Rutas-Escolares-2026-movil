import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { cerrarSesionCompleta } from '../services/push';
import { RutaColors, styles } from '../styles/ruta.styles';
import { CustomButton } from './CustomButton';

type IconName = keyof typeof Ionicons.glyphMap;

interface PerfilViewProps {
  usuario: any;
  // Datos extra según el rol (placa, ruta, hijos...)
  extras?: { icon: IconName; label: string; value: string }[];
}

export default function PerfilView({ usuario, extras = [] }: PerfilViewProps) {
  const router = useRouter();

  const cerrarSesion = async () => {
    await cerrarSesionCompleta();
    router.replace('/login');
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
        title="Cerrar sesión"
        onPress={cerrarSesion}
        variant="outline"
        style={{ borderColor: RutaColors.danger, marginTop: 8 }}
        textStyle={{ color: RutaColors.danger }}
      />
    </ScrollView>
  );
}
