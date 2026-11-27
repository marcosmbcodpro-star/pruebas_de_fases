import { defineStore } from 'pinia';
import { createEmptyStoreModel } from '../domain/state';
import type { CaseModel } from '../domain/models';
import { validateStore } from '../services/validation';

export const useCaseStore = defineStore('case', {
  state: () => createEmptyStoreModel(),
  getters: { currentCases: state => Object.values(state.cases) },
  actions: {
    replaceStore(next: unknown) {
      const check = validateStore(next);
      if (!check.valid || !check.value) throw new Error(`Estado inválido: ${check.errors.join(' ')}`);
      Object.assign(this, check.value);
    },
    setCase(caseModel: CaseModel) { this.cases[caseModel.id] = caseModel; },
    removeCase(id: string) { delete this.cases[id]; this.index = this.index.filter(item => item.id !== id); }
  }
});
