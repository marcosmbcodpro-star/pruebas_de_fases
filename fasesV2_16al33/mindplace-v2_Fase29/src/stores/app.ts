import { defineStore } from 'pinia';
import { useGlobalStore } from './global';
import { useUiStore } from './ui';
import { useCaseStore } from './case';

export const useAppStore = defineStore('app', {
  getters: {
    global: () => useGlobalStore(),
    ui: () => useUiStore(),
    cases: () => useCaseStore(),
    currentCaseId: () => useUiStore().currentCaseId,
    isReady: () => useGlobalStore().isReady
  }
});
