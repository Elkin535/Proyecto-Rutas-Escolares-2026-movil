import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DialogoHost } from '../components/Dialogo';

// Registra la tarea de GPS en segundo plano al arrancar la app (Android la relanza sin abrir pantallas)
import '../services/gpsTask';

// Inyección de estilos web: neutraliza el outline del navegador y el fondo blanco/celeste de autofill de Chrome/Edge
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const injectWebStyles = () => {
    const styleId = 'schooltrack-web-autofill-fix';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        /* Elimina el fondo blanco/celeste y texto negro que los navegadores WebKit/Chromium fuerzan en credenciales guardadas */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #0b1528 inset !important;
          box-shadow: 0 0 0 1000px #0b1528 inset !important;
          -webkit-text-fill-color: #f8fafc !important;
          caret-color: #00d4ff !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }

        /* Quita el recuadro amarillo/azul por defecto del navegador al tocar o enfocar cualquier celda de texto */
        input, textarea, select, [data-focusable="true"] {
          outline: none !important;
          outline-style: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        input:focus, textarea:focus, select:focus, [data-focusable="true"]:focus {
          outline: none !important;
          outline-style: none !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  };
  injectWebStyles();
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'schooltrack-web-autofill-fix';
      if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px #0b1528 inset !important;
            box-shadow: 0 0 0 1000px #0b1528 inset !important;
            -webkit-text-fill-color: #f8fafc !important;
            caret-color: #00d4ff !important;
            transition: background-color 50000s ease-in-out 0s !important;
          }
          input, textarea, select, [data-focusable="true"] {
            outline: none !important;
            outline-style: none !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          input:focus, textarea:focus, select:focus, [data-focusable="true"]:focus {
            outline: none !important;
            outline-style: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
      </Stack>
      {/* Avisos y confirmaciones con el diseño de la app (en lugar del Alert blanco del sistema) */}
      <DialogoHost />
    </GestureHandlerRootView>
  );
}

