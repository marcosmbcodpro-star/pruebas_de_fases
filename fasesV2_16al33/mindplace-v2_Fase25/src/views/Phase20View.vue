<script setup lang="ts">
import { useGlobalStore } from '../stores/global';
import { useUiStore } from '../stores/ui';

const globalStore = useGlobalStore();
const uiStore = useUiStore();
</script>

<template>
  <main class="phase20-view">
    <p class="eyebrow">FASE 20 · 249–260</p>
    <h1>Edición y formularios móviles</h1>
    <p>Teclado virtual, foco visible, pasos móviles, edición rápida, pegado de texto, autosave y recuperación temporal se integran sobre el workspace existente.</p>
    <section class="phase20-card">
      <strong>Estado</strong>
      <span>Arquitectura: {{ globalStore.architecture }}</span>
      <span>Modo móvil: {{ uiStore.mobileNavMode }}</span>
      <span>Persistencia principal: IndexedDB · borradores temporales: sessionStorage</span>
    </section>
  </main>
</template>

<style scoped>
.phase20-view{min-height:100dvh;box-sizing:border-box;padding:clamp(1.5rem,4vw,3rem);color:#e5e7eb;background:#111827;font:16px/1.5 system-ui,sans-serif}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.65}h1{font-size:clamp(2rem,5vw,3.2rem);margin:.4rem 0}.phase20-card{display:grid;gap:.45rem;max-width:44rem;margin-top:2rem;padding:1rem 1.1rem;border:1px solid #374151;border-radius:1rem;background:#182233}.phase20-card strong{font-size:1.1rem}
</style>
