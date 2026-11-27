<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

type OfflineState = { online: boolean; queued?: number; syncing?: boolean; deferred?: boolean; lastError?: string; lastSyncAt?: number | null };
const state = ref<OfflineState>({ online: typeof navigator === 'undefined' ? true : navigator.onLine });

function refresh() {
  state.value = { ...state.value, online: navigator.onLine };
}
function onState(event: Event) {
  const detail = (event as CustomEvent<OfflineState>).detail;
  state.value = { ...state.value, ...(detail || {}), online: typeof detail?.online === 'boolean' ? detail.online : navigator.onLine };
}
onMounted(() => {
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
  window.addEventListener('mindplace:offline-state', onState);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', refresh);
  window.removeEventListener('offline', refresh);
  window.removeEventListener('mindplace:offline-state', onState);
});
</script>

<template>
  <div class="offline-status" :class="{ offline: !state.online, sync: state.syncing }" role="status" aria-live="polite">
    <span class="dot" aria-hidden="true"></span>
    <span v-if="!state.online">Sin conexión · trabajando offline</span>
    <span v-else-if="state.syncing">Sincronizando cambios…</span>
    <span v-else-if="state.queued">{{ state.queued }} cambio{{ state.queued === 1 ? '' : 's' }} pendiente{{ state.queued === 1 ? '' : 's' }} de sincronización</span>
    <span v-else>Conectado</span>
  </div>
</template>

<style scoped>
.offline-status{position:fixed;left:14px;bottom:14px;z-index:10003;display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(13,22,36,.9);backdrop-filter:blur(10px);color:#e7edf5;font:700 12px/1.2 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.26)}
.dot{width:8px;height:8px;border-radius:50%;background:#6fe0a9;flex:none}.offline .dot{background:#f1b565}.sync .dot{background:#9bbff0}@media(max-width:600px){.offline-status{left:10px;bottom:10px;max-width:calc(100% - 20px)}}
</style>
