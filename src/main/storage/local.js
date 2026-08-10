const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { randomUUID } = require('crypto');
const StorageProvider = require('./provider');

const SEED_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'data')
  : path.join(__dirname, '..', '..', '..', 'data');

const SEED_MANIFEST = [
  'python.json',
  'adk.json',
  'agentes.json',
  'github.json',
  'gcloud.json',
  'javascript.json',
  'macos.json',
  'linux.json',
  'seguridad.json',
  'docker.json',
  'terraform.json',
  'go.json',
  'bigquery.json',
];

/**
 * Almacenamiento local basado en un único archivo JSON dentro del
 * directorio de datos de usuario de macOS
 * (~/Library/Application Support/QuickDocs/library.json).
 *
 * Es la Fase 1 del proyecto: todo funciona 100% offline, sin cuentas.
 * Ver src/main/storage/provider.js para el contrato que implementa y
 * docs/DEPLOY.md para cómo sustituirlo por Firestore más adelante.
 */
class LocalJsonStorage extends StorageProvider {
  constructor() {
    super();
    this.userDataDir = app.getPath('userData');
    this.libraryPath = path.join(this.userDataDir, 'library.json');
    this.settingsPath = path.join(this.userDataDir, 'settings.json');
    this.library = null;
    this.settings = null;
  }

  async init() {
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    if (!fs.existsSync(this.libraryPath)) {
      this.library = { categories: this._loadSeedCategories() };
      this._persistLibrary();
    } else {
      this.library = JSON.parse(fs.readFileSync(this.libraryPath, 'utf-8'));
      this._mergeNewSeedCategories();
    }

    if (!fs.existsSync(this.settingsPath)) {
      const config = require('../config');
      this.settings = {
        theme: config.defaultTheme,
        accentColor: config.defaultAccentColor,
        startAtLogin: config.defaultStartAtLogin,
      };
      this._persistSettings();
    } else {
      this.settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
    }
  }

  _loadSeedCategories() {
    const categories = [];
    for (const file of SEED_MANIFEST) {
      const fullPath = path.join(SEED_DIR, file);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        categories.push(parsed);
      } catch (err) {
        console.error(`[storage] No se pudo leer el seed ${file}:`, err.message);
      }
    }
    return categories;
  }

  // Se corre en cada arranque (no solo el primero): si esta versión de
  // QuickDocs trae categorías o TEMAS semilla nuevos que el usuario todavía
  // no tiene, se agregan solos — tanto categorías completas nuevas como
  // temas nuevos dentro de una categoría que ya existía. Nunca toca ni
  // sobrescribe una categoría/tema/snippet que ya existe, así que jamás
  // pisa ediciones propias del usuario.
  _mergeNewSeedCategories() {
    let added = false;
    for (const seedCategory of this._loadSeedCategories()) {
      const existingCategory = this.library.categories.find((c) => c.id === seedCategory.id);
      if (!existingCategory) {
        this.library.categories.push(seedCategory);
        added = true;
        continue;
      }
      const existingTopicIds = new Set(existingCategory.topics.map((t) => t.id));
      for (const seedTopic of seedCategory.topics || []) {
        if (!existingTopicIds.has(seedTopic.id)) {
          existingCategory.topics.push(seedTopic);
          added = true;
        }
      }
    }
    if (added) this._persistLibrary();
  }

  _persistLibrary() {
    fs.writeFileSync(this.libraryPath, JSON.stringify(this.library, null, 2), 'utf-8');
  }

  _persistSettings() {
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
  }

  async getLibrary() {
    return this.library;
  }

  async addCategory(category) {
    const newCategory = {
      id: category.id || slugify(category.name),
      name: category.name,
      icon: category.icon || '📁',
      color: category.color || null,
      topics: [],
    };
    this.library.categories.push(newCategory);
    this._persistLibrary();
    return newCategory;
  }

  async deleteCategory(categoryId) {
    this.library.categories = this.library.categories.filter((c) => c.id !== categoryId);
    this._persistLibrary();
    return true;
  }

  // orderedIds: los ids de todas las categorías en el orden final deseado
  // (viene de arrastrar y soltar en la UI).
  async reorderCategories(orderedIds) {
    this.library.categories = reorderByIds(this.library.categories, orderedIds);
    this._persistLibrary();
    return true;
  }

  async deleteTopic(categoryId, topicId) {
    const category = this._findCategory(categoryId);
    category.topics = category.topics.filter((t) => t.id !== topicId);
    this._persistLibrary();
    return true;
  }

  async reorderTopics(categoryId, orderedIds) {
    const category = this._findCategory(categoryId);
    category.topics = reorderByIds(category.topics, orderedIds);
    this._persistLibrary();
    return true;
  }

  async addTopic(categoryId, topic) {
    const category = this._findCategory(categoryId);
    const newTopic = {
      id: topic.id || slugify(topic.name),
      name: topic.name,
      snippets: [],
    };
    category.topics.push(newTopic);
    this._persistLibrary();
    return newTopic;
  }

  async addSnippet(categoryId, topicId, snippet) {
    const topic = this._findTopic(categoryId, topicId);
    const newSnippet = {
      id: randomUUID(),
      title: snippet.title,
      description: snippet.description || '',
      language: snippet.language || 'text',
      code: snippet.code || '',
      tags: snippet.tags || [],
      createdAt: new Date().toISOString(),
    };
    topic.snippets.push(newSnippet);
    this._persistLibrary();
    return newSnippet;
  }

  async updateSnippet(categoryId, topicId, snippetId, patch) {
    const topic = this._findTopic(categoryId, topicId);
    const snippet = topic.snippets.find((s) => s.id === snippetId);
    if (!snippet) throw new Error('Snippet no encontrado');
    Object.assign(snippet, patch, { updatedAt: new Date().toISOString() });
    this._persistLibrary();
    return snippet;
  }

  async deleteSnippet(categoryId, topicId, snippetId) {
    const topic = this._findTopic(categoryId, topicId);
    topic.snippets = topic.snippets.filter((s) => s.id !== snippetId);
    this._persistLibrary();
    return true;
  }

  async reorderSnippets(categoryId, topicId, orderedIds) {
    const topic = this._findTopic(categoryId, topicId);
    topic.snippets = reorderByIds(topic.snippets, orderedIds);
    this._persistLibrary();
    return true;
  }

  /**
   * Combina una librería importada (de otra persona/otra copia de
   * QuickDocs) con la actual. Nunca sobrescribe: si una categoría/tema ya
   * existe, fusiona por id; si un snippet con ese id ya existe, lo salta
   * (así reimportar el mismo archivo no duplica nada). Devuelve un resumen
   * para mostrarlo en la UI.
   */
  async importLibrary(data) {
    if (!data || !Array.isArray(data.categories)) {
      throw new Error('El archivo no tiene el formato esperado de QuickDocs (falta "categories").');
    }
    const summary = { categories: 0, topics: 0, snippets: 0 };

    for (const incomingCategory of data.categories) {
      let category = this.library.categories.find((c) => c.id === incomingCategory.id);
      if (!category) {
        category = {
          id: incomingCategory.id || slugify(incomingCategory.name),
          name: incomingCategory.name,
          icon: incomingCategory.icon || '📁',
          color: incomingCategory.color || null,
          toolOptions: incomingCategory.toolOptions || undefined,
          defaultTool: incomingCategory.defaultTool || undefined,
          topics: [],
        };
        this.library.categories.push(category);
        summary.categories += 1;
      }

      for (const incomingTopic of incomingCategory.topics || []) {
        let topic = category.topics.find((t) => t.id === incomingTopic.id);
        if (!topic) {
          topic = { id: incomingTopic.id || slugify(incomingTopic.name), name: incomingTopic.name, snippets: [] };
          category.topics.push(topic);
          summary.topics += 1;
        }

        for (const incomingSnippet of incomingTopic.snippets || []) {
          const alreadyExists = topic.snippets.some((s) => s.id === incomingSnippet.id);
          if (alreadyExists) continue;
          topic.snippets.push({
            id: incomingSnippet.id || randomUUID(),
            title: incomingSnippet.title,
            description: incomingSnippet.description || '',
            language: incomingSnippet.language || 'text',
            code: incomingSnippet.code || '',
            tags: incomingSnippet.tags || [],
            variants: incomingSnippet.variants || undefined,
            createdAt: new Date().toISOString(),
          });
          summary.snippets += 1;
        }
      }
    }

    this._persistLibrary();
    return summary;
  }

  async getSettings() {
    return this.settings;
  }

  async setSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    this._persistSettings();
    return this.settings;
  }

  _findCategory(categoryId) {
    const category = this.library.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error(`Categoría "${categoryId}" no encontrada`);
    return category;
  }

  _findTopic(categoryId, topicId) {
    const category = this._findCategory(categoryId);
    const topic = category.topics.find((t) => t.id === topicId);
    if (!topic) throw new Error(`Tema "${topicId}" no encontrado`);
    return topic;
  }
}

// Reordena "items" (categorías, temas o snippets) según orderedIds, que
// viene de la UI tras arrastrar y soltar. Cualquier item que por alguna
// razón no esté en orderedIds se agrega al final, para no perder datos.
function reorderByIds(items, orderedIds) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  for (const item of items) {
    if (!orderedIds.includes(item.id)) reordered.push(item);
  }
  return reordered;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || randomUUID().slice(0, 8);
}

module.exports = LocalJsonStorage;
