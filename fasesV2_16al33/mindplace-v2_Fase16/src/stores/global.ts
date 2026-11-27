import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    phase: 16,
    architecture: 'vue3-typescript-vite-pinia-router',
    legacyReady: false,
    legacyVersion: '',
    legacyError: '',
    saveStatus: 'saved' as 'saved' | 'saving' | 'pending' | 'error'
  }),
  getters: { isReady: state => state.legacyReady && !state.legacyError },
  actions: {
    markLegacyReady(version: string) { this.legacyReady = true; this.legacyVersion = version; this.legacyError = ''; },
    markLegacyError(message: string) { this.legacyError = message; this.saveStatus = 'error'; }
  }
});
