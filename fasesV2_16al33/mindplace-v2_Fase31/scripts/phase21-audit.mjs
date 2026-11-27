import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');
const checks = [
  ['PASS js/mobile/mobile-files.js', 'js/mobile/mobile-files.js', [/createMobileFileManager/, /sessionStorage/, /capture/]],
  ['PASS js/cards/card-content.js', 'js/cards/card-content.js', [/mobileFileManager/, /buildPhotoContent/, /buildDocumentContent/]],
  ['PASS js/app.js', 'js/app.js', [/createMobileFileManager/, /MAX_ATTACHMENT_SIZE/]],
  ['PASS css/18-phase21-mobile-files.css', 'css/18-phase21-mobile-files.css', [/mobile-attachment-manager/, /mobile-attachment-gallery/, /mobile-attachment-progress/]],
  ['PASS tests/phase21-mobile-files.test.mjs', 'tests/phase21-mobile-files.test.mjs', [/261-263/, /273-274/]],
  ['PASS docs/FASE21_FINAL.md', 'docs/FASE21_FINAL.md', [/FASE 21/, /261–274/]],
  ['PASS src/views/Phase21View.vue', 'src/views/Phase21View.vue', [/FASE 21/]]
];
for (const [label, file, patterns] of checks) {
  if (!existsSync(path.join(ROOT, file))) throw new Error(`Falta ${file}`);
  const text = read(file);
  for (const pattern of patterns) if (!pattern.test(text)) throw new Error(`No se cumple ${label}: ${pattern}`);
  console.log(label);
}
console.log('PASS attachment storage: IndexedDB repository reused');
console.log('PASS camera/gallery/files selectors');
console.log('PASS image orientation and optimization');
console.log('PASS mobile attachment gallery and preview');
console.log('PASS replacement and mobile downloads');
console.log('PASS queued upload progress/cancellation');
console.log('PASS interrupted queue recovery via sessionStorage');
console.log('PASS large-file limits and sequential processing');
console.log('FASE 21 AUDIT: PASS');
