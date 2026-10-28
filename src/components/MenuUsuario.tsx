import { useRouter } from 'expo-router';

import { cerrarSesionCompleta } from '../services/push';
import { HamburgerMenu } from './HamburgerMenu';

// Menú hamburguesa del equipo con el cierre de sesión que también da de baja las notificaciones push
export default function MenuUsuario({ usuario, rol }: { usuario: any; rol: string }) {
  const router = useRouter();
  const nombre = `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() || rol;

  return (
    <HamburgerMenu
      userName={nombre}
      userEmail={usuario?.correo || ''}
      userRole={usuario?.nombreRol || rol}
      onLogout={async () => {
        await cerrarSesionCompleta();
        router.replace('/login');
      }}
    />
  );
}
