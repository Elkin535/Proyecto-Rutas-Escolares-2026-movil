# 🚌 SchoolTrack - Proyecto Rutas Escolares 2026 (Móvil)

Aplicación móvil desarrollada con **React Native** y **Expo** para la gestión, monitoreo y comunicación en tiempo real de rutas de transporte escolar. Conecta de forma segura a acudientes, conductores y administradores del colegio.

---

## 📱 Primer Avance

- **Módulo de Autenticación / Login**:
  - Selector de perfiles de usuario interactivo:
    - 👨‍👩‍👦 **Acudiente**: Acceso a monitoreo de estudiantes y notificaciones de ruta.
    - 🚐 **Conductor**: Acceso a recorrido activo, lista de paradas y alertas.
    - 🛡️ **Administrador**: Gestión global de rutas, vehículos y usuarios.
  - Formulario de credenciales con soporte de correo institucional y contraseña.
  - Control de visibilidad de contraseña (mostrar/ocultar con feedback visual).
  - Validación de campos requeridos y simulación interactiva de acceso con indicador de carga.
  - Diseño responsivo con paleta institucional adaptada al transporte escolar.
- **Arquitectura Base**:
  - Enrutamiento basado en archivos con **Expo Router**.
  - Componentes reutilizables (`CustomButton`, `CustomInput`).
  - Constantes centralizadas de colores y diseño (`Colors.ts`).
  - Tipado estático robusto con **TypeScript**.

---

## 🛠️ Tecnologías y Librerías

- **Framework**: [React Native](https://reactnative.dev/)
- **Entorno / Herramientas**: [Expo SDK 57](https://expo.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Navegación**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Íconos & Recursos**: `@expo/vector-icons`, `expo-symbols`

---

## 📂 Estructura del Proyecto

```text
├── assets/                 # Iconos, imágenes y recursos gráficos
├── src/
│   ├── app/                # Rutas y pantallas (Expo Router)
│   │   ├── _layout.tsx     # Configuración del Stack de navegación
│   │   ├── index.tsx       # Redirección inicial
│   │   ├── login.tsx       # Pantalla de inicio de sesión
│   │   └── login.styles.ts # Estilos de la pantalla de login
│   ├── components/         # Componentes reutilizables (CustomButton, CustomInput)
│   ├── constants/          # Constantes globales (Colors.ts)
│   └── hooks/              # Custom hooks
├── app.json                # Configuración de Expo y EAS
├── package.json            # Dependencias y scripts
└── tsconfig.json           # Configuración de TypeScript
```

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd Proyecto-Rutas-Escolares-2026-movil
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el entorno de desarrollo
```bash
npx expo start
```

### 4. Probar en un dispositivo o emulador
- **Dispositivo físico**: Abre la aplicación **Expo Go** (Android) o la app de Cámara (iOS) y escanea el código QR que aparece en la terminal.
- **Emulador Android**: Presiona `a` en la terminal.
- **Simulador iOS**: Presiona `i` en la terminal (requiere macOS).
- **Navegador Web**: Presiona `w` en la terminal.
