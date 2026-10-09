import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { getStoredAuthData } from '../services/api';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { token, usuario, rememberSession } = await getStoredAuthData();

        if (token && rememberSession && usuario) {
          const roleLower = (usuario.nombreRol || '').toLowerCase();
          if (roleLower.includes('admin') || roleLower.includes('administrador')) {
            router.replace('/admin');
            return;
          } else if (roleLower.includes('cond') || roleLower.includes('chofer')) {
            router.replace('/conductor');
            return;
          } else {
            router.replace('/acudiente');
            return;
          }
        }

        router.replace('/login');
      } catch (e) {
        console.error('Error al verificar sesión guardada:', e);
        router.replace('/login');
      }
    };

    checkSession();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
