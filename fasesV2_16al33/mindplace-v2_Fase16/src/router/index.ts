import { createRouter, createWebHistory } from 'vue-router';
import WorkspaceView from '../views/WorkspaceView.vue';
import MigrationView from '../views/MigrationView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'workspace', component: WorkspaceView },
    { path: '/fase-16', name: 'phase16', component: MigrationView }
  ],
  scrollBehavior: () => ({ left: 0, top: 0 })
});
