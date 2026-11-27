<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { installLegacyBridge } from './core/legacy-bridge';
import { useGlobalStore } from './stores/global';

const globalStore = useGlobalStore();
const cleanup = installLegacyBridge((message) => {
  if (message.type === 'mindplace:legacy-ready') globalStore.markLegacyReady(message.version);
  else globalStore.markLegacyError(message.message);
});

onBeforeUnmount(cleanup);
</script>

<template>
  <RouterView />
</template>
