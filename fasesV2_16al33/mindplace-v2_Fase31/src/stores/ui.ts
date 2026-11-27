import { defineStore } from 'pinia';
import { createEmptyBoardUiState, type MobilePanel } from '../domain/state';

export const useUiStore = defineStore('ui', {
  state: () => createEmptyBoardUiState(),
  actions: {
    selectCard(id: string | null) { this.selectedCardId = id; this.selectedEdgeId = null; },
    selectEdge(id: string | null) { this.selectedEdgeId = id; this.selectedCardId = null; },
    setCurrentCase(id: string | null) { this.currentCaseId = id; this.selectedCardId = null; this.selectedEdgeId = null; },
    setZoom(value: number) { this.zoomLevel = Math.min(4, Math.max(0.25, value)); },
    toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
    setPanel(panel: string | null) { this.activePanel = panel; },
    setMobilePanel(panel: MobilePanel) { this.mobilePanel = panel; },
    setMobileNavMode(mode: 'mobile' | 'desktop') { this.mobileNavMode = mode; }
  }
});
