<script setup lang="ts">
import { ref } from 'vue';
import { router } from '../router';
import MobileExperience from './MobileExperience.vue';
import { useGlobalStore } from '../stores/global';

const globalStore = useGlobalStore();
const loaded = ref(false);

function handleLoad() { loaded.value = true; }
</script>

<template>
  <div class="legacy-workspace" :class="{ 'legacy-workspace--loaded': loaded }" aria-label="MindPlace">
    <iframe
      class="legacy-workspace__frame"
      title="MindPlace"
      src="/index_mejoras.html"
      allow="camera; microphone"
      @load="handleLoad"
    />
    <div v-if="!loaded" class="legacy-workspace__loading" role="status" aria-live="polite">Cargando MindPlace…</div>
    <button class="legacy-workspace__graph" type="button" aria-label="Abrir vista de grafo" @click="router.push('/fase-26')">⌘ Grafo</button>
    <MobileExperience />
    <div v-if="globalStore.legacyError" class="legacy-workspace__error" role="alert">{{ globalStore.legacyError }}</div>
  </div>
</template>

<style scoped>
.legacy-workspace { position: fixed; inset: 0; background: #111; overflow: hidden; }
.legacy-workspace__frame { display: block; width: 100%; height: 100%; border: 0; background: transparent; }
.legacy-workspace__loading, .legacy-workspace__error { position: fixed; z-index: 10; top: .75rem; left: 50%; transform: translateX(-50%); padding: .45rem .75rem; border-radius: .5rem; background: rgba(0,0,0,.78); color: #fff; font: 500 14px/1.2 system-ui, sans-serif; }
.legacy-workspace__error { top: auto; bottom: .75rem; background: #7f1d1d; }
.legacy-workspace__graph { position: fixed; z-index: 11; top: .75rem; right: .9rem; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; padding: .5rem .8rem; color: #fff; background: rgba(11,17,32,.82); backdrop-filter: blur(8px); cursor: pointer; font: 700 13px/1 system-ui,sans-serif; }
.legacy-workspace__graph:hover { background: rgba(28,41,61,.94); }
</style>
