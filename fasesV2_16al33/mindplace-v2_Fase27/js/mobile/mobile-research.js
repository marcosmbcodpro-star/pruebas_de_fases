/**
 * Fase 22 — modo investigación móvil.
 *
 * Orquesta acciones rápidas sobre el caso actual sin duplicar la lógica del
 * editor legacy. Conserva un punto de retorno para recuperar rápidamente el
 * contexto del tablero después de capturar información.
 */

const RETURN_KEY = 'mindplace-mobile-research-return-v1';
const MAX_RETURN_AGE = 1000 * 60 * 60 * 12;

function safeJsonParse(value, fallback = null) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function readReturnContext() {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const context = safeJsonParse(raw, null);
    if (!context || !Number.isFinite(Number(context.savedAt))) return null;
    if (Date.now() - Number(context.savedAt) > MAX_RETURN_AGE) {
      sessionStorage.removeItem(RETURN_KEY);
      return null;
    }
    return context;
  } catch (_) {
    return null;
  }
}

function writeReturnContext(context) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ ...context, savedAt: Date.now() }));
  } catch (_) {
    // sessionStorage puede estar restringido en navegación privada o políticas del navegador.
  }
}

function clearReturnContext() {
  try { sessionStorage.removeItem(RETURN_KEY); } catch (_) {}
}

export function createMobileResearchController({
  getCurrentCaseId = () => null,
  getCurrentCaseTitle = () => '',
  getSelectedCardId = () => null,
  getSelectedCardLabel = () => '',
  getNavigation = () => null,
  setSelectedCard = () => {},
  openCase = async () => false,
  restoreNavigation = () => false,
  runAction = async () => false,
  onState = () => {}
} = {}) {
  let mode = true;
  let busy = false;

  function emit() {
    try {
      onState({
        mode,
        busy,
        hasReturnContext: Boolean(readReturnContext()),
        context: readReturnContext()
      });
    } catch (_) {}
  }

  function enter() {
    mode = true;
    emit();
    return { mode, context: readReturnContext() };
  }

  function leave() {
    mode = false;
    emit();
    return mode;
  }

  function captureContext(reason = 'investigacion') {
    const caseId = getCurrentCaseId();
    if (!caseId) return null;
    const context = {
      reason,
      caseId: String(caseId),
      caseTitle: String(getCurrentCaseTitle() || ''),
      selectedCardId: getSelectedCardId() || null,
      selectedCardLabel: String(getSelectedCardLabel() || ''),
      navigation: getNavigation() || null
    };
    writeReturnContext(context);
    emit();
    return context;
  }

  async function quickAction(command) {
    if (busy) return false;
    captureContext(command);
    busy = true;
    emit();
    try {
      const result = await runAction(command);
      emit();
      return result !== false;
    } finally {
      busy = false;
      emit();
    }
  }

  async function returnToContext() {
    if (busy) return false;
    const context = readReturnContext();
    if (!context?.caseId) return false;
    busy = true;
    emit();
    try {
      if (String(getCurrentCaseId() || '') !== String(context.caseId)) {
        const ok = await openCase(context.caseId);
        if (ok === false) return false;
      }
      setSelectedCard(context.selectedCardId || null);
      if (context.navigation) {
        try {
          // El legacy ya tiene el estado persistido; restauramos el viewport
          // mediante su API centralizada para no duplicar la lógica del tablero.
          restoreNavigation(context.navigation);
        } catch (_) {}
      } else {
        restoreNavigation();
      }
      clearReturnContext();
      emit();
      return true;
    } finally {
      busy = false;
      emit();
    }
  }

  function getState() {
    return { mode, busy, hasReturnContext: Boolean(readReturnContext()), context: readReturnContext() };
  }

  function destroy() {
    // No hay listeners globales: el controlador se puede liberar directamente.
  }

  enter();
  return { enter, leave, captureContext, quickAction, returnToContext, getState, destroy };
}

export { RETURN_KEY };
