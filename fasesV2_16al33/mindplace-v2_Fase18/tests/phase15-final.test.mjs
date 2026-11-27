import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_STATUS, LEGACY_CASE_STATUS, createCase } from '../js/models/models.js';
import { validateCase, normalizeCaseStatus } from '../js/models/validators.js';

test('174 — estados operativos de Case y compatibilidad legacy', () => {
  for (const status of Object.values(CASE_STATUS)) {
    const result = validateCase(createCase({ id: `case-${status}`, status }));
    assert.equal(result.valid, true);
    assert.equal(result.normalized.status, status);
  }
  assert.equal(normalizeCaseStatus(LEGACY_CASE_STATUS.PENDIENTE), CASE_STATUS.CURSO);
  assert.equal(normalizeCaseStatus(LEGACY_CASE_STATUS.VALIDADO), CASE_STATUS.RESUELTO);
  assert.equal(normalizeCaseStatus(LEGACY_CASE_STATUS.DESCARTADO), CASE_STATUS.RESUELTO);
  assert.equal(normalizeCaseStatus('estado-inexistente'), CASE_STATUS.ABIERTO);
});
