// Contrato de autenticación. Fase 1 usa OfflineAuthProvider (sin cuentas,
// todo local). Fase 2 añadirá GoogleAuthProvider con Firebase Auth —
// ver docs/DEPLOY.md → "Iniciar sesión con Google" para el diseño completo
// del flujo (Electron no puede usar signInWithPopup directamente; se hace
// vía navegador del sistema + servidor loopback local).
class AuthProvider {
  async getCurrentUser() {
    throw new Error('getCurrentUser() no implementado');
  }

  async signIn() {
    throw new Error('signIn() no implementado');
  }

  async signOut() {
    throw new Error('signOut() no implementado');
  }
}

module.exports = AuthProvider;
