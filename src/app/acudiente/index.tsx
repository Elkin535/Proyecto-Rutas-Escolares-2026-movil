import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HamburgerMenu } from '../../components/HamburgerMenu';
import { Colors } from '../../constants/Colors';
import { clearAuthData, getStoredAuthData } from '../../services/api';

export default function AcudienteScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    getStoredAuthData().then(({ usuario: user }) => setUsuario(user));
  }, []);

  const cerrarSesion = async () => {
    await clearAuthData();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            Hola, {usuario?.nombre || 'Acudiente'} 👨‍👩‍👦
          </Text>
          <Text style={styles.headerTitle}>Panel de Acudiente</Text>
        </View>
        <HamburgerMenu
          userName={
            usuario
              ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Acudiente'
              : 'Acudiente'
          }
          userEmail={usuario?.correo || 'acudiente@schooltrack.com'}
          userRole="Acudiente"
          onLogout={cerrarSesion}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.bodyText}>Módulo de Acudiente</Text>
        <Text style={styles.subText}>Seguimiento en tiempo real de rutas escolares</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerSubtitle: {
    color: Colors.mutedText,
    fontSize: 13,
  },
  headerTitle: {
    color: Colors.darkText,
    fontSize: 22,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  bodyText: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '700',
  },
  subText: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
  },
});
