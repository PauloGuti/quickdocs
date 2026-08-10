// Contrato que debe cumplir cualquier proveedor de almacenamiento.
// Hoy solo existe LocalJsonStorage (src/main/storage/local.js). El día que
// migres a GCP, crea src/main/storage/firestore.js implementando esta misma
// interfaz y cámbiala con STORAGE_PROVIDER=firestore en tu .env — nada más
// del código (ipc, renderer, UI) debería necesitar tocarse.
//
// Todos los métodos son async para que ambos backends (disco local /
// Firestore remoto) compartan la misma firma.
class StorageProvider {
  /** Se llama una vez al arrancar la app. Prepara el backend. */
  async init() {
    throw new Error('init() no implementado');
  }

  /** Devuelve el árbol completo { categories: [...] } */
  async getLibrary() {
    throw new Error('getLibrary() no implementado');
  }

  async addCategory(category) {
    throw new Error('addCategory() no implementado');
  }

  async deleteCategory(categoryId) {
    throw new Error('deleteCategory() no implementado');
  }

  async addTopic(categoryId, topic) {
    throw new Error('addTopic() no implementado');
  }

  async deleteTopic(categoryId, topicId) {
    throw new Error('deleteTopic() no implementado');
  }

  /** Fusiona una librería importada con la actual. Ver local.js para el contrato de retorno. */
  async importLibrary(data) {
    throw new Error('importLibrary() no implementado');
  }

  async addSnippet(categoryId, topicId, snippet) {
    throw new Error('addSnippet() no implementado');
  }

  async updateSnippet(categoryId, topicId, snippetId, patch) {
    throw new Error('updateSnippet() no implementado');
  }

  async deleteSnippet(categoryId, topicId, snippetId) {
    throw new Error('deleteSnippet() no implementado');
  }

  async getSettings() {
    throw new Error('getSettings() no implementado');
  }

  async setSettings(patch) {
    throw new Error('setSettings() no implementado');
  }
}

module.exports = StorageProvider;
