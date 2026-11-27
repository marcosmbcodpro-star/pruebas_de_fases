const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/main.js');

let app;
let base;
let token;
let user;
const email = `phase32-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
const password = 'MindPlace32!pass';
const caseId = `case-${Date.now()}`;

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json();
  return { response, body };
}

test.before(async () => {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  base = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await app.close();
});

test('health pública', async () => {
  const { response, body } = await json('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('registro y login JWT', async () => {
  const registered = await json('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name: 'Fase 32' }) });
  assert.equal(registered.response.status, 201);
  assert.ok(registered.body.accessToken);
  user = registered.body.user;
  token = registered.body.accessToken;

  const me = await json('/api/auth/me', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.user.id, user.id);

  const login = await json('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert.equal(login.response.status, 201);
  assert.ok(login.body.accessToken);
});

test('CRUD de caso y pull', async () => {
  const headers = { authorization: `Bearer ${token}` };
  const create = await json(`/api/cases/${caseId}`, { method: 'PUT', headers, body: JSON.stringify({ baseVersion: 0, caseData: { id: caseId, title: 'Caso Fase 32' } }) });
  assert.equal(create.response.status, 200);
  assert.equal(create.body.case.version, 1);

  const list = await json('/api/cases', { headers });
  assert.equal(list.response.status, 200);
  assert.ok(list.body.cases.some((c) => c.id === caseId));

  const pull = await json('/api/sync/pull', { method: 'POST', headers, body: JSON.stringify({ caseIds: [caseId] }) });
  assert.equal(pull.response.status, 201);
  assert.equal(pull.body.cases[0].version, 1);
});

test('detección y resolución de conflicto simultáneo', async () => {
  const headers = { authorization: `Bearer ${token}` };
  const a = await json(`/api/sync/push`, { method: 'POST', headers, body: JSON.stringify({ caseId, baseVersion: 1, caseData: { id: caseId, title: 'Cambio A' } }) });
  assert.equal(a.response.status, 201);
  assert.equal(a.body.case.version, 2);

  const conflict = await json('/api/sync/push', { method: 'POST', headers, body: JSON.stringify({ caseId, baseVersion: 1, caseData: { id: caseId, title: 'Cambio B' } }) });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.body.code, 'SYNC_CONFLICT');
  assert.equal(conflict.body.server.version, 2);

  const resolved = await json(`/api/cases/${caseId}/resolve`, { method: 'POST', headers, body: JSON.stringify({ baseVersion: 2, strategy: 'client', caseData: { id: caseId, title: 'Cambio B' } }) });
  assert.equal(resolved.response.status, 201);
  assert.equal(resolved.body.case.version, 3);
  assert.equal(resolved.body.case.data.title, 'Cambio B');
});

test('resolución cliente sin datos devuelve 400', async () => {
  const headers = { authorization: `Bearer ${token}` };
  const invalid = await json(`/api/cases/${caseId}/resolve`, { method: 'POST', headers, body: JSON.stringify({ baseVersion: 3, strategy: 'client' }) });
  assert.equal(invalid.response.status, 400);
});
