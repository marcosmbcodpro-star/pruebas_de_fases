import type { CaseModel, MindPlaceStore, PreferencesModel } from './models';

export interface GlobalState { phase: number; architecture: string; legacyReady: boolean; legacyVersion: string; legacyError: string; }
export type MobilePanel = 'none' | 'cases' | 'research' | 'actions' | 'search' | 'more';

export interface BoardUiState {
  currentCaseId: string | null; selectedCardId: string | null; selectedEdgeId: string | null;
  zoomLevel: number; linkMode: boolean; sidebarOpen: boolean; activePanel: string | null;
  mobilePanel: MobilePanel; mobileNavMode: 'mobile' | 'desktop';
}

export const createEmptyBoardUiState = (): BoardUiState => ({
  currentCaseId: null, selectedCardId: null, selectedEdgeId: null, zoomLevel: 1,
  linkMode: false, sidebarOpen: false, activePanel: null, mobilePanel: 'none', mobileNavMode: 'mobile'
});

export const createDefaultPreferences = (): PreferencesModel => ({
  theme: 'allanwake2', boardZoom: 1, caseSort: 'updated-desc', caseCategoryFilter: [], compactMode: false, reducedMotion: false, advancedGestures: true
});

export const createEmptyStoreModel = (): MindPlaceStore => ({
  index: [], cases: {}, theme: 'allanwake2', caseSort: 'updated-desc', caseCategoryFilter: [],
  preferences: createDefaultPreferences(), storageVersion: 2, dataVersion: 3
});

export function getCaseFromStore(store: MindPlaceStore, id: string | null): CaseModel | null { return id ? store.cases[id] ?? null : null; }
