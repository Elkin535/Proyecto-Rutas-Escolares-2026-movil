import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';

export interface HamburgerMenuProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  onLogout: () => void | Promise<void>;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 330);
const useNativeDriver = Platform.OS !== 'web';

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  userName = 'Administrador',
  userEmail = 'admin@schooltrack.com',
  userRole = 'Administrador',
  onLogout,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]).start();
  };

  const closeMenu = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver,
      }),
    ]).start(() => {
      setMenuVisible(false);
      setShowConfirmLogout(false);
      if (callback) callback();
    });
  };

  const handleConfirmLogout = () => {
    setShowConfirmLogout(false);
    closeMenu(() => {
      onLogout();
    });
  };

  return (
    <>
      {/* Botón de Hamburguesa en la cabecera */}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={openMenu}
        activeOpacity={0.75}
        accessibilityLabel="Abrir menú de opciones"
      >
        <View style={styles.hamburgerLinesContainer}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, styles.hamburgerLineMiddle]} />
          <View style={styles.hamburgerLine} />
        </View>
      </TouchableOpacity>

      {/* Menú Lateral Drawer */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
      >
        <View style={styles.modalRoot}>
          {/* Fondo semi-transparente que cierra el menú al tocar afuera */}
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={styles.backdropPressable} onPress={() => closeMenu()} />
          </Animated.View>

          {/* Panel deslizante lateral (Drawer) */}
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                width: DRAWER_WIDTH,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Cabecera del Drawer */}
            <View style={styles.drawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandIconCircle}>
                  <Text style={styles.brandEmoji}>🚌</Text>
                </View>
                <View>
                  <Text style={styles.brandTitle}>SchoolTrack</Text>
                  <Text style={styles.brandSubtitle}>Rutas Escolares 2026</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => closeMenu()}
                activeOpacity={0.7}
                accessibilityLabel="Cerrar menú"
              >
                <Ionicons name="close-outline" size={22} color={Colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerScroll}
            >
              {/* Tarjeta de Perfil de Usuario */}
              <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {userName}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {userEmail}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {userRole.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Sesión Activa</Text>
                  </View>
                </View>
              </View>

              {/* Separador */}
              <View style={styles.divider} />

              {/* Sección de Cierre de Sesión */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>SESIÓN</Text>
                <TouchableOpacity
                  style={styles.logoutCardButton}
                  onPress={() => setShowConfirmLogout(true)}
                  activeOpacity={0.8}
                  accessibilityLabel="Cerrar sesión"
                >
                  <View style={styles.logoutIconCircle}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                  </View>
                  <View style={styles.logoutTextContainer}>
                    <Text style={styles.logoutTitle}>Cerrar sesión</Text>
                    <Text style={styles.logoutSubtitle}>
                      Salir de la cuenta y volver al login
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(248, 113, 113, 0.6)"
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Pie del Drawer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.footerAppText}>SchoolTrack Móvil · v1.0.0</Text>
              <Text style={styles.footerCompanyText}>Transporte Escolar Confiable</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Cierre de Sesión */}
      <Modal
        visible={showConfirmLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmLogout(false)}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable
            style={styles.confirmBackdrop}
            onPress={() => setShowConfirmLogout(false)}
          />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="log-out-outline" size={30} color={Colors.error} />
            </View>

            <Text style={styles.confirmTitle}>¿Cerrar sesión?</Text>
            <Text style={styles.confirmMessage}>
              Tendrás que volver a iniciar sesión para acceder nuevamente a tu panel de administración.
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowConfirmLogout(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmLogoutButton}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={17} color="#040c18" />
                <Text style={styles.confirmLogoutText}>Sí, salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Botón Hamburguesa exterior
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  hamburgerLinesContainer: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 20,
    height: 2.2,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  hamburgerLineMiddle: {
    width: 15,
    alignSelf: 'flex-start',
  },

  // Modal y Drawer
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 12, 24, 0.75)',
  },
  backdropPressable: {
    flex: 1,
  },
  drawerContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#081120',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0, 212, 255, 0.2)',
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerScroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },

  // Perfil
  profileCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.25)',
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkText,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 12,
    color: Colors.mutedText,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.35)',
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 10.5,
    color: '#10b981',
    fontWeight: '600',
  },

  // Secciones
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.placeholder,
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },

  // Tarjeta de Cierre de Sesión
  logoutCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  logoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutTextContainer: {
    flex: 1,
    gap: 2,
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
  logoutSubtitle: {
    fontSize: 11,
    color: Colors.mutedText,
  },

  // Pie
  drawerFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: 3,
  },
  footerAppText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mutedText,
  },
  footerCompanyText: {
    fontSize: 10,
    color: Colors.placeholder,
  },

  // Confirmación Modal
  confirmModalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 12, 24, 0.85)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  confirmIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.darkText,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: Colors.mutedText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.darkText,
  },
  confirmLogoutButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#040c18',
  },
});

export default HamburgerMenu;
