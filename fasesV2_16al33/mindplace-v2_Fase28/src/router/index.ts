import { createRouter, createWebHistory } from 'vue-router';
import WorkspaceView from '../views/WorkspaceView.vue';
import MigrationView from '../views/MigrationView.vue';
import Phase17View from '../views/Phase17View.vue';
import Phase19View from '../views/Phase19View.vue';
import Phase20View from '../views/Phase20View.vue';
import Phase21View from '../views/Phase21View.vue';
import Phase22View from '../views/Phase22View.vue';
import Phase24View from '../views/Phase24View.vue';
import Phase25View from '../views/Phase25View.vue';
import Phase26View from '../views/Phase26View.vue';
import Phase27View from '../views/Phase27View.vue';
import Phase28View from '../views/Phase28View.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'workspace', component: WorkspaceView },
    { path: '/fase-16', name: 'phase16', component: MigrationView },
    { path: '/fase-17', name: 'phase17', component: Phase17View },
    { path: '/fase-19', name: 'phase19', component: Phase19View },
    { path: '/fase-20', name: 'phase20', component: Phase20View },
    { path: '/fase-21', name: 'phase21', component: Phase21View },
    { path: '/fase-22', name: 'phase22', component: Phase22View },
    { path: '/fase-24', name: 'phase24', component: Phase24View },
    { path: '/fase-25', name: 'phase25', component: Phase25View },
    { path: '/fase-26', name: 'phase26', component: Phase26View },
    { path: '/fase-27', name: 'phase27', component: Phase27View },
    { path: '/fase-28', name: 'phase28', component: Phase28View }
  ],
  scrollBehavior: () => ({ left: 0, top: 0 })
});
