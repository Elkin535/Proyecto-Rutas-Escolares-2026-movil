// src/constants/Colors.ts

// Modo Oscuro (Corresponde al color azul actual de la app)
export const DarkColors = {
  primary: '#00d4ff',       // Cyan acento
  primaryDark: '#38bdf8',   // Cyan / azul claro
  dark: '#0f172a',          // Fondo pizarra oscuro
  darker: '#081120',        // Fondo principal azul oscuro
  darkText: '#f8fafc',      // Texto blanco / casi blanco
  mutedText: '#94a3b8',     // Subtítulos
  placeholder: '#64748b',   // Marcadores de posición
  background: '#040c18',    // Fondo azul muy oscuro
  cardBackground: '#12203a', // Tarjeta sólida azul oscuro
  border: 'rgba(255, 255, 255, 0.1)',
  link: '#00d4ff',
  error: '#f87171',         // Rojo suave para mensajes de error
  // Extras de interfaz
  card: '#12203a',
  cardBorder: '#1e2f4f',
  inputBg: '#0b1528',
  inputBorder: 'rgba(0, 212, 255, 0.3)',
  drawerBg: '#081120',
  drawerCard: '#0f172a',
};

// Modo Claro (Fondo limpio, tarjetas blancas sólidas y texto oscuro legible)
export const LightColors = {
  primary: '#00d4ff',       // Azul claro / cyan (igual al acento de la app)
  primaryDark: '#0284c7',   // Azul intenso
  dark: '#ffffff',          // Fondo de tarjeta blanco sólido
  darker: '#f1f5f9',        // Fondo principal claro (slate-100)
  darkText: '#0f172a',      // Texto oscuro de alta legibilidad (slate-900)
  mutedText: '#64748b',     // Subtítulos (slate-500)
  placeholder: '#94a3b8',   // Marcadores de posición
  background: '#f8fafc',    // Fondo general limpio (slate-50)
  cardBackground: '#ffffff', // Tarjeta sólida blanca
  border: '#e2e8f0',        // Borde sutil (slate-200)
  link: '#0284c7',
  error: '#ef4444',         // Rojo estándar
  // Extras de interfaz
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  drawerBg: '#ffffff',
  drawerCard: '#ffffff',
};

export type ThemeColors = typeof DarkColors;

// Objeto mutable exportado para mantener compatibilidad con todos los componentes que acceden a Colors.*
export const Colors = { ...DarkColors };
