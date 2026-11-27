<script setup lang="ts">
import { computed, ref } from 'vue';
import { router } from '../router';
import type { CaseModel } from '../domain/models';
import { createIndexedDbStorage, readStore } from '../services/storage';
import { diagnoseCase, summarizeDiagnostics, type CaseDiagnostics, type DiagnosticIssue, type DiagnosticSeverity } from '../services/case-diagnostics';

const loading = ref(true);
const error = ref('');
const cases = ref<CaseModel[]>([]);
const selectedCaseId = ref(localStorage.getItem('mindplace-last-case-id') || '');
const severityFilter = ref<'all' | DiagnosticSeverity>('all');
const codeFilter = ref('all');
const diagnostics = ref<CaseDiagnostics[]>([]);
const expandedId = ref<string | null>(null);

const currentCase = computed(() => cases.value.find(item => item.id === selectedCaseId.value) || cases.value[0] || null);
const currentDiagnostics = computed(() => currentCase.value ? diagnostics.value.find(item => item.caseId === currentCase.value!.id) || null : null);
const allSummary = computed(() => summarizeDiagnostics(diagnostics.value));
const visibleIssues = computed(() => {
  const issues = currentDiagnostics.value?.issues || [];
  return issues.filter(issue => (severityFilter.value === 'all' || issue.severity === severityFilter.value) && (codeFilter.value === 'all' || issue.code === codeFilter.value));
});
const availableCodes = computed(() => [...new Set((currentDiagnostics.value?.issues || []).map(issue => issue.code))]);
const isEmpty = computed(() => Boolean(currentCase.value && !currentDiagnostics.value?.issues.length));

async function loadCases() {
  loading.value = true; error.value = '';
  try {
    const store = await readStore(createIndexedDbStorage());
    cases.value = store ? Object.values(store.cases).filter(Boolean) : [];
    if (!selectedCaseId.value || !cases.value.some(item => item.id === selectedCaseId.value)) selectedCaseId.value = cases.value[0]?.id || '';
    diagnostics.value = cases.value.map(diagnoseCase);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el caso.';
  } finally { loading.value = false; }
}

function switchCase(id: string) {
  selectedCaseId.value = id;
  localStorage.setItem('mindplace-last-case-id', id);
  severityFilter.value = 'all'; codeFilter.value = 'all'; expandedId.value = null;
}

function refresh() { void loadCases(); }
function severityLabel(value: DiagnosticSeverity): string { return value === 'error' ? 'Error' : value === 'warning' ? 'Advertencia' : 'Información'; }
function toggleIssue(id: string) { expandedId.value = expandedId.value === id ? null : id; }
function openIssue(issue: DiagnosticIssue) {
  if (issue.focusId && currentCase.value) router.push({ path: '/fase-26', query: { case: currentCase.value.id, node: issue.focusId } });
}
function backToBoard() { router.push('/'); }
</script>

<template>
  <main class="phase27">
    <header class="phase27__header">
      <div><p class="eyebrow">FASE 27 · 327–338</p><h1>Calidad y consistencia del caso</h1><p class="subtitle">Diagnóstico de relaciones, evidencias, referencias, duplicados y archivos para encontrar problemas antes de dar un caso por cerrado.</p></div>
      <div class="actions"><button @click="backToBoard">← Tablero</button><button @click="router.push('/fase-26')">⌘ Grafo</button><button @click="refresh">↻ Analizar</button></div>
    </header>

    <section v-if="loading" class="panel">Analizando los casos…</section>
    <section v-else-if="error" class="panel error" role="alert">{{ error }}</section>
    <section v-else-if="!currentCase" class="panel">No hay casos disponibles. Crea o abre un caso desde el tablero.</section>
    <template v-else>
      <section class="toolbar panel">
        <label>Caso<select :value="selectedCaseId" @change="switchCase(($event.target as HTMLSelectElement).value)"><option v-for="item in cases" :key="item.id" :value="item.id">{{ item.title }}</option></select></label>
        <div class="toolbar__stats"><span class="stat stat--total">{{ currentDiagnostics?.summary.total || 0 }} problemas</span><span class="stat stat--error">{{ currentDiagnostics?.summary.errors || 0 }} errores</span><span class="stat stat--warning">{{ currentDiagnostics?.summary.warnings || 0 }} advertencias</span><span class="stat">{{ currentDiagnostics?.summary.infos || 0 }} informativos</span></div>
      </section>

      <section class="overview-grid">
        <article class="panel overview"><strong>Estado del caso</strong><span v-if="isEmpty">Sin problemas detectados</span><span v-else>Hay elementos que conviene revisar</span><small>Último análisis: {{ currentDiagnostics ? new Date(currentDiagnostics.checkedAt).toLocaleString() : '—' }}</small></article>
        <article class="panel overview"><strong>Diagnóstico global</strong><span>{{ allSummary.total }} problemas en {{ diagnostics.length }} casos</span><small>{{ allSummary.errors }} errores · {{ allSummary.warnings }} advertencias · {{ allSummary.infos }} informativos</small></article>
      </section>

      <section class="layout">
        <aside class="panel filters">
          <h2>Filtros</h2>
          <label>Nivel<select v-model="severityFilter"><option value="all">Todos</option><option value="error">Errores</option><option value="warning">Advertencias</option><option value="info">Informativos</option></select></label>
          <label>Tipo<select v-model="codeFilter"><option value="all">Todos</option><option v-for="code in availableCodes" :key="code" :value="code">{{ code }}</option></select></label>
          <div class="legend"><span><i class="dot dot--error"></i>Error</span><span><i class="dot dot--warning"></i>Advertencia</span><span><i class="dot dot--info"></i>Informativo</span></div>
        </aside>

        <section class="panel issues">
          <div class="issues__head"><div><h2>Problemas detectados</h2><p>{{ visibleIssues.length }} resultados</p></div><button v-if="severityFilter !== 'all' || codeFilter !== 'all'" class="secondary" @click="severityFilter = 'all'; codeFilter = 'all'">Limpiar filtros</button></div>
          <div v-if="isEmpty" class="empty"><strong>✓ El caso supera el diagnóstico actual</strong><span>No se han detectado problemas con las reglas de calidad de esta fase.</span></div>
          <div v-else-if="!visibleIssues.length" class="empty"><strong>No hay resultados con estos filtros</strong><span>Prueba otro nivel o tipo de diagnóstico.</span></div>
          <article v-for="issue in visibleIssues" :key="issue.id" class="issue" :class="`issue--${issue.severity}`">
            <button class="issue__summary" type="button" @click="toggleIssue(issue.id)">
              <span class="dot" :class="`dot--${issue.severity}`"></span><span class="issue__title"><b>{{ issue.title }}</b><small>{{ severityLabel(issue.severity) }} · {{ issue.code }}</small></span><span class="issue__chevron">{{ expandedId === issue.id ? '▴' : '▾' }}</span>
            </button>
            <div v-if="expandedId === issue.id" class="issue__details">
              <p>{{ issue.message }}</p>
              <div class="issue__meta"><span v-if="issue.nodeIds.length">Tarjetas: {{ issue.nodeIds.length }}</span><span v-if="issue.edgeIds.length">Relaciones: {{ issue.edgeIds.length }}</span><span v-if="issue.attachmentIds.length">Archivos: {{ issue.attachmentIds.length }}</span></div>
              <button v-if="issue.focusId && issue.code !== 'orphan-attachment'" class="primary" @click="openIssue(issue)">Abrir elemento en el grafo →</button>
            </div>
          </article>
        </section>
      </section>
    </template>
  </main>
</template>

<style scoped>
.phase27{min-height:100dvh;box-sizing:border-box;padding:18px;color:#e5e7eb;background:#0b1120;font:14px/1.45 Inter,system-ui,sans-serif;overflow:auto}.phase27__header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:14px}.eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;color:#93a4bf}.phase27 h1{font-size:clamp(25px,4vw,40px);margin:4px 0}.subtitle{margin:0;color:#9ba9bc;max-width:900px}.actions{display:flex;gap:8px;flex-wrap:wrap}.panel{background:#111827;border:1px solid #243247;border-radius:16px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.18)}button,select{border:1px solid #34445a;background:#172033;color:#edf2f7;border-radius:10px;padding:9px 12px;font:inherit}button:hover:not(:disabled){background:#22324d}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:14px;margin-bottom:14px}.toolbar label,.filters label{display:grid;gap:6px;color:#9ba9bc;min-width:250px}.toolbar__stats{display:flex;gap:8px;flex-wrap:wrap}.stat{padding:6px 10px;border-radius:999px;background:#182235;color:#aebbd0;font-size:12px}.stat--error{color:#ffb4b4}.stat--warning{color:#f5d59c}.stat--total{color:#e5e7eb}.overview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}.overview{display:grid;gap:5px}.overview strong{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#93a4bf}.overview span{font-size:18px;font-weight:800}.overview small{color:#7f90a8}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:14px}.filters{display:flex;flex-direction:column;gap:14px;height:max-content}.filters h2,.issues h2{margin:0}.legend{display:grid;gap:7px;margin-top:auto;color:#9ba9bc}.legend span{display:flex;gap:8px;align-items:center}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#64748b}.dot--error{background:#ef7777}.dot--warning{background:#e4b85f}.dot--info{background:#76a2dc}.issues{min-width:0}.issues__head{display:flex;justify-content:space-between;gap:10px;align-items:start;margin-bottom:8px}.issues__head p{margin:2px 0 0;color:#8090a6}.secondary{background:transparent}.empty{display:grid;gap:6px;padding:28px 12px;text-align:center;color:#a7b5c7}.empty strong{color:#e5e7eb}.issue{border-top:1px solid #243247}.issue__summary{width:100%;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:transparent;border:0;border-radius:0;text-align:left;padding:13px 3px}.issue__summary:hover{background:#121d2d}.issue--error .issue__summary{border-left:3px solid #ef7777}.issue--warning .issue__summary{border-left:3px solid #e4b85f}.issue--info .issue__summary{border-left:3px solid #76a2dc}.issue__title{display:grid;gap:2px}.issue__title b{color:#e5e7eb}.issue__title small{color:#8292a8;font-size:11px}.issue__chevron{color:#8495ab}.issue__details{padding:2px 10px 14px 22px}.issue__details p{margin:6px 0;color:#b6c3d4}.issue__meta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;color:#8190a5;font-size:12px}.primary{background:#1e304a}@media(max-width:800px){.phase27__header,.toolbar{flex-direction:column;align-items:stretch}.overview-grid,.layout{grid-template-columns:1fr}.toolbar label,.filters label{min-width:0}.toolbar__stats{justify-content:flex-start}.actions button{flex:1}.actions{width:100%}}
</style>
