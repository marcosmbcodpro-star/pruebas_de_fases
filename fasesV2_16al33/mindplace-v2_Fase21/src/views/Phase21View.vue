<script setup lang="ts">
import { useGlobalStore } from '../stores/global';
import { useUiStore } from '../stores/ui';

const globalStore = useGlobalStore();
const uiStore = useUiStore();
</script>

<template>
  <main class="phase21-view">
    <p class="eyebrow">FASE 21 · 261–274</p>
    <h1>Archivos, fotografías y cámara en móvil</h1>
    <p>Selector móvil, cámara, galería, optimización de imágenes, vistas previas, cola de adjuntos, progreso, cancelación y recuperación temporal integrados con IndexedDB.</p>
    <section class="phase21-grid">
      <article><strong>Estado</strong><span>Completada</span></article>
      <article><strong>Arquitectura</strong><span>{{ globalStore.architecture }}</span></article>
      <article><strong>Modo móvil</strong><span>{{ uiStore.mobileNavMode }}</span></article>
      <article><strong>Persistencia</strong><span>IndexedDB · object store attachments</span></article>
    </section>
  </main>
</template>

<style scoped>
.phase21-view{min-height:100dvh;box-sizing:border-box;padding:clamp(1.5rem,4vw,3rem);color:#e5e7eb;background:#111827;font:16px/1.5 system-ui,sans-serif}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.65}h1{font-size:clamp(2rem,5vw,3.2rem);margin:.4rem 0}.phase21-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:52rem;margin-top:2rem}.phase21-grid article{display:grid;gap:.3rem;padding:1rem;border:1px solid #374151;border-radius:1rem;background:#182233}.phase21-grid strong{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;opacity:.65}.phase21-grid span{font-weight:700}@media(max-width:600px){.phase21-grid{grid-template-columns:1fr}}
</style>
