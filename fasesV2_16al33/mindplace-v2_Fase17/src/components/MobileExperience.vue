<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../stores/ui';

type MobilePanel = 'none' | 'cases' | 'actions' | 'search' | 'more';
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
  | 'new-connection';

const uiStore = useUiStore();
const touchFeedback = ref(false);

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

function execute(command: MobileCommand): void {
  send(command);
  close();
}
</script>

<template>
  <div class="mobile-experience" :class="{ 'mobile-experience--feedback': touchFeedback }" aria-label="Navegación móvil de MindPlace">
    <div v-if="isPanelOpen" class="mobile-scrim" aria-hidden="true" @click="close"></div>

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
      <button type="button" class="mobile-bottom-nav__main" @click="open('actions')" aria-label="Acciones rápidas"><span>＋</span><small>Añadir</small></button>
      <button type="button" :class="{ active: panel === 'search' }" @click="open('search')" aria-label="Buscar"><span>⌕</span><small>Buscar</small></button>
      <button type="button" :class="{ active: panel === 'more' }" @click="open('more')" aria-label="Más"><span>⋯</span><small>Más</small></button>
    </nav>
  </div>
</template>

<style scoped>
.mobile-experience { display: none; }

@media (max-width: 900px) {
  .mobile-experience { display: block; position: fixed; inset: 0; z-index: 100; pointer-events: none; }
  .mobile-experience > * { pointer-events: auto; }
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
