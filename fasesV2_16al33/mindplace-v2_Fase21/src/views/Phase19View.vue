<script setup lang="ts">
import { useGlobalStore } from '../stores/global';
import { useUiStore } from '../stores/ui';

const globalStore = useGlobalStore();
const uiStore = useUiStore();
</script>

<template>
  <main class="phase19-view">
    <p class="eyebrow">FASE 19 · 237–248</p>
    <h1>Gestos táctiles avanzados</h1>
    <p>MindPlace centraliza pinch zoom, paneo de dos dedos, arrastre, pulsación larga, doble toque y navegación por deslizamiento, evitando conflictos con edición y selección.</p>
    <section class="phase19-card">
      <strong>Estado</strong>
      <span>Arquitectura: {{ globalStore.architecture }}</span>
      <span>Gestos avanzados: configurables desde Ajustes</span>
      <span>Modo móvil: {{ uiStore.mobileNavMode }}</span>
    </section>
  </main>
</template>

<style scoped>
.phase19-view{min-height:100dvh;box-sizing:border-box;padding:clamp(1.5rem,4vw,3rem);color:#e5e7eb;background:#111827;font:16px/1.5 system-ui,sans-serif}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.65}h1{font-size:clamp(2rem,5vw,3.2rem);margin:.4rem 0}.phase19-card{display:grid;gap:.45rem;max-width:44rem;margin-top:2rem;padding:1rem 1.1rem;border:1px solid #374151;border-radius:1rem;background:#182233}.phase19-card strong{font-size:1.1rem}
</style>
