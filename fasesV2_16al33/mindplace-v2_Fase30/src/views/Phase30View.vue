<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getPwaSnapshot, promptPwaInstall, updatePwa } from '../services/pwa';
import { useRouter } from 'vue-router';

const router = useRouter();
const state = ref(getPwaSnapshot());
const standalone = computed(() => state.value.installed);
function refresh() { state.value = getPwaSnapshot(); }
async function install() { await promptPwaInstall(); refresh(); }
function update() { updatePwa(); }
function onState() { refresh(); }

onMounted(() => window.addEventListener('mindplace:pwa-state', onState));
onBeforeUnmount(() => window.removeEventListener('mindplace:pwa-state', onState));
</script>

<template>
  <main class="phase30">
    <header>
      <div>
        <p>FASE 30 · 363–372</p>
        <h1>PWA y aplicación web instalable</h1>
        <span>MindPlace puede instalarse como aplicación web independiente sin abandonar su base 100 % web.</span>
      </div>
      <div class="actions">
        <button v-if="state.canInstall && !standalone" type="button" @click="install">Instalar MindPlace</button>
        <button v-if="state.updateReady" type="button" @click="update">Actualizar aplicación</button>
        <button type="button" @click="router.push('/')">← Tablero</button>
      </div>
    </header>

    <section class="status-grid">
      <article><strong>Manifest</strong><span class="ok">Activo</span><small>Nombre, iconos, colores, ámbito y modo standalone.</small></article>
      <article><strong>Service Worker</strong><span :class="state.supported ? 'ok' : 'warn'">{{ state.supported ? 'Registrado' : 'No disponible' }}</span><small>Prepara la caché segura del shell y la gestión de actualizaciones.</small></article>
      <article><strong>Instalación</strong><span :class="standalone ? 'ok' : 'info'">{{ standalone ? 'Instalada' : (state.canInstall ? 'Disponible' : 'Según navegador') }}</span><small>El navegador decide cuándo y cómo ofrece la instalación.</small></article>
      <article><strong>Datos locales</strong><span class="ok">Preservados</span><small>La estrategia PWA no borra ni sustituye IndexedDB.</small></article>
    </section>

    <section class="details">
      <h2>Qué aporta esta fase</h2>
      <div class="cards">
        <article><b>363–365</b><p>Manifest, iconos de instalación y service worker.</p></article>
        <article><b>366–368</b><p>Caché del shell, instalación y ejecución independiente.</p></article>
        <article><b>369–371</b><p>Pantalla de carga, detección de actualizaciones y aviso al usuario.</p></article>
        <article><b>372</b><p>Los datos persistentes de MindPlace siguen fuera del caché de la aplicación y no se eliminan al actualizar.</p></article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.phase30{min-height:100dvh;box-sizing:border-box;padding:22px;color:#e8eef6;background:#0b1120;font:14px/1.45 Inter,system-ui,sans-serif}.phase30 header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.phase30 p{margin:0}.phase30 header>div:first-child>p{font-size:11px;letter-spacing:.16em;color:#91a2bb;font-weight:800}.phase30 h1{margin:4px 0 7px;font-size:clamp(28px,5vw,46px)}.phase30 header span{color:#9eabc0}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions button{border:1px solid #33455d;background:#172237;color:#edf3fa;border-radius:10px;padding:10px 13px;font:inherit;cursor:pointer}.status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}.status-grid article,.cards article{display:grid;gap:7px;padding:18px;border:1px solid #25354b;background:#111b2c;border-radius:15px}.status-grid strong{font-size:15px}.status-grid span{font-size:13px;font-weight:800}.status-grid small{color:#93a1b5}.ok{color:#70d7ab}.warn{color:#f2be68}.info{color:#9fc0eb}.details{margin-top:24px}.details h2{font-size:20px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.cards b{font-size:12px;color:#9fb0c7}.cards p{color:#93a1b5;margin:0}@media(max-width:900px){.status-grid,.cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.phase30{padding:14px 12px 80px}.phase30 header{flex-direction:column}.actions{width:100%}.actions button{flex:1}.status-grid,.cards{grid-template-columns:1fr}}
</style>
