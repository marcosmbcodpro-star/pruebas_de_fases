<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { router } from '../router';
import type { CaseModel } from '../domain/models';
import { createIndexedDbStorage, readStore } from '../services/storage';
import { deleteSavedSearch, readSavedSearches, searchCase, upsertSavedSearch, type SavedSearch, type SearchResult } from '../services/advanced-search';

const loading = ref(true);
const error = ref('');
const cases = ref<CaseModel[]>([]);
const selectedCaseId = ref(localStorage.getItem('mindplace-last-case-id') || '');
const query = ref('');
const committedQuery = ref('');
const typeFilter = ref('all');
const statusFilter = ref('all');
const categoryFilter = ref('all');
const tagFilter = ref('all');
const relationFilter = ref('all');
const dateFrom = ref('');
const dateTo = ref('');
const results = ref<SearchResult[]>([]);
const savedSearches = ref<SavedSearch[]>([]);
const saveName = ref('');
const activeResult = ref<string | null>(null);

const currentCase = computed(() => cases.value.find(item => item.id === selectedCaseId.value) || cases.value[0] || null);
const tags = computed(() => [...new Set(currentCase.value?.nodes.flatMap(node => node.tags || []) || [])].sort((a, b) => a.localeCompare(b)));
const categories = computed(() => [...new Set(currentCase.value?.nodes.map(node => node.category).filter(Boolean) || [])].sort((a, b) => a.localeCompare(b)));
const relationTypes = computed(() => [...new Set(currentCase.value?.edges.map(edge => String(edge.type || edge.kind || 'default')) || [])].sort());
const visibleResults = computed(() => results.value.filter(result => {
  if (typeFilter.value !== 'all' && result.type !== typeFilter.value) return false;
  if (statusFilter.value !== 'all' && result.status !== statusFilter.value) return false;
  if (categoryFilter.value !== 'all' && result.category !== categoryFilter.value) return false;
  if (tagFilter.value !== 'all' && !result.highlights.includes(tagFilter.value)) return false;
  if (relationFilter.value !== 'all' && result.type !== relationFilter.value) return false;
  if (dateFrom.value && result.date && result.date < Date.parse(`${dateFrom.value}T00:00:00`)) return false;
  if (dateTo.value && result.date && result.date > Date.parse(`${dateTo.value}T23:59:59`)) return false;
  return true;
}));
const availableTypes = computed(() => [...new Set(currentCase.value?.nodes.map(node => String(node.type)) || [])].sort());
const syntaxHint = 'Ej.: persona AND tag:urgente NOT status:discarded · type:evidence · date:>=2026-01-01 · related:supports';

async function loadCases() {
  loading.value = true; error.value = '';
  try {
    const store = await readStore(createIndexedDbStorage());
    cases.value = store ? Object.values(store.cases).filter(Boolean) : [];
    if (!selectedCaseId.value || !cases.value.some(item => item.id === selectedCaseId.value)) selectedCaseId.value = cases.value[0]?.id || '';
    savedSearches.value = readSavedSearches();
    runSearch();
  } catch (err) { error.value = err instanceof Error ? err.message : 'No se pudo cargar la búsqueda.'; }
  finally { loading.value = false; }
}
function normalizedQuery(): string {
  const filters: string[] = [];
  if (typeFilter.value !== 'all') filters.push(`type:${typeFilter.value}`);
  if (statusFilter.value !== 'all') filters.push(`status:${statusFilter.value}`);
  if (categoryFilter.value !== 'all') filters.push(`category:"${categoryFilter.value}"`);
  if (tagFilter.value !== 'all') filters.push(`tag:"${tagFilter.value}"`);
  if (relationFilter.value !== 'all') filters.push(`related:${relationFilter.value}`);
  if (dateFrom.value) filters.push(`date:>=${dateFrom.value}`);
  if (dateTo.value) filters.push(`date:<=${dateTo.value}`);
  return [query.value.trim(), ...filters].filter(Boolean).join(' AND ');
}
function runSearch() {
  committedQuery.value = normalizedQuery();
  results.value = currentCase.value && committedQuery.value ? searchCase(currentCase.value, committedQuery.value) : [];
  activeResult.value = null;
}
function clearSearch() { query.value = ''; typeFilter.value = statusFilter.value = categoryFilter.value = tagFilter.value = relationFilter.value = 'all'; dateFrom.value = ''; dateTo.value = ''; runSearch(); }
function switchCase(id: string) { selectedCaseId.value = id; localStorage.setItem('mindplace-last-case-id', id); clearSearch(); }
function saveCurrent() {
  const q = normalizedQuery(); if (!q || !saveName.value.trim()) return;
  savedSearches.value = upsertSavedSearch(saveName.value, q); saveName.value = '';
}
function loadSaved(item: SavedSearch) { query.value = item.query; typeFilter.value = statusFilter.value = categoryFilter.value = tagFilter.value = relationFilter.value = 'all'; dateFrom.value = ''; dateTo.value = ''; runSearch(); }
function removeSaved(id: string) { savedSearches.value = deleteSavedSearch(id); }
function openResult(result: SearchResult) {
  activeResult.value = activeResult.value === result.id ? null : result.id;
  if (result.kind === 'node') router.push({ path: '/fase-26', query: { case: currentCase.value?.id, node: result.id } });
  else if (result.kind === 'edge') router.push({ path: '/fase-26', query: { case: currentCase.value?.id } });
}
onMounted(loadCases);
watch(currentCase, () => { if (!loading.value) runSearch(); });
</script>

<template>
  <main class="phase28">
    <header class="phase28__header">
      <div><p class="eyebrow">FASE 28 · 339–351</p><h1>Búsqueda avanzada</h1><p class="subtitle">Busca combinando texto, tipo, estado, categoría, etiquetas, fechas y relaciones. Los operadores AND, OR y NOT se pueden combinar en una misma consulta.</p></div>
      <div class="actions"><button @click="router.push('/')">← Tablero</button><button @click="router.push('/fase-26')">⌘ Grafo</button><button @click="router.push('/fase-27')">✓ Calidad</button></div>
    </header>

    <section v-if="loading" class="panel">Cargando índice de casos…</section>
    <section v-else-if="error" class="panel error" role="alert">{{ error }}</section>
    <section v-else-if="!currentCase" class="panel empty">No hay casos disponibles. Crea o abre un caso desde el tablero.</section>
    <template v-else>
      <section class="searchbar panel">
        <label class="searchbar__input"><span>Búsqueda</span><input v-model="query" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" placeholder="Escribe una búsqueda avanzada…" @keyup.enter="runSearch" @input="results = []"></label>
        <button class="primary searchbar__go" @click="runSearch">Buscar</button>
        <button class="secondary" @click="clearSearch">Limpiar</button>
        <div class="hint">{{ syntaxHint }}</div>
      </section>

      <section class="toolbar panel">
        <label>Caso<select :value="selectedCaseId" @change="switchCase(($event.target as HTMLSelectElement).value)"><option v-for="item in cases" :key="item.id" :value="item.id">{{ item.title }}</option></select></label>
        <div class="toolbar__stats"><span>{{ visibleResults.length }} resultados</span><span v-if="committedQuery">Consulta: <b>{{ committedQuery }}</b></span></div>
      </section>

      <section class="layout">
        <aside class="panel filters">
          <div><h2>Filtros</h2><p>Se añaden automáticamente a la consulta.</p></div>
          <label>Tipo<select v-model="typeFilter" @change="runSearch"><option value="all">Todos</option><option v-for="value in availableTypes" :key="value" :value="value">{{ value }}</option></select></label>
          <label>Estado<select v-model="statusFilter" @change="runSearch"><option value="all">Todos</option><option value="normal">normal</option><option value="pending">pending</option><option value="validated">validated</option><option value="discarded">discarded</option></select></label>
          <label>Categoría<select v-model="categoryFilter" @change="runSearch"><option value="all">Todas</option><option v-for="value in categories" :key="value" :value="value">{{ value }}</option></select></label>
          <label>Etiqueta<select v-model="tagFilter" @change="runSearch"><option value="all">Todas</option><option v-for="value in tags" :key="value" :value="value">{{ value }}</option></select></label>
          <label>Relación<select v-model="relationFilter" @change="runSearch"><option value="all">Todas</option><option v-for="value in relationTypes" :key="value" :value="value">{{ value }}</option></select></label>
          <div class="date-grid"><label>Desde<input v-model="dateFrom" type="date" @change="runSearch"></label><label>Hasta<input v-model="dateTo" type="date" @change="runSearch"></label></div>
        </aside>

        <section class="panel results">
          <div class="results__head"><div><h2>Resultados</h2><p>{{ committedQuery ? 'Coincidencias ordenadas por relevancia.' : 'Ejecuta una consulta para buscar en el caso.' }}</p></div></div>
          <div v-if="!committedQuery" class="empty"><strong>Busca información del caso</strong><span>Puedes escribir texto libre o usar operadores como <code>AND</code>, <code>OR</code>, <code>NOT</code>.</span></div>
          <div v-else-if="!visibleResults.length" class="empty"><strong>No se encontraron resultados</strong><span>Prueba a ampliar la consulta o retirar algún filtro.</span></div>
          <article v-for="result in visibleResults" :key="`${result.kind}-${result.id}`" class="result-card" :class="{ active: activeResult === result.id }">
            <button type="button" class="result-card__main" @click="openResult(result)">
              <span class="result-card__kind">{{ result.kind === 'node' ? 'TARJETA' : result.kind === 'edge' ? 'RELACIÓN' : 'CASO' }}</span>
              <strong>{{ result.title }}</strong><span>{{ result.text }}</span>
              <div class="chips"><i v-if="result.type">{{ result.type }}</i><i v-if="result.status">{{ result.status }}</i><i v-if="result.category">{{ result.category }}</i><i v-for="item in result.highlights.slice(0,4)" :key="item">#{{ item }}</i></div>
            </button>
            <span class="score">{{ result.score.toFixed(1) }}</span>
          </article>
        </section>

        <aside class="panel saved">
          <h2>Búsquedas guardadas</h2><div class="save-box"><input v-model="saveName" placeholder="Nombre de la búsqueda" @keyup.enter="saveCurrent"><button class="primary" :disabled="!saveName.trim() || !normalizedQuery()" @click="saveCurrent">Guardar</button></div>
          <div v-if="!savedSearches.length" class="saved__empty">Guarda consultas frecuentes para reutilizarlas.</div>
          <article v-for="item in savedSearches" :key="item.id" class="saved-item"><button type="button" @click="loadSaved(item)"><strong>{{ item.name }}</strong><span>{{ item.query }}</span></button><button type="button" class="delete" aria-label="Eliminar búsqueda guardada" @click="removeSaved(item.id)">×</button></article>
        </aside>
      </section>
    </template>
  </main>
</template>

<style scoped>
.phase28{min-height:100dvh;box-sizing:border-box;padding:18px;color:#e5e7eb;background:#0b1120;font:14px/1.45 Inter,system-ui,sans-serif;overflow:auto}.phase28__header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:14px}.eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;color:#93a4bf}.phase28 h1{font-size:clamp(25px,4vw,40px);margin:4px 0}.subtitle{margin:0;color:#9ba9bc;max-width:960px}.actions{display:flex;gap:8px;flex-wrap:wrap}.panel{background:#111827;border:1px solid #243247;border-radius:16px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.18)}button,input,select{border:1px solid #34445a;background:#172033;color:#edf2f7;border-radius:10px;padding:10px 12px;font:inherit}button:hover:not(:disabled){background:#22324d}.primary{background:#1e304a}.secondary{background:transparent}.searchbar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:end;margin-bottom:14px}.searchbar__input{display:grid;gap:6px;color:#9ba9bc}.searchbar__input input{width:100%;box-sizing:border-box;font-size:16px}.hint{grid-column:1/-1;color:#7f90a8;font-size:12px}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:14px;margin-bottom:14px}.toolbar label{display:grid;gap:6px;min-width:260px;color:#9ba9bc}.toolbar__stats{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#9ba9bc}.toolbar__stats span{padding:6px 10px;border-radius:999px;background:#182235;font-size:12px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr) 290px;gap:14px}.filters,.saved{height:max-content;display:flex;flex-direction:column;gap:12px}.filters h2,.saved h2,.results h2{margin:0}.filters p,.results__head p{margin:3px 0;color:#7f90a8}.filters label{display:grid;gap:6px;color:#9ba9bc}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.results{min-width:0}.results__head{margin-bottom:4px}.result-card{position:relative;border-top:1px solid #243247}.result-card__main{width:100%;display:grid;gap:4px;padding:14px 44px 14px 4px;border:0;border-radius:0;background:transparent;text-align:left}.result-card__main:hover{background:#121d2d}.result-card__kind{font-size:10px;font-weight:900;letter-spacing:.12em;color:#7f90a8}.result-card__main>span:not(.result-card__kind){color:#aebbd0}.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.chips i{font-style:normal;font-size:11px;padding:3px 7px;border-radius:999px;background:#18263a;color:#9eb0c8}.score{position:absolute;right:8px;top:14px;color:#7f90a8;font-size:11px}.save-box{display:grid;grid-template-columns:1fr auto;gap:7px}.save-box input{min-width:0}.saved__empty{color:#7f90a8;font-size:12px;padding:8px 0}.saved-item{display:grid;grid-template-columns:1fr auto;gap:5px;border-top:1px solid #243247;padding-top:8px}.saved-item>button:first-child{border:0;background:transparent;text-align:left;padding:7px}.saved-item strong,.saved-item span{display:block}.saved-item span{font-size:11px;color:#8191a7;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.saved-item .delete{border:0;background:transparent;font-size:20px;color:#8191a7}.empty{display:grid;gap:6px;padding:30px 12px;text-align:center;color:#9eacbe}.empty strong{color:#e5e7eb}.error{color:#ffb4b4}@media(max-width:1080px){.layout{grid-template-columns:200px minmax(0,1fr)}.saved{grid-column:1/-1}.saved{display:grid;grid-template-columns:1fr 1fr}.saved h2{grid-column:1/-1}.save-box{grid-column:1/2}.saved__empty{grid-column:2}.saved-item{grid-column:1/-1}}@media(max-width:760px){.phase28{padding:12px 10px 86px}.phase28__header,.toolbar{flex-direction:column;align-items:stretch}.actions{width:100%}.actions button{flex:1}.searchbar{grid-template-columns:1fr 1fr}.searchbar__input{grid-column:1/-1}.hint{font-size:11px}.toolbar label{min-width:0}.layout{grid-template-columns:1fr}.filters,.saved{display:flex}.date-grid{grid-template-columns:1fr 1fr}.save-box{display:grid;grid-template-columns:1fr auto}.result-card__main{padding-right:42px}.phase28 code{font-size:11px}}
</style>
