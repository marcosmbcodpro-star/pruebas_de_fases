<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import CommandPalette from './components/CommandPalette.vue';
import PwaStatus from './components/PwaStatus.vue';
import OfflineStatus from './components/OfflineStatus.vue';
import { installLegacyBridge } from './core/legacy-bridge';
import { useGlobalStore } from './stores/global';

const globalStore = useGlobalStore();
const palette = ref<InstanceType<typeof CommandPalette> | null>(null);
const onKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); palette.value?.toggle(); }
};
window.addEventListener('keydown', onKeydown);
const onOpenPalette = () => palette.value?.show();
window.addEventListener('mindplace:open-command-palette', onOpenPalette);
const cleanup = installLegacyBridge((message) => {
  if (message.type === 'mindplace:legacy-ready') globalStore.markLegacyReady(message.version);
  else globalStore.markLegacyError(message.message);
});

onBeforeUnmount(() => { cleanup(); window.removeEventListener('keydown', onKeydown); window.removeEventListener('mindplace:open-command-palette', onOpenPalette); });
</script>

<template>
  <RouterView />
  <CommandPalette ref="palette" />
  <PwaStatus />
  <OfflineStatus />
</template>
