<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from '../router';
import type { CaseModel } from '../domain/models';
import { createIndexedDbStorage, readStore } from '../services/storage';
import { buildGraphModel, collectBranch } from '../services/graph';

const route = useRoute();
const loading = ref(true);
const error = ref('');
const cases = ref<CaseModel[]>([]);
const selectedCaseId = ref(localStorage.getItem('mindplace-last-case-id') || '');
const selectedNodeId = ref<string | null>(null);
const centerId = ref<string | null>(null);
const branchMode = ref(false);
const relationTypes = ref<string[]>([]);
const statuses = ref<string[]>([]);
const tags = ref<string[]>([]);

const currentCase = computed(() => cases.value.find(c => c.id === selectedCaseId.value) || cases.value[0] || null);
const allRelationTypes = computed(() => [...new Set((currentCase.value?.edges || []).map(e => String(e.type || e.kind || 'default')))].sort());
const allStatuses = computed(() => [...new Set((currentCase.value?.nodes || []).map(n => String(n.status || 'normal')))].sort());
const allTags = computed(() => [...new Set((currentCase.value?.nodes || []).flatMap(n => Array.isArray(n.tags) ? n.tags.map(String) : []))].sort());
const graph = computed(() => currentCase.value ? buildGraphModel(currentCase.value, { relationTypes: relationTypes.value, statuses: statuses.value, tags: tags.value }) : { nodes: [], edges: [], clusters: [], hubs: [], isolated: [] });
const visibleNodeIds = computed(() => {
  if (!branchMode.value || !currentCase.value || !selectedNodeId.value) return new Set(graph.value.nodes.map(n => n.id));
  return new Set(collectBranch(currentCase.value, selectedNodeId.value, 2, relationTypes.value));
});
const visibleNodes = computed(() => graph.value.nodes.filter(n => visibleNodeIds.value.has(n.id)));
const visibleEdges = computed(() => graph.value.edges.filter(e => visibleNodeIds.value.has(e.a) && visibleNodeIds.value.has(e.b)));
const viewBox = computed(() => {
  if (centerId.value) {
    const node = graph.value.nodes.find(n => n.id === centerId.value);
    if (node) return `${node.x - 330} ${node.y - 230} 660 460`;
  }
  const nodes = visibleNodes.value;
  if (!nodes.length) return '0 0 1500 900';
  const minX = Math.min(...nodes.map(n => n.x)) - 180;
  const maxX = Math.max(...nodes.map(n => n.x)) + 180;
  const minY = Math.min(...nodes.map(n => n.y)) - 150;
  const maxY = Math.max(...nodes.map(n => n.y)) + 150;
  return `${minX} ${minY} ${Math.max(900, maxX - minX)} ${Math.max(600, maxY - minY)}`;
});
const selectedNode = computed(() => graph.value.nodes.find(n => n.id === selectedNodeId.value) || null);

watch(() => route.query.node, (value) => { if (typeof value === 'string' && graph.value.nodes.some(node => node.id === value)) selectNode(value); });
watch(() => route.query.case, (value) => { if (typeof value === 'string' && cases.value.some(item => item.id === value)) switchCase(value); });

async function loadCases() {
  loading.value = true; error.value = '';
  try {
    const store = await readStore(createIndexedDbStorage());
    cases.value = store ? Object.values(store.cases).filter(Boolean) : [];
    if (selectedCaseId.value && !cases.value.some(c => c.id === selectedCaseId.value)) selectedCaseId.value = cases.value[0]?.id || '';
    if (!selectedCaseId.value) selectedCaseId.value = cases.value[0]?.id || '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el caso.';
    const queryCase = typeof route.query.case === 'string' ? route.query.case : '';
    if (queryCase && cases.value.some(item => item.id === queryCase)) selectedCaseId.value = queryCase;
    const queryNode = typeof route.query.node === 'string' ? route.query.node : '';
    if (queryNode && graph.value.nodes.some(node => node.id === queryNode)) selectNode(queryNode);
  } finally { loading.value = false; }
}
function selectNode(id: string) { selectedNodeId.value = id; centerId.value = id; }
function toggleValue(list: string[], value: string) { return list.includes(value) ? list.filter(v => v !== value) : [...list, value]; }
function resetFilters() { relationTypes.value = []; statuses.value = []; tags.value = []; branchMode.value = false; }
function switchCase(id: string) { selectedCaseId.value = id; localStorage.setItem('mindplace-last-case-id', id); selectedNodeId.value = null; centerId.value = null; resetFilters(); }
function centerSelected() { if (selectedNodeId.value) centerId.value = selectedNodeId.value; }
function centerAll() { centerId.value = null; }
function focusBranch() { if (selectedNodeId.value) { branchMode.value = !branchMode.value; centerId.value = selectedNodeId.value; } }
function backToBoard() { router.push('/'); }

onMounted(loadCases);
</script>

<template>
  <main class="phase26">
    <header class="phase26__header">
      <div><p class="eyebrow">FASE 26 · 315–326</p><h1>Grafo y análisis avanzado</h1><p class="subtitle">Vista alternativa al tablero para explorar relaciones, ramas, hubs, aislados y agrupaciones.</p></div>
      <div class="phase26__actions"><button @click="backToBoard">← Tablero</button><button @click="router.push('/fase-27')">✓ Calidad</button><button @click="loadCases">↻ Actualizar</button></div>
    </header>

    <section v-if="loading" class="panel">Cargando datos del caso…</section>
    <section v-else-if="error" class="panel panel--error">{{ error }}</section>
    <section v-else-if="!currentCase" class="panel">No hay casos disponibles. Crea o abre un caso desde el tablero.</section>
    <template v-else>
      <section class="toolbar panel">
        <label>Caso<select :value="selectedCaseId" @change="switchCase(($event.target as HTMLSelectElement).value)"><option v-for="c in cases" :key="c.id" :value="c.id">{{ c.title }}</option></select></label>
        <div class="toolbar__group"><button @click="centerAll">Centrar todo</button><button :disabled="!selectedNode" @click="centerSelected">Centrar nodo</button><button :disabled="!selectedNode" :class="{active: branchMode}" @click="focusBranch">{{ branchMode ? 'Mostrar todo' : 'Enfocar rama' }}</button></div>
      </section>

      <section class="analysis-grid">
        <aside class="panel filters">
          <h2>Filtros del grafo</h2>
          <div><strong>Relación</strong><label v-for="type in allRelationTypes" :key="type"><input type="checkbox" :checked="relationTypes.includes(type)" @change="relationTypes = toggleValue(relationTypes, type)"> {{ type }}</label></div>
          <div><strong>Estado</strong><label v-for="status in allStatuses" :key="status"><input type="checkbox" :checked="statuses.includes(status)" @change="statuses = toggleValue(statuses, status)"> {{ status }}</label></div>
          <div><strong>Etiquetas</strong><label v-for="tag in allTags" :key="tag"><input type="checkbox" :checked="tags.includes(tag)" @change="tags = toggleValue(tags, tag)"> #{{ tag }}</label></div>
          <button class="secondary" @click="resetFilters">Limpiar filtros</button>
        </aside>

        <section class="panel graph-panel" aria-label="Grafo del caso">
          <div class="graph-panel__summary"><span>{{ visibleNodes.length }} nodos</span><span>{{ visibleEdges.length }} relaciones</span><span>{{ graph.clusters.length }} agrupaciones</span><span>{{ graph.hubs.length }} hubs</span><span>{{ graph.isolated.length }} aislados</span></div>
          <div class="graph-stage">
            <svg :viewBox="viewBox" role="img" aria-label="Grafo de tarjetas y relaciones">
              <g class="edges">
                <line v-for="edge in visibleEdges" :key="edge.id" :x1="graph.nodes.find(n => n.id === edge.a)?.x" :y1="graph.nodes.find(n => n.id === edge.a)?.y" :x2="graph.nodes.find(n => n.id === edge.b)?.x" :y2="graph.nodes.find(n => n.id === edge.b)?.y" :class="['edge', `edge--${edge.type}`]" />
              </g>
              <g class="nodes">
                <g v-for="node in visibleNodes" :key="node.id" :transform="`translate(${node.x} ${node.y})`" class="graph-node" :class="{selected: node.id === selectedNodeId, hub: graph.hubs.includes(node.id), isolated: graph.isolated.includes(node.id)}" tabindex="0" @click="selectNode(node.id)" @keydown.enter="selectNode(node.id)">
                  <circle :r="node.radius" />
                  <text class="node-degree" y="5">{{ node.degree }}</text>
                  <text class="node-label" :y="node.radius + 24">{{ node.label.slice(0, 34) }}</text>
                </g>
              </g>
            </svg>
          </div>
        </section>

        <aside class="panel inspector">
          <h2>Análisis</h2>
          <p v-if="selectedNode"><strong>{{ selectedNode.label }}</strong></p>
          <p v-else>Selecciona un nodo para navegar por sus conexiones.</p>
          <div v-if="selectedNode" class="inspector__stats"><span>Tipo <b>{{ selectedNode.type }}</b></span><span>Estado <b>{{ selectedNode.status }}</b></span><span>Grado <b>{{ selectedNode.degree }}</b></span><span>Agrupación <b>{{ selectedNode.clusterId + 1 }}</b></span><span>Etiquetas <b>{{ selectedNode.tags.length || '—' }}</b></span></div>
          <div class="inspector__blocks"><p><strong>Hubs detectados</strong> · {{ graph.hubs.length }}</p><p><strong>Aislados</strong> · {{ graph.isolated.length }}</p><p><strong>Agrupaciones</strong> · {{ graph.clusters.length }}</p></div>
          <p class="hint">Los hubs son nodos con alta conectividad relativa. Los aislados no tienen relaciones en el conjunto filtrado. Las agrupaciones se calculan por componentes conectados.</p>
        </aside>
      </section>
    </template>
  </main>
</template>

<style scoped>
.phase26{min-height:100dvh;box-sizing:border-box;padding:18px;color:#e5e7eb;background:#0b1120;font:14px/1.45 Inter,system-ui,sans-serif;overflow:auto}.phase26__header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:14px}.eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;color:#93a4bf}.phase26 h1{font-size:clamp(25px,4vw,40px);margin:4px 0}.subtitle{margin:0;color:#9ba9bc}.phase26__actions,.toolbar__group{display:flex;gap:8px;flex-wrap:wrap}.panel{background:#111827;border:1px solid #243247;border-radius:16px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.18)}button,select{border:1px solid #34445a;background:#172033;color:#edf2f7;border-radius:10px;padding:9px 12px;font:inherit}button:hover:not(:disabled),button.active{background:#22324d}button:disabled{opacity:.45;cursor:not-allowed}.toolbar{display:flex;justify-content:space-between;gap:14px;align-items:end;margin-bottom:14px}.toolbar label{display:grid;gap:6px;min-width:250px;color:#9ba9bc}.analysis-grid{display:grid;grid-template-columns:220px minmax(0,1fr) 250px;gap:14px;align-items:stretch}.filters,.inspector{display:flex;flex-direction:column;gap:14px}.filters h2,.inspector h2{margin:0;font-size:16px}.filters>div{display:grid;gap:7px}.filters strong{font-size:12px;color:#9ba9bc}.filters label{display:flex;gap:7px;align-items:center}.secondary{margin-top:auto}.graph-panel{min-width:0}.graph-panel__summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.graph-panel__summary span{padding:5px 8px;border-radius:999px;background:#182235;color:#aebbd0;font-size:12px}.graph-stage{height:min(68vh,760px);min-height:500px;border-radius:12px;overflow:hidden;background:radial-gradient(circle at center,#101a2d,#09101e)}svg{display:block;width:100%;height:100%}.edge{stroke:#53657f;stroke-width:4;opacity:.55}.edge--supports{stroke:#62a57a}.edge--contradicts{stroke:#c16a6a}.edge--causes{stroke:#b59456}.edge--references{stroke:#6d8ebf}.graph-node{cursor:pointer;outline:none}.graph-node circle{fill:#1c293d;stroke:#6e809e;stroke-width:3;transition:transform .15s,stroke-width .15s}.graph-node:hover circle{stroke-width:5}.graph-node.selected circle{stroke:#f2c46c;stroke-width:6}.graph-node.hub circle{fill:#26354d}.graph-node.isolated circle{stroke-dasharray:6 4}.node-degree{font-size:13px;font-weight:900;text-anchor:middle;fill:#f3f4f6;pointer-events:none}.node-label{text-anchor:middle;font-size:13px;font-weight:700;fill:#d8e1ec;pointer-events:none}.inspector__stats{display:grid;gap:8px}.inspector__stats span{display:flex;justify-content:space-between;gap:10px;color:#9ba9bc}.inspector__stats b{color:#e5e7eb}.inspector__blocks{border-top:1px solid #243247;border-bottom:1px solid #243247;padding:10px 0}.hint{color:#8797ad;font-size:12px;margin-top:auto}@media(max-width:1100px){.analysis-grid{grid-template-columns:190px minmax(0,1fr)}.inspector{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.graph-stage{min-height:460px}}@media(max-width:720px){.phase26{padding:12px}.phase26__header,.toolbar{flex-direction:column}.analysis-grid{grid-template-columns:1fr}.filters,.inspector{display:flex}.graph-stage{height:58vh;min-height:420px}.toolbar label{min-width:0;width:100%}.toolbar__group,.phase26__actions{width:100%}.toolbar__group button,.phase26__actions button{flex:1}}
</style>
