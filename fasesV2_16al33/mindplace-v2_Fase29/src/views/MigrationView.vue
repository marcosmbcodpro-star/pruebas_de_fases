<script setup lang="ts">
import { useGlobalStore } from '../stores/global';
import { useUiStore } from '../stores/ui';
import { useCaseStore } from '../stores/case';

const globalStore = useGlobalStore();
const uiStore = useUiStore();
const caseStore = useCaseStore();
</script>

<template>
  <main class="migration-view">
    <h1>MindPlace · Fase 17</h1>
    <p>Base consolidada: Vue 3 + TypeScript + Vite + Pinia + Vue Router + IndexedDB tipado + experiencia móvil específica.</p>
    <dl>
      <div><dt>Shell Vue</dt><dd>Activo</dd></div>
      <div><dt>Legacy</dt><dd>{{ globalStore.legacyReady ? 'Compatible' : 'Cargando…' }}</dd></div>
      <div><dt>Versión legacy</dt><dd>{{ globalStore.legacyVersion || '—' }}</dd></div>
      <div><dt>Store global</dt><dd>Pinia</dd></div>
      <div><dt>Estado UI</dt><dd>{{ uiStore.currentCaseId || 'Sin caso seleccionado' }}</dd></div>
      <div><dt>Casos tipados en nueva capa</dt><dd>{{ caseStore.currentCases.length }}</dd></div>
    </dl>
  </main>
</template>

<style scoped>
.migration-view { min-height: 100dvh; box-sizing: border-box; padding: 2rem; font: 16px/1.5 system-ui, sans-serif; color: #e5e7eb; background: #111827; }
.migration-view dl { display: grid; gap: .75rem; max-width: 42rem; }
.migration-view dl > div { display: grid; grid-template-columns: 13rem 1fr; gap: 1rem; padding: .75rem; border: 1px solid #374151; border-radius: .5rem; }
.migration-view dt { font-weight: 700; }
.migration-view dd { margin: 0; }
</style>
