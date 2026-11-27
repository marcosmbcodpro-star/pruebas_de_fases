<script setup lang="ts">
import { ref } from 'vue';
import MobileExperience from '../components/MobileExperience.vue';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();
const demoMessage = ref('');

function show(message: string): void {
  demoMessage.value = message;
  window.setTimeout(() => { demoMessage.value = ''; }, 1800);
}

function open(panel: 'cases' | 'actions' | 'search' | 'more'): void {
  ui.setMobilePanel(panel);
}
</script>

<template>
  <main class="phase17-view">
    <header>
      <p class="eyebrow">FASE 17 · 209–220</p>
      <h1>Experiencia móvil específica</h1>
      <p>La capa Vue añade una navegación móvil propia sin sustituir la interfaz de escritorio ni el tablero existente.</p>
    </header>
    <section class="phase17-grid">
      <button @click="open('cases')"><strong>Casos</strong><span>Navegación entre casos y nuevo caso</span></button>
      <button @click="open('actions')"><strong>Acciones</strong><span>Captura rápida de evidencia, notas, personas, fotos y conexiones</span></button>
      <button @click="open('search')"><strong>Buscar</strong><span>Entrada directa a la búsqueda actual</span></button>
      <button @click="open('more')"><strong>Más</strong><span>Centro del tablero y ajustes</span></button>
    </section>
    <p v-if="demoMessage" class="phase17-toast" role="status">{{ demoMessage }}</p>
    <MobileExperience />
  </main>
</template>

<style scoped>
.phase17-view { min-height: 100dvh; box-sizing: border-box; padding: clamp(1.5rem, 4vw, 3rem); color: #e5e7eb; background: #111827; font: 16px/1.5 system-ui, sans-serif; }
.eyebrow { margin: 0 0 .4rem; font-size: .75rem; font-weight: 800; letter-spacing: .18em; opacity: .65; }
h1 { margin: 0 0 .6rem; font-size: clamp(2rem, 5vw, 3.2rem); }
header > p:last-child { max-width: 56rem; opacity: .75; }
.phase17-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; max-width: 760px; margin-top: 2rem; }
.phase17-grid button { padding: 1rem; min-height: 110px; text-align: left; color: inherit; border: 1px solid #374151; background: #182233; border-radius: 16px; }
.phase17-grid strong, .phase17-grid span { display: block; }
.phase17-grid strong { margin-bottom: .3rem; }
.phase17-grid span { font-size: .9rem; opacity: .68; }
.phase17-toast { position: fixed; right: 1rem; bottom: 1rem; padding: .7rem .9rem; border-radius: .7rem; background: #111; color: #fff; box-shadow: 0 12px 35px rgba(0,0,0,.3); }
@media (max-width: 640px) { .phase17-grid { grid-template-columns: 1fr; } }
</style>
