<script setup lang="ts">
import { useGlobalStore } from '../stores/global';

const globalStore = useGlobalStore();
</script>

<template>
  <main class="phase25-view">
    <p class="eyebrow">FASE 25 · 306–314</p>
    <h1>Comparación y análisis de versiones</h1>
    <p>Comparador de instantáneas de casos con detección de altas, bajas y modificaciones y restauración selectiva protegida.</p>
    <section class="phase25-grid">
      <article><strong>Estado</strong><span>Completada</span></article>
      <article><strong>Arquitectura</strong><span>{{ globalStore.architecture }}</span></article>
      <article><strong>Tarjetas</strong><span>Añadidas, eliminadas y modificadas con campos afectados</span></article>
      <article><strong>Conexiones</strong><span>Añadidas, eliminadas y modificadas</span></article>
      <article><strong>Estado y categoría</strong><span>Comparación independiente de cambios de metadatos</span></article>
      <article><strong>Adjuntos</strong><span>Comparación por elemento y restauración condicionada a que el binario exista</span></article>
      <article><strong>Restauración</strong><span>Selección individual de cambios desde una versión de referencia</span></article>
      <article><strong>Seguridad</strong><span>Confirmación, Undo/Redo y prevención de endpoints rotos</span></article>
    </section>
  </main>
</template>

<style scoped>
.phase25-view{min-height:100dvh;box-sizing:border-box;padding:clamp(1.5rem,4vw,3rem);color:#e5e7eb;background:#111827;font:16px/1.5 system-ui,sans-serif}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.65}h1{font-size:clamp(2rem,5vw,3.2rem);margin:.4rem 0}.phase25-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:60rem;margin-top:2rem}.phase25-grid article{display:grid;gap:.3rem;padding:1rem;border:1px solid #374151;border-radius:1rem;background:#182233}.phase25-grid strong{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;opacity:.65}.phase25-grid span{font-weight:700}@media(max-width:600px){.phase25-grid{grid-template-columns:1fr}}
</style>
