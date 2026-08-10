const config = require('../config');
const LocalJsonStorage = require('./local');

/**
 * Fábrica del proveedor de almacenamiento activo.
 * Controlado 100% por STORAGE_PROVIDER en .env — así migrar de
 * "guardar en disco" a "guardar en Firestore" es cambiar una variable,
 * no reescribir la app. Ver docs/DEPLOY.md, sección "Migrar a GCP".
 */
function createStorage() {
  switch (config.storageProvider) {
    case 'local':
      return new LocalJsonStorage();
    case 'firestore':
      // Fase 2: implementar src/main/storage/firestore.js con la misma
      // interfaz que StorageProvider (ver ./provider.js) y descomentar:
      // const FirestoreStorage = require('./firestore');
      // return new FirestoreStorage();
      throw new Error(
        'STORAGE_PROVIDER=firestore todavía no está implementado en este checkout. ' +
          'Revisa docs/DEPLOY.md → "Migrar a GCP" para los pasos de la Fase 2.'
      );
    default:
      throw new Error(`STORAGE_PROVIDER desconocido: "${config.storageProvider}"`);
  }
}

module.exports = { createStorage };
