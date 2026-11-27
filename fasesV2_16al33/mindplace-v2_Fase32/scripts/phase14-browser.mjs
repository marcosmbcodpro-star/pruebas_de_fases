import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {existsSync, mkdtemp, readFileSync, rm, statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUESTED_PORT = Number(process.env.MINDPLACE_TEST_PORT || 0);
let PORT = REQUESTED_PORT;
let BASE_URL = process.env.MINDPLACE_TEST_URL || '';


function findChrome() {
  const candidates = [
    process.env.MINDPLACE_CHROME_PATH,
    process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe') : '/usr/bin/google-chrome',
    process.platform === 'win32' ? path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe') : '/usr/bin/chromium',
    process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe') : '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find(existsSync) || null;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(REQUESTED_PORT, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new globalThis.URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400); return res.end(); }
    const safe = path.normalize(urlPath).replace(/^([/\\])+/, '');
    const file = path.join(ROOT, safe || 'index_mejoras.html');
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      const body = readFileSync(file);
      const ext = path.extname(file).toLowerCase();
      const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
      res.writeHead(200, {'Content-Type': types[ext] || 'application/octet-stream', 'Content-Length': statSync(file).size});
      res.end(body);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function sleep(ms) { await new Promise(r => setTimeout(r, ms)); }

class CDP {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.ws = null; this.id = 0; this.pending = new Map(); } 
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.exceptionThrown' || (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error')) {
        this._runtimeErrors ||= [];
        this._runtimeErrors.push(msg.params?.exceptionDetails?.text || msg.params?.entry?.text || 'Browser error');
      }
      if (msg.id && this.pending.has(msg.id)) {
        const {resolve, reject} = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    };
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }
  async send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({id, method, params}));
    return new Promise((resolve, reject) => this.pending.set(id, {resolve, reject}));
  }
  async eval(expression, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', {expression, awaitPromise, returnByValue: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'Runtime.evaluate exception');
    return r.result?.value;
  }
  close() { this.ws?.close(); }
}

const chrome = findChrome();
assert.ok(chrome, `No se encontró Chrome/Chromium. Define MINDPLACE_CHROME_PATH. OS=${process.platform}`);

PORT = await findFreePort();
if (!BASE_URL) BASE_URL = `http://127.0.0.1:${PORT}/index_mejoras.html`;
const testUrl = BASE_URL;
const server = await startServer();
const userDataDir = mkdtemp(path.join(os.tmpdir(), 'mindplace-phase14-browser-'));
let userDataDirCreated = true;
const debugPort = await findFreePort();
const chromeProc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-extensions', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`, 'about:blank'
], {stdio: 'ignore'});

let cdp;
try {
  let version;
  for (let i = 0; i < 50; i++) {
    try { version = await fetchJson(`http://127.0.0.1:${debugPort}/json/version`); break; } catch { await sleep(100); }
  }
  assert.ok(version?.webSocketDebuggerUrl, 'Chromium no abrió el endpoint de depuración');
  let target;
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      target = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch {}
    await sleep(100);
  }
  assert.ok(target?.webSocketDebuggerUrl, 'Chromium no creó una pestaña de prueba');
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await cdp.send('Page.navigate', {url: testUrl});
  for (let i=0; i<40; i++) {
    const href = await cdp.eval('location.href');
    if (href === testUrl) break;
    await sleep(100);
  }
  await sleep(500);

  const basic = await cdp.eval(`({
    title: document.title,
    settings: document.querySelectorAll('#settingsOverlay').length,
    onboarding: document.querySelectorAll('#onboardingOverlay').length,
    help: document.querySelectorAll('#helpPanel').length,
    search: document.querySelectorAll('#caseSearchPanel').length,
    filters: document.querySelectorAll('#caseFilterPanel').length,
    backup: document.querySelectorAll('#backupOverlay').length,
    importOverlay: document.querySelectorAll('#caseImportOverlay').length,
    newCase: document.querySelectorAll('#newCaseOverlay').length
  })`);
  assert.equal(basic.title, 'Tablero de Caso');
  for (const [key, value] of Object.entries(basic).slice(1)) assert.equal(value, 1, `Falta ${key}`);

  await cdp.eval(`(() => {
    document.querySelector('#onboardingSkip')?.click();
    const btn = document.querySelector('[data-theme-setting="futuristic"]');
    const overlay = document.querySelector('#settingsOverlay');
    overlay.classList.remove('hidden'); overlay.removeAttribute('inert'); overlay.setAttribute('aria-hidden','false');
    btn?.click();
  })()`);
  const theme = await cdp.eval(`document.body.classList.contains('theme-futuristic') || document.querySelector('[data-theme-setting="futuristic"].active') !== null`);
  assert.equal(theme, true, 'El tema futurista no se aplicó');

  await cdp.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',code:'Slash',shiftKey:true,bubbles:true,cancelable:true}))`);
  const helpVisible = await cdp.eval(`!document.querySelector('#helpPanel')?.classList.contains('hidden')`);
  assert.ok(helpVisible, 'El atajo ? no abrió la ayuda');
  await cdp.eval(`document.querySelector('#helpPanel')?.querySelector('[aria-label=\"Cerrar ayuda\"],#helpClose')?.click()`);

  await cdp.eval(`document.querySelector('#settingsDone')?.click()`);
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await sleep(100);
  const responsive = await cdp.eval(`({toolbar:!!document.querySelector('#toolbar'), menu:!!document.querySelector('#menu'), width:innerWidth})`);
  assert.equal(responsive.toolbar, true);
  assert.equal(responsive.menu, true);
  assert.equal(responsive.width, 390);

  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await cdp.eval(`document.querySelector('.newCaseHeaderBtn')?.click()`);
  await sleep(100);
  const modal = await cdp.eval(`({visible:!document.querySelector('#newCaseOverlay')?.classList.contains('hidden'), ariaHidden:document.querySelector('#newCaseOverlay')?.getAttribute('aria-hidden'), inert:document.querySelector('#newCaseOverlay')?.hasAttribute('inert')})`);
  assert.equal(modal.visible, true);
  assert.equal(modal.ariaHidden, 'false');
  assert.equal(modal.inert, false);
  await cdp.eval(`document.querySelector('#ncName').value='Prueba Fase 14'; document.querySelector('#ncAccept').click()`);
  await sleep(700);
  const created = await cdp.eval(`({overlayHidden:document.querySelector('#newCaseOverlay')?.classList.contains('hidden'), cases:document.querySelectorAll('#caseGrid .case-card').length || 0, name:document.querySelector('#caseTitle')?.value || ''})`);
  assert.equal(created.overlayHidden, true);
  assert.ok(created.cases >= 1 || created.name === 'Prueba Fase 14');

  const runtimeErrors = cdp._runtimeErrors || [];
  assert.deepEqual(runtimeErrors, []);

  console.log('PASS browser smoke: interfaz, tema, responsive, ayuda y creación de caso');
} finally {
  cdp?.close();
  server.close();
  chromeProc.kill();
  if (userDataDirCreated) {
    try { await rm(userDataDir, {recursive: true, force: true}); } catch {}
  }
}
