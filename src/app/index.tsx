import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { getRoleRoute, getStoredAuthData } from '../services/api';

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { token, usuario, rememberSession } = await getStoredAuthData();

        if (!isMounted) return;

        // Si existe token, datos de usuario y la sesión no fue revocada
        if (token && usuario && rememberSession !== false) {
          const rol = usuario.nombreRol || usuario.rol || usuario.Rol;
          const targetRoute = getRoleRoute(rol);
          router.replace(targetRoute);
          return;
        }

        // Si no hay sesión activa o fue cerrada, enviar al login
        router.replace('/login');
      } catch (e) {
        console.error('Error al verificar sesión guardada:', e);
        if (isMounted) {
          router.replace('/login');
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      <Text style={styles.title}>SchoolTrack</Text>
      <Text style={styles.subtitle}>Rutas y Transporte Escolar</Text>

      {checking && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Iniciando sesión...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    marginTop: 4,
    marginBottom: 32,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.mutedText,
  },
});
