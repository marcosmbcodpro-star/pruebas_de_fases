<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const state = ref({ online: navigator.onLine, queued: 0, syncing: false, supported: true, readyForSync: false, lastError: '' });

async function refresh() {
  const offline = (window as Window & { __mindplaceOffline?: { getState?: () => Promise<unknown> } }).__mindplaceOffline;
  if (offline?.getState) state.value = { ...state.value, ...(await offline.getState() as typeof state.value) };
  else state.value = { ...state.value, online: navigator.onLine };
}
function onState(event: Event) { const detail = (event as CustomEvent<Record<string, unknown>>).detail; state.value = { ...state.value, ...(detail as Partial<typeof state.value>), online: typeof detail?.online === 'boolean' ? Boolean(detail.online) : navigator.onLine }; }
onMounted(() => { refresh(); window.addEventListener('mindplace:offline-state', onState); window.addEventListener('online', refresh); window.addEventListener('offline', refresh); });
onBeforeUnmount(() => { window.removeEventListener('mindplace:offline-state', onState); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); });
</script>

<template>
  <main class="phase31">
    <header>
      <div><p class="eyebrow">FASE 31 · 373–382</p><h1>Funcionamiento offline avanzado</h1><span>MindPlace mantiene el trabajo local aunque no haya Internet y prepara los cambios para sincronización futura.</span></div>
      <button type="button" @click="router.push('/')">← Tablero</button>
    </header>
    <section class="status-grid">
      <article><strong>Conexión</strong><span :class="state.online ? 'ok' : 'warn'">{{ state.online ? 'Conectado' : 'Offline' }}</span><small>Detección automática online/offline.</small></article>
      <article><strong>Datos locales</strong><span class="ok">Disponibles</span><small>Casos y adjuntos permanecen en IndexedDB.</small></article>
      <article><strong>Cola offline</strong><span class="info">{{ state.queued }} pendiente{{ state.queued === 1 ? '' : 's' }}</span><small>Los cambios se agrupan por caso para evitar duplicados.</small></article>
      <article><strong>Sincronización</strong><span :class="state.syncing ? 'info' : 'ok'">{{ state.syncing ? 'En curso' : (state.readyForSync ? 'Preparada' : 'Local-first') }}</span><small>Adaptador listo para el backend de la Fase 32.</small></article>
    </section>
    <section class="cards">
      <article v-for="item in [
        ['373–376','Trabajo sin conexión','Lectura, creación, edición y adjuntos usan almacenamiento local.'],
        ['377–378','Cola de cambios','Los cambios offline se registran en IndexedDB y sobreviven a recargas.'],
        ['379–381','Recuperación y errores','Al volver la conexión se detecta automáticamente y la cola se procesa cuando existe un adaptador de sync.'],
        ['382','Protección','La persistencia local no depende de la disponibilidad del servidor.']
      ]" :key="item[0]"><b>{{ item[0] }}</b><h2>{{ item[1] }}</h2><p>{{ item[2] }}</p></article>
    </section>
  </main>
</template>

<style scoped>
.phase31{min-height:100dvh;box-sizing:border-box;padding:22px;color:#e8eef6;background:#0b1120;font:14px/1.45 Inter,system-ui,sans-serif}.phase31 header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.eyebrow{font-size:11px;letter-spacing:.16em;color:#91a2bb;font-weight:800}.phase31 h1{margin:4px 0 7px;font-size:clamp(28px,5vw,46px)}.phase31 header span{color:#9eabc0}.phase31 header button{border:1px solid #33455d;background:#172237;color:#edf3fa;border-radius:10px;padding:10px 13px;font:inherit;cursor:pointer}.status-grid,.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}.status-grid article,.cards article{display:grid;gap:7px;padding:18px;border:1px solid #25354b;background:#111b2c;border-radius:15px}.status-grid span{font-weight:800}.status-grid small,.cards p{color:#93a1b5}.cards h2{margin:0;font-size:17px}.cards p{margin:0}.ok{color:#70d7ab}.warn{color:#f2be68}.info{color:#9fc0eb}@media(max-width:900px){.status-grid,.cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.phase31{padding:14px 12px 80px}.phase31 header{flex-direction:column}.status-grid,.cards{grid-template-columns:1fr}}
</style>
