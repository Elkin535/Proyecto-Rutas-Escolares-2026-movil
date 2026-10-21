import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../constants/Colors';

export default function Error403() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Círculo decorativo de fondo */}
      <View style={styles.backgroundGlow} />

      <View style={styles.content}>
        <View style={styles.card}>
          {/* Contenedor del ícono con resplandor */}
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons
              name="shield-alert"
              size={64}
              color={Colors.error}
            />
          </View>

          {/* Código de error */}
          <Text style={styles.title}>403</Text>

          {/* Subtítulo */}
          <Text style={styles.subtitle}>Acceso Denegado</Text>

          {/* Mensaje descriptivo */}
          <Text style={styles.text}>
            Lo sentimos, no tienes los permisos necesarios para acceder a esta sección.
          </Text>

          {/* Botón para volver atrás */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color="#040c18" />
            <Text style={styles.backButtonText}>Volver atrás</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGlow: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    width: 260,
    height: 260,
    marginLeft: -130,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderRadius: 130,
    ...Platform.select({
      web: {
        filter: 'blur(70px)',
      },
    }),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(16px)',
      },
    }),
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.error,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.mutedText,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 212, 255, 0.3)',
      },
    }),
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#040c18',
  },
});
