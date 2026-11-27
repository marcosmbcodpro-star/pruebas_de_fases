import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

test('261-263: selector móvil de archivos, galería y cámara', () => {
  const m = read('js/mobile/mobile-files.js');
  assert.match(m, /type = 'file'/);
  assert.match(m, /image\/\*/);
  assert.match(m, /capture', capture/);
  assert.match(m, /'environment'/);
  assert.match(m, /Cámara/);
  assert.match(m, /Galería/);
  assert.match(m, /Archivos/);
});

test('264-265: optimización y orientación de fotografías', () => {
  const m = read('js/mobile/mobile-files.js');
  assert.match(m, /createImageBitmap/);
  assert.match(m, /imageOrientation: 'from-image'/);
  assert.match(m, /canvas\.toBlob/);
  assert.match(m, /MAX_DIMENSION/);
});

test('266-269: previsualización, galería, sustitución y descarga', () => {
  const m = read('js/mobile/mobile-files.js');
  assert.match(m, /mobile-attachment-gallery/);
  assert.match(m, /previewUrl/);
  assert.match(m, /openAttachment/);
  assert.match(m, /download = false/);
  assert.match(m, /Sustituir/);
  assert.match(m, /Descargar/);
  assert.match(m, /deleteAttachment/);
});

test('270-272: cola móvil, progreso y cancelación', () => {
  const m = read('js/mobile/mobile-files.js');
  assert.match(m, /queue/);
  assert.match(m, /pump\(node\)/);
  assert.match(m, /progress/);
  assert.match(m, /progress/);
  assert.match(m, /cancelItem/);
  assert.match(m, /Reintentar/);
  assert.match(m, /status === 'cancelled'/);
});

test('273-274: recuperación de cola y protección de archivos grandes', () => {
  const m = read('js/mobile/mobile-files.js');
  assert.match(m, /sessionStorage/);
  assert.match(m, /QUEUE_KEY/);
  assert.match(m, /readInterruptedQueue/);
  assert.match(m, /maxAttachmentSize/);
  assert.match(m, /supera el límite/);
  assert.match(m, /running/);
  const attachments = read('js/core/attachments.js');
  assert.match(attachments, /MAX_ATTACHMENT_SIZE = 25/);
});

test('Fase 21: integración, documentación y estilos existen', () => {
  assert.ok(existsSync(path.join(ROOT, 'js/mobile/mobile-files.js')));
  assert.ok(existsSync(path.join(ROOT, 'css/18-phase21-mobile-files.css')));
  assert.ok(existsSync(path.join(ROOT, 'docs/FASE21_FINAL.md')));
  assert.ok(existsSync(path.join(ROOT, 'scripts/phase21-audit.mjs')));
  assert.ok(existsSync(path.join(ROOT, 'src/views/Phase21View.vue')));
  assert.match(read('js/app.js'), /createMobileFileManager/);
  assert.match(read('css/styles.css'), /18-phase21-mobile-files/);
});
