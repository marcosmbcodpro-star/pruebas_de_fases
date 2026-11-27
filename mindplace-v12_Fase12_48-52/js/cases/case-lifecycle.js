import { SECURITY_LIMITS } from '../core/security.js';

export function createCaseLifecycle({
  getStore,
  getState,
  setState,
  getCurrentCaseId,
  setCurrentCaseId,
  setSelectedCardId,
  getStoreIndex,
  uid,
  createCaseModel,
  saveStore,
  renderMenu,
  refreshCaseFilterControls,
  scheduleCaseFilterRefresh,
  openCase,
  render,
  resetUndoHistory,
  ensureHistory,
  closeCaseStructure,
  setCaseStructureOpenNodes,
  closeCaseSearch,
  resetCaseFilters,
  restoreCaseFilters = () => {},
  closeCaseFilters,
  closeAllStatusMenus,
  applyZoom,
  boardEl,
  topbarEl,
  hintEl,
  menuEl,
  topbarToggle,
  titleEl,
  applyCaseMeta,
  focusOnCaseMarker,
  restoreLastNavigation = () => false,
  updateTopbarToggle,
  pushUndo,
  save,
  askConfirm,
  showRecoveryNotice,
  CASE_NODE_LIMIT,
  appendCaseActivity = () => {}
}) {
  const refreshCaseMenuData = () => {
    renderMenu();
    refreshCaseFilterControls();
    scheduleCaseFilterRefresh();
    setTimeout(() => refreshCaseFilterControls(), 50);
  };

  const updateCaseMeta = async (id, title, description, status, category) => {
    const store = getStore();
    const entry = store.index.find(c => c.id === id);
    const caseData = store.cases[id];
    if (!entry || !caseData) return false;
    const changed=[];
    if(caseData.title!==title) changed.push('nombre');
    if(caseData.description!==description) changed.push('descripción');
    if(caseData.status!==status) changed.push('estado');
    if((caseData.category||'')!==(category||'')) changed.push('categoría');
    entry.title = title;
    entry.description = description;
    entry.status = status;
    entry.category = category;
    entry.updatedAt = Date.now();
    caseData.title = title;
    caseData.description = description;
    caseData.status = status;
    caseData.category = category;
    if(changed.length) appendCaseActivity(id,'Proyecto actualizado',`Se modificó: ${changed.join(', ')}.`,'update_case');
    await saveStore();
    if (getCurrentCaseId() === id) {
      setState(caseData);
      titleEl.value = caseData.title;
      applyCaseMeta();
      const markerTitleEl = document.querySelector('[data-id="__case__"] .marker-title');
      const markerDescEl = document.querySelector('[data-id="__case__"] .marker-desc');
      if (markerTitleEl) markerTitleEl.textContent = caseData.title;
      if (markerDescEl) markerDescEl.textContent = caseData.description || '';
      if (typeof window.refreshMarkerBadge === 'function') window.refreshMarkerBadge();
    }
    refreshCaseMenuData();
  };

  const createCase = async (title, description, status, category) => {
    const store = getStore();
    if(getStoreIndex().filter(c=>!c.trashedAt).length >= SECURITY_LIMITS.maxCases){
      showRecoveryNotice?.(`Has alcanzado el límite de ${SECURITY_LIMITS.maxCases} casos.`);
      return false;
    }
    const id = uid('c');
    const now = Date.now();
    const caseModel = createCaseModel({
      id,
      title,
      description,
      status,
      category: category || '',
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
      history: []
    });
    const entry = {
      id: caseModel.id,
      title: caseModel.title,
      description: caseModel.description,
      status: caseModel.status,
      category: caseModel.category,
      createdAt: now,
      updatedAt: now
    };
    store.index.push(entry);
    store.cases[id] = {
      ...caseModel,
      history: [{
        id: uid('h'),
        title: 'Proyecto creado',
        summary: 'Se creó el proyecto.',
        action: 'create_case',
        createdAt: Date.now(),
        snapshot: { title, description, status, category: category || '', nodes: [], edges: [] }
      }]
    };
    await saveStore();
    refreshCaseMenuData();
    openCase(id);
  };

  const getNextContinuationTitle = (baseTitle) => {
    const raw = String(baseTitle || 'Caso').trim() || 'Caso';
    const match = raw.match(/^(.*?)(?:\s+—\s+Parte\s+(\d+))$/i);
    const root = (match ? match[1] : raw).trim() || 'Caso';
    let part = match ? Number(match[2]) + 1 : 2;
    let title = `${root} — Parte ${part}`;
    const existing = new Set((getStoreIndex() || []).map(c => String(c.title || '').trim().toLowerCase()));
    while (existing.has(title.toLowerCase())) {
      part += 1;
      title = `${root} — Parte ${part}`;
    }
    return title;
  };

  const createContinuationCase = async () => {
    if(getStoreIndex().filter(c=>!c.trashedAt).length >= SECURITY_LIMITS.maxCases){
      showRecoveryNotice?.(`Has alcanzado el límite de ${SECURITY_LIMITS.maxCases} casos.`);
      return false;
    }
    const currentCaseId = getCurrentCaseId();
    const store = getStore();
    if (currentCaseId === null || !store.cases[currentCaseId]) return false;
    const source = store.cases[currentCaseId];
    const sourceEntry = store.index.find(c => c.id === currentCaseId);
    const title = getNextContinuationTitle(source.title || sourceEntry?.title || 'Caso');
    const description = `Continuación de "${source.title || sourceEntry?.title || 'Caso'}".`;
    const status = typeof source.status === 'string' ? source.status : (sourceEntry?.status || 'abierto');
    const category = typeof source.category === 'string' ? source.category : (sourceEntry?.category || '');
    const id = uid('c');
    const now = Date.now();
    const entry = {
      id, title, description, status, category,
      createdAt: now, updatedAt: now,
      continuationOf: currentCaseId
    };
    const nextState = {
      id, title, description, status, category,
      nodes: [], edges: [],
      continuationOf: currentCaseId,
      history: [{
        id: uid('h'), title: 'Continuación creada', summary: `Continuación de "${source.title || sourceEntry?.title || 'Caso'}".`, action: 'create_case', createdAt: now,
        snapshot: { title, description, status, category, nodes: [], edges: [] }
      }]
    };
    store.index.push(entry);
    store.cases[id] = nextState;
    const saved = await saveStore();
    if (!saved) {
      delete store.cases[id];
      store.index = store.index.filter(c => c.id !== id);
      showRecoveryNotice('⚠ No se pudo crear la continuación porque no se pudo guardar.');
      return false;
    }
    refreshCaseMenuData();
    openCase(id);
    return true;
  };

  const ensureCaseCapacityForNewNode = async () => {
    const currentCaseId = getCurrentCaseId();
    const state = getState();
    const store = getStore();
    if (currentCaseId === null || !store.cases[currentCaseId]) return true;
    const count = Array.isArray(state.nodes) ? state.nodes.length : 0;
    if (count < CASE_NODE_LIMIT) return true;
    const title = state.title || store.index.find(c => c.id === currentCaseId)?.title || 'este caso';
    const ok = await askConfirm(
      `Este caso ha alcanzado el límite de ${CASE_NODE_LIMIT} tarjetas. ¿Quieres continuar en "${getNextContinuationTitle(title)}"?`,
      'Crear continuación'
    );
    if (!ok) return false;
    await createContinuationCase();
    return false;
  };

  const applyCaseMetaLocal = () => {
    const state = getState();
    const badge = document.getElementById('caseStatusBadge');
    const descText = document.getElementById('caseDescText');
    if (!badge || !descText) return;
    badge.className = 'status-badge status-' + (state.status || 'abierto');
    const label = typeof window.statusLabel === 'function' ? window.statusLabel(state.status) : (state.status || 'Abierto');
    badge.textContent = label;
    descText.textContent = state.description ? ' — ' + state.description : '';
  };

  const cycleStatus = () => {
    pushUndo();
    const state = getState();
    const order = ['abierto', 'curso', 'resuelto'];
    const idx = order.indexOf(state.status || 'abierto');
    state.status = order[(idx + 1) % order.length];
    applyCaseMetaLocal();
    save();
  };

  const openCaseLocal = (id) => {
    closeCaseSearch();
    resetCaseFilters({persist:false});
    closeCaseFilters();
    closeAllStatusMenus();
    setCurrentCaseId(id);
    setSelectedCardId(null);
    const store = getStore();
    const nextState = store.cases[id] || { title: 'CASO SIN TÍTULO', description: '', status: 'abierto', nodes: [], edges: [], history: [] };
    setState(nextState);
    restoreCaseFilters();
    ensureHistory();
    resetUndoHistory();
    titleEl.value = nextState.title;
    applyCaseMetaLocal();
    menuEl.classList.add('hidden');
    boardEl.classList.remove('hidden');
    topbarEl.classList.remove('hidden');
    hintEl.classList.remove('hidden');
    render();
    updateTopbarToggle();
    // Mantener sincronizada la navegación Anterior/Siguiente del proyecto
    // inmediatamente después de abrir el caso. Antes dependía de un evento
    // que no se emitía en este flujo, por lo que los botones podían quedar
    // deshabilitados o reflejar el estado del caso anterior.
    try {
      if (typeof window !== 'undefined' && typeof window.refreshProjectNavigation === 'function') {
        window.refreshProjectNavigation();
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mindplace:case-opened'));
      }
    } catch {}
    setTimeout(()=>{ if(!restoreLastNavigation()) focusOnCaseMarker(); }, 30);
  };

  const backToMenu = () => {
    closeCaseStructure();
    setCaseStructureOpenNodes(new Set());
    closeCaseSearch();
    resetCaseFilters({persist:false});
    closeCaseFilters();
    closeAllStatusMenus();
    setCurrentCaseId(null);
    boardEl.classList.add('hidden');
    topbarEl.classList.add('hidden');
    hintEl.classList.add('hidden');
    topbarToggle.classList.remove('is-visible');
    menuEl.classList.remove('hidden');
    renderMenu();
    try {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mindplace:case-menu'));
    } catch {}
  };

  return {
    updateCaseMeta,
    createCase,
    getNextContinuationTitle,
    createContinuationCase,
    ensureCaseCapacityForNewNode,
    applyCaseMeta: applyCaseMetaLocal,
    cycleStatus,
    openCase: openCaseLocal,
    backToMenu
  };
}
