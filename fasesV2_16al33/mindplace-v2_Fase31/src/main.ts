import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './styles/phase16.css';
import { registerPwa } from './services/pwa';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
const loading = document.getElementById('pwa-loading');
loading?.classList.add('is-ready');
window.setTimeout(() => loading?.remove(), 240);
void registerPwa();
