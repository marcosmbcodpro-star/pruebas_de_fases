import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Fase 30: manifest, iconos y service worker', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.name, 'MindPlace');
  assert.equal(manifest.display, 'standalone');
  const sw = read('public/sw.js');
  assert.match(sw, /clients\.claim/);
  assert.match(sw, /mindplace:pwa-skip-waiting/);
  assert.doesNotMatch(sw, /\.then\(\(\) => self\.skipWaiting\(\)\)/);
  assert.ok(statSync(new URL('../public/icons/icon-192.png', import.meta.url)).size > 100);
  assert.ok(statSync(new URL('../public/icons/icon-512.png', import.meta.url)).size > 100);
});

test('Fase 30: integración de registro y actualización', () => {
  assert.match(read('src/main.ts'), /registerPwa/);
  assert.match(read('src/App.vue'), /PwaStatus/);
  const pwa = read('src/services/pwa.ts');
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /promptPwaInstall/);
  assert.match(pwa, /updatePwa/);
  assert.match(pwa, /registration\.update/);
  assert.match(pwa, /registration\?\.waiting/);
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /window\.location\.reload/);
});

test('Fase 30: instalación, standalone y preservación de datos', () => {
  const view = read('src/views/Phase30View.vue');
  assert.match(view, /Instalar MindPlace/);
  assert.match(view, /standalone/);
  assert.match(view, /IndexedDB/);
});

test('Fase 30: router e index HTML', () => {
  assert.match(read('src/router/index.ts'), /fase-30/);
  const html = read('index.html');
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /theme-color/);
  assert.match(html, /pwa-loading/);
});
