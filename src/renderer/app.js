// QuickDocs — lógica del renderer. Vanilla JS a propósito: el panel es
// pequeño y no necesita un framework. Navegación de una sola columna
// (categorías → temas → snippets) más una vista de búsqueda global.
(function () {
  'use strict';

  const state = {
    library: { categories: [] },
    settings: { theme: 'system', accentColor: 'blue', startAtLogin: true },
    toolPreferences: {}, // { [categoryId]: toolId } — qué gestor de paquetes eligió el usuario por categoría
    editingSnippet: null, // {categoryId, topicId, snippetId, snippet} cuando el formulario está en modo edición
    view: 'categories', // categories | topics | snippets | search
    categoryId: null,
    topicId: null,
    query: '',
  };

  const el = {
    content: document.getElementById('content'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    breadcrumb: document.getElementById('breadcrumb'),
    breadcrumbLabel: document.getElementById('breadcrumb-label'),
    toolSwitcher: document.getElementById('tool-switcher'),
    backBtn: document.getElementById('back-btn'),
    menuBtn: document.getElementById('menu-btn'),
    menuPopover: document.getElementById('menu-popover'),
    menuAdd: document.getElementById('menu-add'),
    menuExport: document.getElementById('menu-export'),
    menuImport: document.getElementById('menu-import'),
    menuSettings: document.getElementById('menu-settings'),
    closePanelBtn: document.getElementById('close-panel-btn'),
    shortcutHint: document.getElementById('shortcut-hint'),
    footerStatus: document.getElementById('footer-status'),
    formatHint: document.getElementById('format-hint'),
    manageCategoriesList: document.getElementById('manage-categories-list'),
  };

  // ---------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------

  async function init() {
    const [library, settings, user, appConfig] = await Promise.all([
      window.quickdocs.library.get(),
      window.quickdocs.settings.get(),
      window.quickdocs.auth.getCurrentUser(),
      window.quickdocs.app.getConfig(),
    ]);
    state.library = library;
    state.settings = settings;
    state.toolPreferences = settings.toolPreferences || {};
    state.appConfig = appConfig;
    applyTheme();
    applySettingsToUI();
    state.userLabel = user?.offline ? 'Modo local' : user?.displayName || 'Modo local';
    el.footerStatus.textContent = state.userLabel;
    el.shortcutHint.textContent = prettyShortcut(appConfig.globalShortcut);
    render();

    window.quickdocs.onPanelShown(() => {
      el.searchInput.focus();
      el.searchInput.select();
    });
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme || 'system');
    document.documentElement.setAttribute('data-accent', state.settings.accentColor || 'blue');
  }

  // ---------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------

  function goToCategories() {
    state.view = 'categories';
    state.categoryId = null;
    state.topicId = null;
    render();
  }

  function goToTopics(categoryId) {
    state.view = 'topics';
    state.categoryId = categoryId;
    state.topicId = null;
    render();
  }

  function goToSnippets(categoryId, topicId) {
    state.view = 'snippets';
    state.categoryId = categoryId;
    state.topicId = topicId;
    render();
  }

  function goBack() {
    if (state.query) {
      clearSearch();
      return;
    }
    if (state.view === 'snippets') {
      goToTopics(state.categoryId);
    } else if (state.view === 'topics') {
      goToCategories();
    }
  }

  function findCategory(categoryId) {
    return state.library.categories.find((c) => c.id === categoryId);
  }
  function findTopic(categoryId, topicId) {
    const category = findCategory(categoryId);
    return category && category.topics.find((t) => t.id === topicId);
  }

  // ---------------------------------------------------------------------
  // Variantes por gestor de paquetes / framework (p. ej. pip vs uv vs Poetry)
  // ---------------------------------------------------------------------

  function getActiveTool(category) {
    if (!category || !category.toolOptions || !category.toolOptions.length) return null;
    const saved = state.toolPreferences[category.id];
    if (saved && category.toolOptions.some((o) => o.id === saved)) return saved;
    return category.defaultTool || category.toolOptions[0].id;
  }

  function resolveVariant(snippet, toolId) {
    if (toolId && snippet.variants && snippet.variants[toolId]) {
      return { ...snippet, ...snippet.variants[toolId] };
    }
    return snippet;
  }

  function renderToolSwitcher(category) {
    if (!category || !category.toolOptions || !category.toolOptions.length) {
      el.toolSwitcher.hidden = true;
      return;
    }
    el.toolSwitcher.hidden = false;
    el.toolSwitcher.innerHTML = category.toolOptions
      .map((opt) => `<option value="${escapeAttr(opt.id)}">${escapeHTML(opt.label)}</option>`)
      .join('');
    el.toolSwitcher.value = getActiveTool(category);
  }

  el.toolSwitcher.addEventListener('change', async () => {
    const category = findCategory(state.categoryId);
    if (!category) return;
    state.toolPreferences = { ...state.toolPreferences, [category.id]: el.toolSwitcher.value };
    state.settings = await window.quickdocs.settings.set({ toolPreferences: state.toolPreferences });
    render();
  });

  // ---------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------

  function render() {
    const effectiveView = state.query ? 'search' : state.view;
    document.getElementById('app').dataset.view = effectiveView;
    updateBreadcrumb(effectiveView);

    if (effectiveView === 'search') {
      renderSearchResults();
    } else if (effectiveView === 'topics') {
      renderTopics();
    } else if (effectiveView === 'snippets') {
      renderSnippets();
    } else {
      renderCategories();
    }
    el.content.scrollTop = 0;
  }

  function updateBreadcrumb(effectiveView) {
    if (effectiveView === 'categories') {
      el.breadcrumb.hidden = true;
      el.toolSwitcher.hidden = true;
      return;
    }
    el.breadcrumb.hidden = false;
    if (effectiveView === 'search') {
      el.breadcrumbLabel.textContent = `Resultados para "${state.query}"`;
      el.toolSwitcher.hidden = true;
    } else if (effectiveView === 'topics') {
      const category = findCategory(state.categoryId);
      el.breadcrumbLabel.textContent = category ? category.name : '';
      renderToolSwitcher(category);
    } else if (effectiveView === 'snippets') {
      const category = findCategory(state.categoryId);
      const topic = findTopic(state.categoryId, state.topicId);
      el.breadcrumbLabel.textContent = category && topic ? `${category.name} · ${topic.name}` : '';
      renderToolSwitcher(category);
    }
  }

  function renderCategories() {
    const categories = state.library.categories;
    if (!categories.length) {
      el.content.innerHTML = emptyStateHTML(
        '📚',
        'Todavía no hay documentación',
        'Usa el botón ••• de arriba para agregar tu primer comando.'
      );
      return;
    }
    const items = categories
      .map((cat) => {
        const count = cat.topics.reduce((n, t) => n + t.snippets.length, 0);
        return listItemHTML({
          icon: cat.icon || '📁',
          title: cat.name,
          subtitle: `${count} comando${count === 1 ? '' : 's'}`,
          onClickAttr: `data-goto-category="${escapeAttr(cat.id)}"`,
          deleteAttr: `data-delete-category="${escapeAttr(cat.id)}"`,
        });
      })
      .join('');
    el.content.innerHTML = `<div class="list">${items}</div>`;

    el.content.querySelectorAll('[data-goto-category]').forEach((node) => {
      node.addEventListener('click', () => goToTopics(node.dataset.gotoCategory));
    });
    el.content.querySelectorAll('[data-delete-category]').forEach((btn) => {
      btn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        deleteCategoryFlow(btn.dataset.deleteCategory);
      });
    });
  }

  async function deleteCategoryFlow(categoryId) {
    const category = findCategory(categoryId);
    if (!category) return;
    const count = category.topics.reduce((n, t) => n + t.snippets.length, 0);
    const ok = confirm(
      `¿Eliminar la categoría "${category.name}"? Se borrarán sus ${category.topics.length} temas y ${count} comandos. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    await window.quickdocs.library.deleteCategory(categoryId);
    state.library = await window.quickdocs.library.get();
    if (state.categoryId === categoryId) goToCategories();
    else render();
  }

  function renderTopics() {
    const category = findCategory(state.categoryId);
    if (!category) return goToCategories();
    if (!category.topics.length) {
      el.content.innerHTML = emptyStateHTML(
        category.icon || '📁',
        'Sin temas todavía',
        'Agrega documentación a esta categoría desde el botón ••• .'
      );
      return;
    }
    const items = category.topics
      .map((topic) =>
        listItemHTML({
          icon: '📄',
          title: topic.name,
          subtitle: `${topic.snippets.length} comando${topic.snippets.length === 1 ? '' : 's'}`,
          onClickAttr: `data-goto-topic="${escapeAttr(topic.id)}"`,
          deleteAttr: `data-delete-topic="${escapeAttr(topic.id)}"`,
        })
      )
      .join('');
    el.content.innerHTML = `<div class="list">${items}</div>`;
    el.content.querySelectorAll('[data-goto-topic]').forEach((node) => {
      node.addEventListener('click', () => goToSnippets(state.categoryId, node.dataset.gotoTopic));
    });
    el.content.querySelectorAll('[data-delete-topic]').forEach((btn) => {
      btn.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        const topic = findTopic(state.categoryId, btn.dataset.deleteTopic);
        if (!topic) return;
        const ok = confirm(`¿Eliminar el tema "${topic.name}" y sus ${topic.snippets.length} comandos?`);
        if (!ok) return;
        await window.quickdocs.library.deleteTopic(state.categoryId, btn.dataset.deleteTopic);
        state.library = await window.quickdocs.library.get();
        render();
      });
    });
  }

  function renderSnippets() {
    const category = findCategory(state.categoryId);
    const topic = findTopic(state.categoryId, state.topicId);
    if (!topic) return goToTopics(state.categoryId);
    if (!topic.snippets.length) {
      el.content.innerHTML = emptyStateHTML('🧩', 'Sin comandos todavía', 'Agrega el primero desde el botón ••• .');
      return;
    }
    const tool = getActiveTool(category);
    el.content.innerHTML = `<div class="snippet-list">${topic.snippets
      .map((s) => snippetCardHTML(resolveVariant(s, tool), { categoryId: state.categoryId, topicId: state.topicId }))
      .join('')}</div>`;
    wireSnippetCards();
    highlightAll();
  }

  function renderSearchResults() {
    const q = state.query.trim().toLowerCase();
    const matches = [];
    for (const category of state.library.categories) {
      for (const topic of category.topics) {
        for (const snippet of topic.snippets) {
          const variantText = snippet.variants
            ? Object.values(snippet.variants)
                .map((v) => `${v.title || ''} ${v.description || ''} ${v.code || ''}`)
                .join(' ')
            : '';
          const haystack = [snippet.title, snippet.description, snippet.code, variantText, ...(snippet.tags || []), category.name, topic.name]
            .join(' ')
            .toLowerCase();
          if (haystack.includes(q)) {
            matches.push({ category, topic, snippet });
          }
        }
      }
    }
    if (!matches.length) {
      el.content.innerHTML = emptyStateHTML('🔍', 'Sin resultados', `Nada coincide con "${state.query}".`);
      return;
    }
    el.content.innerHTML = `<div class="snippet-list">${matches
      .map(({ category, topic, snippet }) =>
        snippetCardHTML(resolveVariant(snippet, getActiveTool(category)), {
          breadcrumbLabel: `${category.name} · ${topic.name}`,
          categoryId: category.id,
          topicId: topic.id,
        })
      )
      .join('')}</div>`;
    wireSnippetCards();
    highlightAll();
  }

  // ---------------------------------------------------------------------
  // HTML helpers
  // ---------------------------------------------------------------------

  function listItemHTML({ icon, title, subtitle, onClickAttr, deleteAttr }) {
    return `
      <div class="list-item" ${onClickAttr}>
        <span class="item-icon">${icon}</span>
        <span class="item-text">
          <div class="item-title">${escapeHTML(title)}</div>
          <div class="item-subtitle">${escapeHTML(subtitle)}</div>
        </span>
        ${deleteAttr ? `<button class="list-item-delete" ${deleteAttr} title="Eliminar" aria-label="Eliminar">🗑</button>` : ''}
        <span class="item-chevron">›</span>
      </div>`;
  }

  function snippetCardHTML(snippet, opts = {}) {
    const { breadcrumbLabel, categoryId, topicId } = opts;
    const loc = `data-category-id="${escapeAttr(categoryId)}" data-topic-id="${escapeAttr(topicId)}" data-snippet-id="${escapeAttr(snippet.id)}"`;
    return `
      <div class="snippet-card">
        <div class="snippet-header">
          <div class="snippet-title-wrap">
            ${breadcrumbLabel ? `<div class="snippet-breadcrumb">${escapeHTML(breadcrumbLabel)}</div>` : ''}
            <div class="snippet-title">${escapeHTML(snippet.title)}</div>
          </div>
          <div class="snippet-actions">
            <button class="pill-btn" data-copy ${loc}>Copiar</button>
            <button class="pill-btn" data-edit ${loc}>Editar</button>
            <button class="pill-btn danger" data-delete ${loc}>Eliminar</button>
          </div>
        </div>
        ${snippet.description ? `<div class="snippet-description">${escapeHTML(snippet.description)}</div>` : ''}
        <div class="code-block">
          <span class="lang-badge">${escapeHTML(snippet.language || 'text')}</span>
          <pre><code class="language-${escapeAttr(snippet.language || 'text')}">${escapeHTML(snippet.code)}</code></pre>
        </div>
      </div>`;
  }

  function emptyStateHTML(icon, title, body) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${escapeHTML(title)}</div>
        <div class="empty-state-body">${escapeHTML(body)}</div>
      </div>`;
  }

  function wireSnippetCards() {
    el.content.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const card = btn.closest('.snippet-card');
        const code = card.querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = 'Copiado ✓';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copiar';
            btn.classList.remove('copied');
          }, 1200);
        });
      });
    });

    el.content.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const { categoryId, topicId, snippetId } = btn.dataset;
        const topic = findTopic(categoryId, topicId);
        const snippet = topic && topic.snippets.find((s) => s.id === snippetId);
        if (!snippet) return;
        openAddModal({ categoryId, topicId, snippetId, snippet });
      });
    });

    el.content.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        const { categoryId, topicId, snippetId } = btn.dataset;
        const topic = findTopic(categoryId, topicId);
        const snippet = topic && topic.snippets.find((s) => s.id === snippetId);
        const ok = confirm(`¿Eliminar "${snippet ? snippet.title : 'este comando'}"? No se puede deshacer.`);
        if (!ok) return;
        await window.quickdocs.library.deleteSnippet(categoryId, topicId, snippetId);
        state.library = await window.quickdocs.library.get();
        render();
      });
    });
  }

  function highlightAll() {
    if (!window.hljs) return;
    el.content.querySelectorAll('pre code').forEach((block) => {
      window.hljs.highlightElement(block);
    });
  }

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeAttr(str) {
    return escapeHTML(str);
  }

  // ---------------------------------------------------------------------
  // Búsqueda
  // ---------------------------------------------------------------------

  let searchDebounce = null;
  el.searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.query = el.searchInput.value;
      el.searchClear.hidden = !state.query;
      render();
    }, 80);
  });

  function clearSearch() {
    state.query = '';
    el.searchInput.value = '';
    el.searchClear.hidden = true;
    render();
  }
  el.searchClear.addEventListener('click', () => {
    clearSearch();
    el.searchInput.focus();
  });

  el.backBtn.addEventListener('click', goBack);
  el.closePanelBtn.addEventListener('click', () => window.quickdocs.app.close());

  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') {
      if (!document.getElementById('add-modal').hidden) return closeModal('add-modal');
      if (!document.getElementById('settings-modal').hidden) return closeModal('settings-modal');
      if (!el.menuPopover.hidden) return (el.menuPopover.hidden = true);
      if (state.query) return clearSearch();
      if (state.view !== 'categories') return goBack();
      window.quickdocs.app.close();
    }
  });

  // ---------------------------------------------------------------------
  // Menú "•••"
  // ---------------------------------------------------------------------

  el.menuBtn.addEventListener('click', (evt) => {
    evt.stopPropagation();
    el.menuPopover.hidden = !el.menuPopover.hidden;
  });
  document.addEventListener('click', (evt) => {
    if (!el.menuPopover.hidden && !el.menuPopover.contains(evt.target) && evt.target !== el.menuBtn) {
      el.menuPopover.hidden = true;
    }
  });

  el.menuAdd.addEventListener('click', () => {
    el.menuPopover.hidden = true;
    openAddModal();
  });
  el.menuSettings.addEventListener('click', () => {
    el.menuPopover.hidden = true;
    openSettingsModal();
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (evt) => {
      if (evt.target === overlay) closeModal(overlay.id);
    });
  });

  function openModal(id) {
    document.getElementById(id).hidden = false;
  }
  function closeModal(id) {
    document.getElementById(id).hidden = true;
  }

  // ---------------------------------------------------------------------
  // Modal: agregar documentación
  // ---------------------------------------------------------------------

  const fieldCategory = document.getElementById('field-category');
  const fieldCategoryNewWrap = document.getElementById('field-category-new-wrap');
  const fieldCategoryNew = document.getElementById('field-category-new');
  const fieldCategoryEmoji = document.getElementById('field-category-emoji');
  const fieldTopic = document.getElementById('field-topic');
  const fieldTopicNewWrap = document.getElementById('field-topic-new-wrap');
  const fieldTopicNew = document.getElementById('field-topic-new');
  const fieldTags = document.getElementById('field-tags');
  const addModalTitle = document.getElementById('add-modal-title');
  const addFormSubmit = document.getElementById('add-form-submit');

  // Pasa un snippet existente ({categoryId, topicId, snippetId, snippet}) para
  // editarlo; sin argumentos, abre el formulario en blanco para crear uno nuevo.
  function openAddModal(editing) {
    state.editingSnippet = editing || null;
    populateCategorySelect();
    if (editing) fieldCategory.value = editing.categoryId;
    fieldCategoryNewWrap.hidden = fieldCategory.value !== '__new__';
    populateTopicSelect();
    if (editing) fieldTopic.value = editing.topicId;
    fieldTopicNewWrap.hidden = fieldTopic.value !== '__new__';

    document.getElementById('field-title').value = editing ? editing.snippet.title : '';
    document.getElementById('field-description').value = editing ? editing.snippet.description || '' : '';
    document.getElementById('field-language').value = editing ? editing.snippet.language || 'bash' : 'bash';
    document.getElementById('field-code').value = editing ? editing.snippet.code || '' : '';
    fieldTags.value = editing ? (editing.snippet.tags || []).join(', ') : '';
    fieldCategoryEmoji.value = '';

    addModalTitle.textContent = editing ? 'Editar comando' : 'Agregar documentación';
    addFormSubmit.textContent = editing ? 'Guardar cambios' : 'Guardar';
    resetFormatHint();

    openModal('add-modal');
    document.getElementById('field-title').focus();
  }

  function populateCategorySelect() {
    const preselect = state.categoryId;
    fieldCategory.innerHTML =
      state.library.categories.map((c) => `<option value="${escapeAttr(c.id)}">${escapeHTML(c.name)}</option>`).join('') +
      `<option value="__new__">＋ Nueva categoría…</option>`;
    if (preselect) fieldCategory.value = preselect;
  }

  function populateTopicSelect() {
    const categoryId = fieldCategory.value;
    const category = findCategory(categoryId);
    const topics = category ? category.topics : [];
    fieldTopic.innerHTML =
      topics.map((t) => `<option value="${escapeAttr(t.id)}">${escapeHTML(t.name)}</option>`).join('') +
      `<option value="__new__">＋ Nuevo tema…</option>`;
    if (state.topicId && topics.some((t) => t.id === state.topicId)) {
      fieldTopic.value = state.topicId;
    }
    fieldTopicNewWrap.hidden = fieldTopic.value !== '__new__';
  }

  fieldCategory.addEventListener('change', () => {
    fieldCategoryNewWrap.hidden = fieldCategory.value !== '__new__';
    populateTopicSelect();
  });
  fieldTopic.addEventListener('change', () => {
    fieldTopicNewWrap.hidden = fieldTopic.value !== '__new__';
  });

  document.getElementById('add-form').addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const submitBtn = evt.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      let categoryId = fieldCategory.value;
      if (categoryId === '__new__') {
        const name = fieldCategoryNew.value.trim();
        if (!name) return fieldCategoryNew.focus();
        const created = await window.quickdocs.library.addCategory({
          name,
          icon: fieldCategoryEmoji.value.trim() || undefined,
        });
        categoryId = created.id;
      }

      let topicId = fieldTopic.value;
      if (topicId === '__new__') {
        const name = fieldTopicNew.value.trim();
        if (!name) return fieldTopicNew.focus();
        const created = await window.quickdocs.library.addTopic(categoryId, { name });
        topicId = created.id;
      }

      const title = document.getElementById('field-title').value.trim();
      if (!title) return document.getElementById('field-title').focus();

      const payload = {
        title,
        description: document.getElementById('field-description').value.trim(),
        language: document.getElementById('field-language').value,
        code: document.getElementById('field-code').value,
        tags: fieldTags.value.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (state.editingSnippet) {
        const { categoryId: oldCategoryId, topicId: oldTopicId, snippetId } = state.editingSnippet;
        if (oldCategoryId === categoryId && oldTopicId === topicId) {
          await window.quickdocs.library.updateSnippet(categoryId, topicId, snippetId, payload);
        } else {
          // Cambió de categoría/tema: se "mueve" borrando de la ubicación
          // vieja y creando en la nueva (conserva el resto de snippets intactos).
          await window.quickdocs.library.deleteSnippet(oldCategoryId, oldTopicId, snippetId);
          await window.quickdocs.library.addSnippet(categoryId, topicId, payload);
        }
      } else {
        await window.quickdocs.library.addSnippet(categoryId, topicId, payload);
      }

      state.editingSnippet = null;
      state.library = await window.quickdocs.library.get();
      closeModal('add-modal');
      clearSearch(); // por si se agregó/editó estando en medio de una búsqueda
      goToSnippets(categoryId, topicId);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---------------------------------------------------------------------
  // Formatear código con Prettier (⌘S / Ctrl+S mientras se edita el snippet)
  // ---------------------------------------------------------------------

  const PRETTIER_SPEC_BY_LANGUAGE = {
    javascript: { parser: 'babel', plugins: ['babel', 'estree'] },
    typescript: { parser: 'typescript', plugins: ['typescript', 'estree'] },
    // printWidth: 1 fuerza a Prettier a expandir SIEMPRE en varias líneas,
    // aunque el objeto sea corto y "cabría" en una sola. Para JSON es lo
    // que se espera (un objeto de ejemplo siempre legible, con cada
    // propiedad en su línea) — por eso solo se lo aplicamos a este parser.
    json: { parser: 'json', plugins: ['babel', 'estree'], options: { printWidth: 1 } },
    yaml: { parser: 'yaml', plugins: ['yaml'] },
  };
  const DEFAULT_FORMAT_HINT = '⌘S para formatear (JS/TS/JSON/YAML)';
  let formatHintTimer = null;

  function resetFormatHint() {
    clearTimeout(formatHintTimer);
    el.formatHint.textContent = DEFAULT_FORMAT_HINT;
    el.formatHint.classList.remove('status-ok', 'status-error');
  }

  function flashFormatHint(message, ok) {
    clearTimeout(formatHintTimer);
    el.formatHint.textContent = message;
    el.formatHint.classList.toggle('status-ok', ok);
    el.formatHint.classList.toggle('status-error', !ok);
    formatHintTimer = setTimeout(resetFormatHint, 2500);
  }

  async function formatCodeField() {
    const textarea = document.getElementById('field-code');
    const language = document.getElementById('field-language').value;
    const spec = PRETTIER_SPEC_BY_LANGUAGE[language];
    if (!spec) {
      flashFormatHint(`Prettier no formatea "${language}" todavía`, false);
      return;
    }
    if (!window.prettierStandalone) {
      flashFormatHint('Formateador no disponible', false);
      return;
    }
    try {
      const plugins = spec.plugins.map((name) => window.prettierPlugins[name]);
      const formatted = await window.prettierStandalone.format(textarea.value, {
        parser: spec.parser,
        plugins,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        useTabs: false,
        ...spec.options,
      });
      textarea.value = formatted;
      flashFormatHint('Formateado ✓', true);
    } catch (err) {
      flashFormatHint('Hay un error de sintaxis en el código', false);
    }
  }

  document.getElementById('field-code').addEventListener('keydown', (evt) => {
    const isSave = (evt.metaKey || evt.ctrlKey) && evt.key.toLowerCase() === 's';
    if (!isSave) return;
    evt.preventDefault();
    formatCodeField();
  });

  document.getElementById('field-language').addEventListener('change', resetFormatHint);

  // ---------------------------------------------------------------------
  // Exportar / importar documentación
  // ---------------------------------------------------------------------

  let footerResetTimer = null;
  function flashFooterStatus(message) {
    clearTimeout(footerResetTimer);
    el.footerStatus.textContent = message;
    footerResetTimer = setTimeout(() => {
      el.footerStatus.textContent = state.userLabel || 'Modo local';
    }, 3500);
  }

  el.menuExport.addEventListener('click', async () => {
    el.menuPopover.hidden = true;
    const result = await window.quickdocs.library.export();
    if (!result.canceled) {
      const filename = result.filePath.split(/[\\/]/).pop();
      flashFooterStatus(`Exportado a ${filename}`);
    }
  });

  el.menuImport.addEventListener('click', async () => {
    el.menuPopover.hidden = true;
    try {
      const result = await window.quickdocs.library.import();
      if (result.canceled) return;
      state.library = await window.quickdocs.library.get();
      const { categories, topics, snippets } = result.summary;
      flashFooterStatus(`Importado: +${categories} cat. · +${topics} temas · +${snippets} comandos`);
      render();
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`);
    }
  });

  // ---------------------------------------------------------------------
  // Modal: configuración
  // ---------------------------------------------------------------------

  function openSettingsModal() {
    applySettingsToUI();
    document.getElementById('shortcut-display').textContent = prettyShortcut(state.appConfig?.globalShortcut);
    document.getElementById('version-label').textContent = state.appConfig?.version
      ? `QuickDocs v${state.appConfig.version}`
      : '';
    renderManageCategories();
    openModal('settings-modal');
  }

  function renderManageCategories() {
    const categories = state.library.categories;
    if (!categories.length) {
      el.manageCategoriesList.innerHTML = `<div class="manage-list-empty">Sin categorías todavía.</div>`;
      return;
    }
    el.manageCategoriesList.innerHTML = categories
      .map((cat) => {
        const count = cat.topics.reduce((n, t) => n + t.snippets.length, 0);
        return `
          <div class="manage-list-item">
            <span>${cat.icon || '📁'}</span>
            <span class="manage-list-name">${escapeHTML(cat.name)} · ${count}</span>
            <button class="list-item-delete" data-manage-delete="${escapeAttr(cat.id)}" title="Eliminar" aria-label="Eliminar">🗑</button>
          </div>`;
      })
      .join('');
    el.manageCategoriesList.querySelectorAll('[data-manage-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteCategoryFlow(btn.dataset.manageDelete);
        renderManageCategories();
      });
    });
  }

  function prettyShortcut(accelerator) {
    if (!accelerator) return '';
    return accelerator
      .replace('CommandOrControl', '⌘')
      .replace('Command', '⌘')
      .replace('Control', '⌃')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace(/\+/g, ' ');
  }

  function applySettingsToUI() {
    document.querySelectorAll('#theme-options .segmented-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === (state.settings.theme || 'system'));
    });
    document.querySelectorAll('#accent-options .swatch').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.accent === (state.settings.accentColor || 'blue'));
    });
    document.getElementById('start-at-login-toggle').checked = !!state.settings.startAtLogin;
  }

  document.querySelectorAll('#theme-options .segmented-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.settings = await window.quickdocs.settings.set({ theme: btn.dataset.theme });
      applyTheme();
      applySettingsToUI();
    });
  });

  document.querySelectorAll('#accent-options .swatch').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.settings = await window.quickdocs.settings.set({ accentColor: btn.dataset.accent });
      applyTheme();
      applySettingsToUI();
    });
  });

  document.getElementById('start-at-login-toggle').addEventListener('change', async (evt) => {
    state.settings = await window.quickdocs.settings.set({ startAtLogin: evt.target.checked });
  });

  init();
})();
