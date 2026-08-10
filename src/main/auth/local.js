const AuthProvider = require('./provider');

/**
 * Fase 1: no hay cuentas, no hay red. Todo el mundo es un usuario "offline"
 * y su documentación vive solo en su Mac. Cuando quieras activar login con
 * Google + Firestore, este es el archivo que se sustituye por
 * src/main/auth/google.js (mismo contrato, ver ./provider.js).
 */
class OfflineAuthProvider extends AuthProvider {
  async getCurrentUser() {
    return { id: 'local', displayName: 'Modo local', email: null, offline: true };
  }

  async signIn() {
    return this.getCurrentUser();
  }

  async signOut() {
    return true;
  }
}

module.exports = OfflineAuthProvider;
