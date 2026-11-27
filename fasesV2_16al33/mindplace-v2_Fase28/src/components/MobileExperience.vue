<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../stores/ui';
import { router } from '../router';

type MobilePanel = 'none' | 'cases' | 'research' | 'actions' | 'search' | 'more';
type MobileBoardMode = 'overview' | 'focus' | 'branch';
type MobileCommand =
  | 'back-cases'
  | 'center'
  | 'search'
  | 'settings'
  | 'prev-case'
  | 'next-case'
  | 'new-case'
  | 'new-note'
  | 'new-person'
  | 'new-evidence'
  | 'new-photo'
  | 'research-quick-evidence'
  | 'research-quick-note'
  | 'research-quick-person'
  | 'research-quick-connection'
  | 'research-photo'
  | 'research-document'
  | 'return-research-context'
  | 'new-connection'
  | 'board-zoom-in'
  | 'board-zoom-out'
  | 'board-fit'
  | 'board-focus'
  | 'board-branch'
  | 'board-next'
  | 'board-prev'
  | 'board-minimap'
  | 'board-toggle-focus-mode';

const uiStore = useUiStore();
const touchFeedback = ref(false);
const boardMode = ref<MobileBoardMode>('overview');
const boardHasSelection = ref(false);
const boardCardLabel = ref('Tarjeta seleccionada');
const researchState = ref<{ hasReturnContext: boolean; busy: boolean; context?: { caseTitle?: string; selectedCardLabel?: string } | null }>({ hasReturnContext: false, busy: false, context: null });

const panel = computed<MobilePanel>({
  get: () => (uiStore.mobilePanel as MobilePanel) || 'none',
  set: (value) => uiStore.setMobilePanel(value)
});

const isPanelOpen = computed(() => panel.value !== 'none');

function vibrate(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(8); } catch { /* Algunos navegadores bloquean la vibración. */ }
  }
  touchFeedback.value = true;
  window.setTimeout(() => { touchFeedback.value = false; }, 110);
}

function handleBoardMessage(event: MessageEvent): void {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.type !== 'mindplace:board-state') return;
  boardHasSelection.value = Boolean(data.selectedCardId);
  boardCardLabel.value = String(data.selectedLabel || 'Tarjeta seleccionada');
  return;
}

window.addEventListener('message', handleBoardMessage);

function handleResearchMessage(event: MessageEvent): void {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.type !== 'mindplace:research-state') return;
  researchState.value = {
    hasReturnContext: Boolean(data.hasReturnContext),
    busy: Boolean(data.busy),
    context: data.context || null
  };
}
window.addEventListener('message', handleResearchMessage);

function send(command: MobileCommand, payload: Record<string, unknown> = {}): void {
  vibrate();
  const frame = document.querySelector<HTMLIFrameElement>('.legacy-workspace__frame');
  const target = frame?.contentWindow;
  if (target) target.postMessage({ type: 'mindplace:mobile-command', command, ...payload }, window.location.origin);
  else window.postMessage({ type: 'mindplace:mobile-command', command, ...payload }, window.location.origin);
}

function open(target: Exclude<MobilePanel, 'none'>): void {
  vibrate();
  panel.value = panel.value === target ? 'none' : target;
}

function close(): void {
  panel.value = 'none';
}

function toggleBoardMode(): void {
  boardMode.value = boardMode.value === 'overview' ? 'focus' : boardMode.value === 'focus' ? 'branch' : 'overview';
  send('board-toggle-focus-mode', { mode: boardMode.value });
}

function execute(command: MobileCommand): void {
  if (command === 'search') {
    close();
    void router.push('/fase-28');
    vibrate();
    return;
  }
  send(command);
  close();
}
</script>

<template>
  <div class="mobile-experience" :class="{ 'mobile-experience--feedback': touchFeedback }" aria-label="Navegación móvil de MindPlace">
    <div v-if="isPanelOpen" class="mobile-scrim" aria-hidden="true" @click="close"></div>
    <section class="mobile-board-controls" aria-label="Controles del tablero móvil">
      <div class="mobile-board-controls__row">
        <button type="button" class="mobile-board-pill" @click="execute('board-zoom-out')" aria-label="Alejar tablero">−</button>
        <button type="button" class="mobile-board-pill mobile-board-pill--wide" @click="execute('board-fit')">Ajustar</button>
        <button type="button" class="mobile-board-pill" @click="execute('board-zoom-in')" aria-label="Acercar tablero">＋</button>
        <button type="button" class="mobile-board-pill" :class="{ active: boardMode !== 'overview' }" @click="toggleBoardMode" aria-label="Cambiar modo de enfoque">{{ boardMode === 'overview' ? '◉' : boardMode === 'focus' ? '◎' : '◌' }}</button>
      </div>
      <div v-if="boardHasSelection" class="mobile-context-bar">
        <span class="mobile-context-bar__label">{{ boardCardLabel }}</span>
        <button type="button" @click="execute('board-focus')">Enfocar</button>
        <button type="button" @click="execute('board-branch')">Rama</button>
        <button type="button" @click="execute('new-connection')">Conectar</button>
      </div>
      <button type="button" class="mobile-minimap-toggle" @click="execute('board-minimap')">Mapa</button>
    </section>

    <section v-if="panel === 'cases'" class="mobile-sheet" aria-label="Navegación de casos">
      <div class="mobile-sheet__handle"></div>
      <header class="mobile-sheet__header">
        <div>
          <p class="mobile-kicker">MINDPLACE</p>
          <h2>Casos</h2>
        </div>
        <button type="button" class="mobile-icon-button" aria-label="Cerrar" @click="close">×</button>
      </header>
      <div class="mobile-sheet__grid">
        <button type="button" class="mobile-action-card mobile-action-card--primary" @click="execute('back-cases')">
          <span class="mobile-action-card__icon">▣</span><span>Archivo de casos</span>
        </button>
        <button type="button" class="mobile-action-card" @click="execute('prev-case')">
          <span class="mobile-action-card__icon">←</span><span>Caso anterior</span>
        </button>
        <button type="button" class="mobile-action-card" @click="execute('next-case')">
          <span class="mobile-action-card__icon">→</span><span>Siguiente caso</span>
        </button>
        <button type="button" class="mobile-action-card" @click="execute('new-case')">
          <span class="mobile-action-card__icon">＋</span><span>Nuevo caso</span>
        </button>
      </div>
    </section>

    <section v-else-if="panel === 'research'" class="mobile-sheet mobile-research-sheet" aria-label="Modo investigación móvil">
      <div class="mobile-sheet__handle"></div>
      <header class="mobile-sheet__header">
        <div>
          <p class="mobile-kicker">INVESTIGACIÓN MÓVIL</p>
          <h2>Captura rápida</h2>
        </div>
        <button type="button" class="mobile-icon-button" aria-label="Cerrar" @click="close">×</button>
      </header>
      <p class="mobile-sheet__hint mobile-sheet__hint--research">Registra información con el mínimo de pasos. El punto de trabajo se conserva para volver después.</p>
      <div class="mobile-research">
        <div class="mobile-research__status">
          <strong>{{ researchState.busy ? 'Procesando…' : 'Listo para capturar' }}</strong>
          <span v-if="researchState.hasReturnContext">Contexto guardado</span>
        </div>
        <div class="mobile-research__grid">
          <button type="button" class="research-action" :disabled="researchState.busy" @click="execute('research-quick-evidence')"><span class="research-action__icon">◈</span><span><strong>Nueva evidencia</strong><small>Registrar un dato o indicio</small></span></button>
          <button type="button" class="research-action" :disabled="researchState.busy" @click="execute('research-quick-note')"><span class="research-action__icon">✎</span><span><strong>Nueva nota</strong><small>Anotar observaciones</small></span></button>
          <button type="button" class="research-action" :disabled="researchState.busy" @click="execute('research-quick-person')"><span class="research-action__icon">●</span><span><strong>Nueva persona</strong><small>Registrar una persona</small></span></button>
          <button type="button" class="research-action" :disabled="researchState.busy" @click="execute('research-quick-connection')"><span class="research-action__icon">↗</span><span><strong>Nueva conexión</strong><small>Relacionar información</small></span></button>
          <button type="button" class="research-action research-action--camera" :disabled="researchState.busy" @click="execute('research-photo')"><span class="research-action__icon">📷</span><span><strong>Adjuntar fotografía</strong><small>Capturar con cámara o elegir una imagen</small></span></button>
          <button type="button" class="research-action research-action--camera" :disabled="researchState.busy" @click="execute('research-document')"><span class="research-action__icon">📄</span><span><strong>Escanear documento</strong><small>Capturar/adjuntar PDF, imagen o archivo</small></span></button>
          <button type="button" class="research-action" :disabled="researchState.busy" @click="execute('search')"><span class="research-action__icon">⌕</span><span><strong>Buscar</strong><small>Localizar datos del caso</small></span></button>
        </div>
        <div v-if="researchState.hasReturnContext" class="research-context">
          <span class="research-context__label">PUNTO DE RETORNO</span>
          <span class="research-context__text">{{ researchState.context?.caseTitle || 'Caso actual' }}<template v-if="researchState.context?.selectedCardLabel"> · {{ researchState.context.selectedCardLabel }}</template></span>
          <button type="button" class="research-context__button" :disabled="researchState.busy" @click="execute('return-research-context')">Volver al contexto</button>
        </div>
      </div>
    </section>

    <section v-else-if="panel === 'actions'" class="mobile-sheet" aria-label="Acciones rápidas">
      <div class="mobile-sheet__handle"></div>
      <header class="mobile-sheet__header">
        <div>
          <p class="mobile-kicker">ACCIÓN RÁPIDA</p>
          <h2>Añadir información</h2>
        </div>
        <button type="button" class="mobile-icon-button" aria-label="Cerrar" @click="close">×</button>
      </header>
      <p class="mobile-sheet__hint">La información se añadirá al caso actual, usando la tarjeta seleccionada como punto de partida cuando corresponda.</p>
      <div class="mobile-sheet__grid mobile-sheet__grid--six">
        <button type="button" class="mobile-action-card" @click="execute('new-evidence')"><span class="mobile-action-card__icon">◈</span><span>Nueva evidencia</span></button>
        <button type="button" class="mobile-action-card" @click="execute('new-note')"><span class="mobile-action-card__icon">✎</span><span>Nueva nota</span></button>
        <button type="button" class="mobile-action-card" @click="execute('new-person')"><span class="mobile-action-card__icon">●</span><span>Nueva persona</span></button>
        <button type="button" class="mobile-action-card" @click="execute('new-connection')"><span class="mobile-action-card__icon">↗</span><span>Nueva conexión</span></button>
        <button type="button" class="mobile-action-card" @click="execute('new-photo')"><span class="mobile-action-card__icon">▧</span><span>Fotografía</span></button>
        <button type="button" class="mobile-action-card" @click="execute('search')"><span class="mobile-action-card__icon">⌕</span><span>Buscar</span></button>
      </div>
    </section>

    <section v-else-if="panel === 'search'" class="mobile-sheet" aria-label="Búsqueda móvil">
      <div class="mobile-sheet__handle"></div>
      <header class="mobile-sheet__header">
        <div>
          <p class="mobile-kicker">INVESTIGACIÓN</p>
          <h2>Buscar</h2>
        </div>
        <button type="button" class="mobile-icon-button" aria-label="Cerrar" @click="close">×</button>
      </header>
      <p class="mobile-sheet__hint">Se abrirá la búsqueda nativa de MindPlace para conservar los filtros y resultados actuales.</p>
      <button type="button" class="mobile-primary-button" @click="execute('search')">Abrir búsqueda</button>
    </section>

    <section v-else-if="panel === 'more'" class="mobile-sheet" aria-label="Más opciones">
      <div class="mobile-sheet__handle"></div>
      <header class="mobile-sheet__header">
        <div>
          <p class="mobile-kicker">MINDPLACE</p>
          <h2>Más</h2>
        </div>
        <button type="button" class="mobile-icon-button" aria-label="Cerrar" @click="close">×</button>
      </header>
      <div class="mobile-sheet__list">
        <button type="button" class="mobile-list-action" @click="execute('center')"><span>🎯</span><span><strong>Centrar tablero</strong><small>Recoloca la vista en el conjunto del caso</small></span><b>›</b></button>
        <button type="button" class="mobile-list-action" @click="execute('settings')"><span>⚙</span><span><strong>Ajustes</strong><small>Preferencias y personalización</small></span><b>›</b></button>
      </div>
    </section>

    <nav class="mobile-bottom-nav" aria-label="Navegación principal móvil">
      <button type="button" :class="{ active: panel === 'cases' }" @click="open('cases')" aria-label="Casos"><span>▣</span><small>Casos</small></button>
      <button type="button" :class="{ active: panel === 'none' }" @click="execute('center')" aria-label="Tablero"><span>⌗</span><small>Tablero</small></button>
      <button type="button" class="mobile-bottom-nav__main" :class="{ active: panel === 'research' }" @click="open('research')" aria-label="Modo investigación"><span>＋</span><small>Investigar</small></button>
      <button type="button" :class="{ active: panel === 'search' }" @click="open('search')" aria-label="Buscar"><span>⌕</span><small>Buscar</small></button>
      <button type="button" :class="{ active: panel === 'more' }" @click="open('more')" aria-label="Más"><span>⋯</span><small>Más</small></button>
    </nav>
  </div>
</template>

<style scoped>
.mobile-experience { display: none; }

.mobile-board-controls { display:none; }


@media (max-width: 900px) {
  .mobile-experience { display: block; position: fixed; inset: 0; z-index: 100; pointer-events: none; }
  .mobile-experience > * { pointer-events: auto; }
  .mobile-board-controls {
    position: fixed; z-index: 2; left: 10px; right: 10px; top: calc(10px + env(safe-area-inset-top));
    display:flex; flex-direction:column; align-items:stretch; gap:6px; pointer-events:auto;
  }
  .mobile-board-controls__row { display:flex; align-items:center; gap:6px; }
  .mobile-board-pill { width:42px; min-height:42px; border:1px solid rgba(255,255,255,.13); border-radius:13px; background:rgba(12,16,23,.86); color:#fff; font:800 16px system-ui,sans-serif; backdrop-filter:blur(12px); }
  .mobile-board-pill--wide { flex:1; font-size:12px; }
  .mobile-board-pill.active { background:rgba(255,255,255,.17); }
  .mobile-context-bar { display:flex; align-items:center; gap:5px; max-width:100%; padding:6px; border:1px solid rgba(255,255,255,.11); border-radius:13px; background:rgba(12,16,23,.88); backdrop-filter:blur(12px); overflow:auto; }
  .mobile-context-bar__label { min-width:0; flex:1; padding:0 5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:rgba(255,255,255,.78); font-size:11px; font-weight:700; }
  .mobile-context-bar button { flex:0 0 auto; min-height:34px; padding:0 10px; border:1px solid rgba(255,255,255,.12); border-radius:10px; background:rgba(255,255,255,.06); color:#fff; font-size:11px; font-weight:800; }
  .mobile-minimap-toggle { align-self:flex-end; min-height:34px; padding:0 11px; border:1px solid rgba(255,255,255,.1); border-radius:10px; background:rgba(12,16,23,.8); color:#fff; font-size:10px; font-weight:800; backdrop-filter:blur(12px); }

  .mobile-scrim { position: fixed; inset: 0; z-index: 1; background: rgba(5, 8, 13, .58); backdrop-filter: blur(2px); }
  .mobile-sheet {
    position: fixed; z-index: 3; left: 0; right: 0; bottom: calc(68px + env(safe-area-inset-bottom));
    max-height: min(78dvh, 620px); overflow: auto; padding: 10px 16px 18px;
    background: rgba(18, 23, 32, .98); border: 1px solid rgba(255,255,255,.12);
    border-bottom: 0; border-radius: 22px 22px 0 0; box-shadow: 0 -18px 50px rgba(0,0,0,.38);
    color: #f3f4f6;
  }
  .mobile-sheet__handle { width: 42px; height: 4px; margin: 2px auto 14px; border-radius: 999px; background: rgba(255,255,255,.28); }
  .mobile-sheet__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .mobile-kicker { margin: 0 0 2px; font-size: 10px; letter-spacing: .18em; font-weight: 800; opacity: .55; }
  .mobile-sheet__header h2 { margin: 0; font-size: 24px; line-height: 1.08; }
  .mobile-icon-button { width: 40px; height: 40px; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: rgba(255,255,255,.05); color: inherit; font-size: 24px; }
  .mobile-sheet__hint { margin: 12px 0 14px; font-size: 13px; line-height: 1.45; opacity: .7; }
  .mobile-sheet__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .mobile-sheet__grid--six { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mobile-action-card { min-height: 86px; padding: 13px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; gap: 8px; text-align: left; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; background: rgba(255,255,255,.045); color: inherit; font: inherit; }
  .mobile-action-card:active, .mobile-primary-button:active, .mobile-list-action:active { transform: scale(.985); }
  .mobile-action-card--primary { border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.09); }
  .mobile-action-card__icon { font-size: 22px; }
  .mobile-action-card span:last-child { font-weight: 700; font-size: 13px; line-height: 1.15; }
  .mobile-primary-button { width: 100%; min-height: 50px; border: 0; border-radius: 14px; background: #f3f4f6; color: #111827; font: 800 14px system-ui, sans-serif; }
  .mobile-sheet__list { display: grid; gap: 8px; }
  .mobile-list-action { display: grid; grid-template-columns: 34px minmax(0,1fr) 20px; align-items: center; gap: 10px; width: 100%; padding: 13px; text-align: left; border: 1px solid rgba(255,255,255,.1); border-radius: 14px; background: rgba(255,255,255,.045); color: inherit; }
  .mobile-list-action > span:first-child { font-size: 20px; text-align: center; }
  .mobile-list-action strong, .mobile-list-action small { display: block; }
  .mobile-list-action small { margin-top: 2px; font-size: 11px; line-height: 1.3; opacity: .55; }
  .mobile-list-action b { text-align: right; opacity: .6; }
  .mobile-bottom-nav { position: fixed; z-index: 4; left: 0; right: 0; bottom: 0; min-height: 68px; padding: 7px max(8px, env(safe-area-inset-left)) max(7px, env(safe-area-inset-bottom)); display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 4px; box-sizing: border-box; border-top: 1px solid rgba(255,255,255,.11); background: rgba(10, 14, 21, .94); backdrop-filter: blur(14px); color: #fff; }
  .mobile-bottom-nav button { min-width: 0; min-height: 52px; border: 0; border-radius: 14px; background: transparent; color: rgba(255,255,255,.62); font: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
  .mobile-bottom-nav button span { font-size: 20px; line-height: 1; }
  .mobile-bottom-nav button small { font-size: 10px; font-weight: 700; }
  .mobile-bottom-nav button.active { color: #fff; background: rgba(255,255,255,.08); }
  .mobile-bottom-nav__main { transform: translateY(-10px); min-height: 60px !important; border: 1px solid rgba(255,255,255,.18) !important; background: #f3f4f6 !important; color: #111827 !important; box-shadow: 0 10px 24px rgba(0,0,0,.25); }
  .mobile-bottom-nav__main span { font-size: 24px !important; }
}

@media (max-width: 420px) {
  .mobile-sheet { padding-left: 12px; padding-right: 12px; }
  .mobile-sheet__grid { gap: 8px; }
  .mobile-action-card { min-height: 80px; padding: 11px; }
}
</style>
