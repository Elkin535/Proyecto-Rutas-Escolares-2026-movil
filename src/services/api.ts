import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend desplegado en AWS EC2 (IP pública). Para probar contra tu PC usa http://<IP-de-tu-PC>:5110/api
export const API_URL = 'http://18.220.127.242:5000/api';

/**
 * Almacén en memoria como respaldo transparente.
 * Garantiza que si el almacenamiento nativo presenta algún retraso o excepción,
 * la aplicación continúe funcionando sin interrupciones.
 */
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // Fallback a memoria si AsyncStorage falla
    }
    return memoryStorage[key] ?? null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Guardado en memoria realizado
    }
  },

  removeItem: async (key: string): Promise<void> => {
    delete memoryStorage[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Eliminado de memoria realizado
    }
  },
};

/**
 * Función genérica para hacer peticiones al backend con el Token JWT inyectado
 */
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await safeStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error('Error en fetchApi:', error);
    throw error;
  }
};

/**
 * Guarda el token JWT, los datos de usuario y la preferencia de recordar sesión
 */
export const saveAuthData = async (token: string, userData: any, remember: boolean = true) => {
  try {
    await safeStorage.setItem('token', token);
    await safeStorage.setItem('usuario', JSON.stringify(userData));
    await safeStorage.setItem('rememberSession', remember ? 'true' : 'false');
  } catch (error) {
    console.error('Error guardando datos de auth:', error);
  }
};

/**
 * Obtiene los datos de autenticación persistidos
 */
export const getStoredAuthData = async () => {
  try {
    const token = await safeStorage.getItem('token');
    const usuarioRaw = await safeStorage.getItem('usuario');
    const rememberSession = await safeStorage.getItem('rememberSession');
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

    if (!token || token === 'undefined' || token === 'null') {
      return { token: null, usuario: null, rememberSession: false };
    }

    return {
      token,
      usuario,
      rememberSession: rememberSession === 'true',
    };
  } catch (error) {
    console.error('Error leyendo datos de auth:', error);
    return { token: null, usuario: null, rememberSession: false };
  }
};

// Alias para compatibilidad
export const getAuthData = getStoredAuthData;

/**
 * Limpia la sesión persistida (Logout)
 */
export const clearAuthData = async () => {
  try {
    await safeStorage.removeItem('token');
    await safeStorage.removeItem('usuario');
    await safeStorage.setItem('rememberSession', 'false');
  } catch (error) {
    console.error('Error limpiando datos de auth:', error);
  }
};

/**
 * Determina de forma centralizada la ruta correspondiente según el rol del usuario
 */
export const getRoleRoute = (roleName?: string): '/conductor' | '/acudiente' | '/admin' => {
  const roleLower = (roleName || '').toLowerCase().trim();

  if (roleLower.includes('admin') || roleLower.includes('administrador')) {
    return '/admin';
  }

  if (roleLower.includes('cond') || roleLower.includes('chofer')) {
    return '/conductor';
  }

  return '/acudiente';
};
