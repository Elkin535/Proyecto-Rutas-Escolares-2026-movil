import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { styles } from '../styles/ruta.styles';

type IconName = keyof typeof Ionicons.glyphMap;

interface BottomNavProps {
  tabs: { key: string; label: string; icon: IconName }[];
  active: string;
  onChange: (key: string) => void;
}

export default function BottomNav({ tabs, active, onChange }: BottomNavProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // En Android con 3 botones o barra de gestos (y en iOS), insets.bottom contiene
  // la altura ocupada por la navegación del sistema. Dejamos un margen dinámico
  // para que la barra flote limpiamente sobre los botones del sistema (estilo Nequi),
  // evitando que se sobreponga o interfiera con los gestos táctiles.
  const bottomMargin = Math.max(insets.bottom + 8, 16);

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          marginBottom: bottomMargin,
        },
      ]}
    >
      {tabs.map(t => {
        const activo = t.key === active;
        const color = activo ? colors.primary : colors.mutedText;
        return (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.navItem,
              activo && {
                backgroundColor: isDark ? 'rgba(0, 212, 255, 0.12)' : 'rgba(2, 132, 199, 0.12)',
              },
            ]}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
          >
            <Ionicons name={t.icon} size={22} color={color} />
            <Text style={[styles.navText, { color, fontWeight: activo ? '700' : '500' }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
