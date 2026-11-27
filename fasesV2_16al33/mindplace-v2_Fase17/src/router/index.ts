import { createRouter, createWebHistory } from 'vue-router';
import WorkspaceView from '../views/WorkspaceView.vue';
import MigrationView from '../views/MigrationView.vue';
import Phase17View from '../views/Phase17View.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'workspace', component: WorkspaceView },
    { path: '/fase-16', name: 'phase16', component: MigrationView },
    { path: '/fase-17', name: 'phase17', component: Phase17View }
  ],
  scrollBehavior: () => ({ left: 0, top: 0 })
});
