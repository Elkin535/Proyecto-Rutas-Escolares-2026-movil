import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { styles } from '../styles/ruta.styles';

type IconName = keyof typeof Ionicons.glyphMap;

interface BottomNavProps {
  tabs: { key: string; label: string; icon: IconName }[];
  active: string;
  onChange: (key: string) => void;
}

export default function BottomNav({ tabs, active, onChange }: BottomNavProps) {
  return (
    <View style={styles.bottomNav}>
      {tabs.map(t => {
        const activo = t.key === active;
        const color = activo ? Colors.primary : Colors.mutedText;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.navItem, activo && styles.navItemActive]}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
          >
            <Ionicons name={t.icon} size={22} color={color} />
            <Text style={[styles.navText, { color }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
