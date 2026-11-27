<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { filterCommands, getCommandContext, PHASE29_COMMANDS, type PaletteCommand } from '../services/command-palette';

const open = ref(false);
const input = ref('');
const selected = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);
const router = useRouter();
const route = useRoute();

const commands = computed(() => filterCommands(PHASE29_COMMANDS, input.value, getCommandContext(route.path)));

function show(value = true) {
  open.value = value;
  if (value) {
    input.value = '';
    selected.value = 0;
    void nextTick(() => inputEl.value?.focus());
  }
}
function toggle() { show(!open.value); }
function close() { show(false); }
function move(delta: number) {
  if (!commands.value.length) return;
  selected.value = (selected.value + delta + commands.value.length) % commands.value.length;
}
function postLegacy(command: string, payload?: Record<string, unknown>) {
  window.postMessage({ type: 'mindplace:phase29-command', command, payload }, window.location.origin);
}
function run(command: PaletteCommand = commands.value[selected.value]) {
  if (!command) return;
  close();
  if (command.action.type === 'route') { void router.push(command.action.to); return; }
  if (command.action.type === 'search') { void router.push({ path: '/fase-28', query: input.value.trim() ? { q: input.value.trim() } : undefined }); return; }
  postLegacy(command.action.command, command.action.payload);
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); close(); return; }
  if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return; }
  if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); return; }
  if (event.key === 'Enter') { event.preventDefault(); run(); }
}
watch(input, () => { selected.value = 0; });

defineExpose({ show, toggle, close });
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="command-palette__backdrop" role="presentation" @pointerdown.self="close">
      <section class="command-palette" role="dialog" aria-modal="true" aria-labelledby="commandPaletteTitle">
        <header class="command-palette__head">
          <div><span class="eyebrow">FASE 29 · 352–362</span><h2 id="commandPaletteTitle">Paleta de comandos</h2></div>
          <kbd>Ctrl K</kbd>
        </header>
        <label class="command-palette__search"><span class="sr-only">Buscar comando</span><input ref="inputEl" v-model="input" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar acción…" @keydown="handleKeydown"></label>
        <div class="command-palette__list" role="listbox" aria-label="Comandos">
          <button v-for="(command, index) in commands" :key="command.id" type="button" class="command-palette__item" :class="{ selected: index === selected }" role="option" :aria-selected="index === selected" @mouseenter="selected = index" @click="run(command)">
            <span class="icon">⌘</span><span class="body"><strong>{{ command.title }}</strong><small>{{ command.description }}</small></span><span v-if="command.shortcut" class="shortcut">{{ command.shortcut }}</span>
          </button>
          <div v-if="!commands.length" class="command-palette__empty">No hay comandos que coincidan.</div>
        </div>
        <footer><span>↑ ↓ navegar</span><span>Enter ejecutar</span><span>Esc cerrar</span></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.command-palette__backdrop{position:fixed;inset:0;z-index:10000;background:rgba(4,8,15,.72);backdrop-filter:blur(8px);display:grid;place-items:start center;padding:10vh 16px 24px}.command-palette{width:min(680px,100%);background:#0f1727;border:1px solid #2a3a51;border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.5);overflow:hidden;color:#e8eef7}.command-palette__head{display:flex;justify-content:space-between;align-items:start;padding:18px 18px 10px}.eyebrow{font-size:10px;letter-spacing:.16em;color:#8fa1bb;font-weight:800}.command-palette h2{margin:4px 0 0;font-size:22px}.command-palette kbd,.shortcut{border:1px solid #32445d;border-radius:7px;padding:4px 7px;background:#182339;color:#9fb0c6;font-size:11px}.command-palette__search{display:block;padding:0 14px 14px}.command-palette__search input{width:100%;box-sizing:border-box;border:1px solid #34465e;background:#172237;color:#f2f6fb;border-radius:11px;padding:12px 13px;font-size:16px;outline:none}.command-palette__search input:focus{border-color:#667d9e;box-shadow:0 0 0 3px rgba(100,126,160,.16)}.command-palette__list{max-height:min(56vh,520px);overflow:auto;padding:0 8px 8px}.command-palette__item{width:100%;display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;text-align:left;border:0;background:transparent;color:#e7edf6;padding:11px 10px;border-radius:11px;cursor:pointer}.command-palette__item.selected,.command-palette__item:hover{background:#1a2940}.command-palette__item .icon{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:#172439;color:#9eb1ca}.body{display:grid;gap:2px}.body small{color:#8fa0b6}.command-palette__empty{padding:32px 16px;text-align:center;color:#8fa0b6}.command-palette footer{display:flex;gap:16px;padding:11px 16px;color:#7e8fa5;border-top:1px solid #223149;font-size:11px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:700px){.command-palette__backdrop{padding:6vh 10px 12px}.command-palette{border-radius:16px}.command-palette footer{justify-content:space-between;gap:6px}.shortcut{display:none}}
</style>
