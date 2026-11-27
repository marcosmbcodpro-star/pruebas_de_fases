<script setup lang="ts">
import { useGlobalStore } from '../stores/global';

const globalStore = useGlobalStore();
</script>

<template>
  <main class="phase24-view">
    <p class="eyebrow">FASE 24 · 297–305</p>
    <h1>Versionado de casos</h1>
    <p>Versiones persistentes independientes del historial de actividad y de Undo/Redo, con puntos automáticos, restauración y protección contra borrado accidental.</p>
    <section class="phase24-grid">
      <article><strong>Estado</strong><span>Completada</span></article>
      <article><strong>Arquitectura</strong><span>{{ globalStore.architecture }}</span></article>
      <article><strong>Persistencia</strong><span>IndexedDB mediante la capa de almacenamiento de MindPlace</span></article>
      <article><strong>Versiones</strong><span>Manuales y automáticas con número, fecha, descripción y motivo</span></article>
      <article><strong>Restauración</strong><span>Guardado previo y restauración explícita de una instantánea</span></article>
      <article><strong>Protección</strong><span>Las versiones importantes no pueden eliminarse accidentalmente</span></article>
    </section>
  </main>
</template>

<style scoped>
.phase24-view{min-height:100dvh;box-sizing:border-box;padding:clamp(1.5rem,4vw,3rem);color:#e5e7eb;background:#111827;font:16px/1.5 system-ui,sans-serif}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.65}h1{font-size:clamp(2rem,5vw,3.2rem);margin:.4rem 0}.phase24-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:60rem;margin-top:2rem}.phase24-grid article{display:grid;gap:.3rem;padding:1rem;border:1px solid #374151;border-radius:1rem;background:#182233}.phase24-grid strong{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;opacity:.65}.phase24-grid span{font-weight:700}@media(max-width:600px){.phase24-grid{grid-template-columns:1fr}}
</style>
