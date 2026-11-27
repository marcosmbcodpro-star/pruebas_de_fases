import { createRouter, createWebHistory } from 'vue-router';
import WorkspaceView from '../views/WorkspaceView.vue';
import MigrationView from '../views/MigrationView.vue';
import Phase17View from '../views/Phase17View.vue';
import Phase19View from '../views/Phase19View.vue';
import Phase20View from '../views/Phase20View.vue';
import Phase21View from '../views/Phase21View.vue';
import Phase22View from '../views/Phase22View.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'workspace', component: WorkspaceView },
    { path: '/fase-16', name: 'phase16', component: MigrationView },
    { path: '/fase-17', name: 'phase17', component: Phase17View },
    { path: '/fase-19', name: 'phase19', component: Phase19View },
    { path: '/fase-20', name: 'phase20', component: Phase20View },
    { path: '/fase-21', name: 'phase21', component: Phase21View },
    { path: '/fase-22', name: 'phase22', component: Phase22View }
  ],
  scrollBehavior: () => ({ left: 0, top: 0 })
});
