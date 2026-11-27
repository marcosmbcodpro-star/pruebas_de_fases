<script setup lang="ts">
import { ref } from 'vue';
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
    <div v-if="globalStore.legacyError" class="legacy-workspace__error" role="alert">{{ globalStore.legacyError }}</div>
  </div>
</template>

<style scoped>
.legacy-workspace { position: fixed; inset: 0; background: #111; overflow: hidden; }
.legacy-workspace__frame { display: block; width: 100%; height: 100%; border: 0; background: transparent; }
.legacy-workspace__loading, .legacy-workspace__error { position: fixed; z-index: 10; top: .75rem; left: 50%; transform: translateX(-50%); padding: .45rem .75rem; border-radius: .5rem; background: rgba(0,0,0,.78); color: #fff; font: 500 14px/1.2 system-ui, sans-serif; }
.legacy-workspace__error { top: auto; bottom: .75rem; background: #7f1d1d; }
</style>
