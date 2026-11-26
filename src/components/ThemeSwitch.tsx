import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

interface ThemeSwitchProps {
  isDark: boolean;
  onToggle: () => void;
}

const SWITCH_WIDTH = 58;
const SWITCH_HEIGHT = 32;
const THUMB_SIZE = 26;
const PADDING = 3;
const TRAVEL_DISTANCE = SWITCH_WIDTH - THUMB_SIZE - PADDING * 2; // 26px
const useNativeDriver = Platform.OS !== 'web';

/**
 * Deslizante / Switch para cambiar entre Modo Claro y Modo Oscuro.
 * Representa fielmente el diseño de deslizante solicitado:
 * - Pista tipo cápsula
 * - Deslizador circular blanco que se mueve de forma suave
 * - Indicadores visuales sutiles (Sol / Luna)
 */
export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ isDark, onToggle }) => {
  // En React 19, useState para Animated.Value evita advertencias de acceso a refs en render
  const [animValue] = useState(() => new Animated.Value(isDark ? 1 : 0));

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      useNativeDriver,
    }).start();
  }, [isDark, animValue]);

  const thumbTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRAVEL_DISTANCE],
  });

  const trackBgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#94a3b8', '#334155'],
  });

  const trackBorderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#cbd5e1', '#00d4ff'],
  });

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={`Modo actual: ${isDark ? 'Modo oscuro' : 'Modo claro'}. Toca para cambiar.`}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBgColor,
            borderColor: trackBorderColor,
          },
        ]}
      >
        {/* Icono de sol a la izquierda */}
        <View style={styles.iconContainerLeft}>
          <Ionicons name="sunny" size={13} color="#fef08a" />
        </View>

        {/* Icono de luna a la derecha */}
        <View style={styles.iconContainerRight}>
          <Ionicons name="moon" size={12} color="#38bdf8" />
        </View>

        {/* Deslizador circular blanco móvil */}
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
    borderRadius: SWITCH_HEIGHT / 2,
    borderWidth: 1.5,
    padding: PADDING,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  iconContainerLeft: {
    position: 'absolute',
    left: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerRight: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeSwitch;
