export function createHistoryManager({
  getState,
  setState,
  cloneState,
  uid,
  save,
  render,
  drawStrings,
  scheduleSave,
  maxUndo = 80,
  maxCheckpoints = 50
} = {}) {
  let undoStack = [];
  let redoStack = [];
  let undoSuppressed = false;

  function historySnapshot() {
    const copy = cloneState(getState());
    if (!copy) return {};
    delete copy.history;
    return copy;
  }

  function ensureHistory() {
    const current = getState();
    if (!Array.isArray(current.history)) current.history = [];
  }

  function formatHistoryDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function renderHistory() {
    const panel = document.getElementById('historyPanel');
    const list = document.getElementById('historyList');
    if (!panel || !list) return;

    ensureHistory();
    list.innerHTML = '';
    const current = getState();

    if (current.history.length === 0) {
      list.innerHTML = '<div class="history-empty">Todavía no hay puntos de control guardados.</div>';
      return;
    }

    [...current.history].reverse().forEach((entry, reverseIndex) => {
      const item = document.createElement('div');
      item.className = 'history-item' + (reverseIndex === 0 ? ' active' : '');

      const row = document.createElement('div');
      row.className = 'history-row';

      const title = document.createElement('div');
      title.className = 'history-title';
      title.textContent = entry.title || 'Punto de control';
      row.appendChild(title);

      const restore = document.createElement('button');
      restore.className = 'history-restore';
      restore.textContent = 'Restaurar';
      restore.addEventListener('click', event => {
        event.stopPropagation();
        restoreHistory(entry.id);
      });
      row.appendChild(restore);
      item.appendChild(row);

      const date = document.createElement('div');
      date.className = 'history-date';
      date.textContent = formatHistoryDate(entry.createdAt);
      item.appendChild(date);

      const count = document.createElement('div');
      count.className = 'history-count';
      count.textContent = `${(entry.snapshot.nodes || []).length} etiquetas · ${(entry.snapshot.edges || []).length} conexiones`;
      item.appendChild(count);

      list.appendChild(item);
    });
  }

  function addHistoryCheckpoint(title) {
    ensureHistory();
    const current = getState();
    current.history.push({
      id: uid('h'),
      title: title || 'Punto de control',
      createdAt: Date.now(),
      snapshot: historySnapshot()
    });
    if (current.history.length > maxCheckpoints) current.history.shift();
    save();
    renderHistory();
  }

  function restoreHistory(historyId) {
    ensureHistory();
    const current = getState();
    const entry = current.history.find(item => item.id === historyId);
    if (!entry) return;

    pushUndo();
    const keptHistory = current.history;
    const nextState = cloneState(entry.snapshot);
    if (!nextState) return;

    setState(nextState);
    const restored = getState();
    restored.history = keptHistory;
    save();
    render();
    drawStrings();
    renderHistory();
  }

  function snapshotState() {
    return JSON.stringify(getState());
  }

  function pushUndo() {
    if (undoSuppressed) return;
    undoStack.push(snapshotState());
    if (undoStack.length > maxUndo) undoStack.shift();
    redoStack = [];
  }

  function performUndo() {
    if (undoStack.length === 0) return;
    undoSuppressed = true;
    try {
      redoStack.push(snapshotState());
      setState(JSON.parse(undoStack.pop()));
      render();
      drawStrings();
      scheduleSave();
    } finally {
      undoSuppressed = false;
    }
  }

  function performRedo() {
    if (redoStack.length === 0) return;
    undoSuppressed = true;
    try {
      undoStack.push(snapshotState());
      setState(JSON.parse(redoStack.pop()));
      render();
      drawStrings();
      scheduleSave();
    } finally {
      undoSuppressed = false;
    }
  }

  function resetUndoHistory() {
    undoStack = [];
    redoStack = [];
  }

  return {
    historySnapshot,
    ensureHistory,
    formatHistoryDate,
    renderHistory,
    addHistoryCheckpoint,
    restoreHistory,
    snapshotState,
    pushUndo,
    performUndo,
    performRedo,
    resetUndoHistory,
    isUndoSuppressed: () => undoSuppressed
  };
}
