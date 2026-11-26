import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { Colors, DarkColors, LightColors, ThemeColors } from '../constants/Colors';
import { safeStorage } from '../services/api';
import { RutaColors } from '../styles/ruta.styles';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: DarkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = '@schooltrack_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  const applyTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    const palette = mode === 'dark' ? DarkColors : LightColors;
    Object.assign(Colors, palette);
    if (mode === 'dark') {
      RutaColors.card = '#12203a';
      RutaColors.cardBorder = '#1e2f4f';
    } else {
      RutaColors.card = '#ffffff';
      RutaColors.cardBorder = '#e2e8f0';
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await safeStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          applyTheme(saved);
        } else {
          applyTheme('dark');
        }
      } catch {
        applyTheme('dark');
      }
    })();
  }, [applyTheme]);

  const setTheme = (mode: ThemeMode) => {
    applyTheme(mode);
    safeStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
