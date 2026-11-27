<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { getPwaSnapshot, promptPwaInstall, updatePwa } from '../services/pwa';

const state = ref(getPwaSnapshot());
function refresh() { state.value = getPwaSnapshot(); }
function onState() { refresh(); }
async function install() { await promptPwaInstall(); refresh(); }
function update() { updatePwa(); }

onMounted(() => window.addEventListener('mindplace:pwa-state', onState));
onBeforeUnmount(() => window.removeEventListener('mindplace:pwa-state', onState));
</script>

<template>
  <div v-if="state.updateReady" class="pwa-update" role="status" aria-live="polite">
    <span>Hay una nueva versión de MindPlace disponible.</span>
    <button type="button" @click="update">Actualizar</button>
  </div>
  <button v-else-if="state.canInstall && !state.installed" type="button" class="pwa-install" @click="install">
    Instalar MindPlace
  </button>
</template>

<style scoped>
.pwa-install{position:fixed;right:16px;bottom:16px;z-index:10001;border:1px solid #3b4d68;background:#172237;color:#eef4fb;border-radius:12px;padding:10px 14px;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.28);cursor:pointer}
.pwa-update{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:10002;display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px);padding:10px 12px 10px 14px;border:1px solid #3b4d68;background:#111c2d;color:#eef4fb;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.3);font:600 13px/1.3 system-ui,sans-serif}
.pwa-update button{border:0;background:#e8eef7;color:#101827;border-radius:9px;padding:8px 11px;font:700 12px system-ui,sans-serif;cursor:pointer}
@media(max-width:600px){.pwa-install{right:12px;bottom:12px}.pwa-update{left:12px;right:12px;transform:none;max-width:none;justify-content:space-between}.pwa-update span{min-width:0}}
</style>
