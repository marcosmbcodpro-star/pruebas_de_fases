<script setup lang="ts">
import { useGlobalStore } from '../stores/global';
import { useUiStore } from '../stores/ui';

const globalStore = useGlobalStore();
const uiStore = useUiStore();
</script>

<template>
  <main class="phase22-view">
    <p class="eyebrow">FASE 22 · 275–286</p>
    <h1>Modo investigación móvil</h1>
    <p>Captura rápida de evidencia, notas, personas, conexiones, fotografías y documentos, con conservación del contexto del caso y retorno directo al punto de trabajo.</p>
    <section class="phase22-grid">
      <article><strong>Estado</strong><span>Completada</span></article>
      <article><strong>Arquitectura</strong><span>{{ globalStore.architecture }}</span></article>
      <article><strong>Modo móvil</strong><span>{{ uiStore.mobileNavMode }}</span></article>
      <article><strong>Captura</strong><span>Acciones rápidas y flujo de investigación</span></article>
      <article><strong>Contexto</strong><span>Retorno al caso, selección y posición del tablero</span></article>
      <article><strong>Documentos</strong><span>Cámara, fotografía y adjunto/escaneo desde el navegador</span></article>
    </section>
  </main>
</template>

<style scoped>
.phase22-view{min-height:100dvh;box-sizing:border-box;padding:clamp(1.5rem,4vw,3rem);color:#e5e7eb;background:#111827;font:16px/1.5 system-ui,sans-serif}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.65}h1{font-size:clamp(2rem,5vw,3.2rem);margin:.4rem 0}.phase22-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:60rem;margin-top:2rem}.phase22-grid article{display:grid;gap:.3rem;padding:1rem;border:1px solid #374151;border-radius:1rem;background:#182233}.phase22-grid strong{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;opacity:.65}.phase22-grid span{font-weight:700}@media(max-width:600px){.phase22-grid{grid-template-columns:1fr}}
</style>
