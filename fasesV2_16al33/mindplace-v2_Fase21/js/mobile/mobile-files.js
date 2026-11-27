/**
 * Fase 21 — archivos, fotografías y cámara en móvil.
 *
 * Gestiona un flujo móvil específico sobre el repositorio IndexedDB existente:
 * - selector cámara / galería / archivos;
 * - optimización de imágenes y orientación;
 * - cola secuencial con progreso/cancelación;
 * - recuperación de cola interrumpida mediante sessionStorage;
 * - galería/preview y descarga;
 * - sustitución y eliminación de adjuntos;
 * - protección contra archivos grandes y nodos saturados.
 */

const QUEUE_KEY = 'mindplace-mobile-attachment-queue-v1';
const MAX_DIMENSION = 2560;
const OPTIMIZE_FROM_BYTES = 1.25 * 1024 * 1024;
const IMAGE_QUALITY = 0.82;
const THUMB_DIMENSION = 720;
const MAX_SESSION_QUEUE_ITEMS = 20;

function isImage(fileOrMeta) {
  return /^image\//i.test(String(fileOrMeta?.type || fileOrMeta?.mimeType || ''));
}

function formatSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name = '') {
  const match = String(name).trim().toLowerCase().match(/\.([a-z0-9]{1,12})$/);
  return match ? match[1] : '';
}

function safeName(name) {
  return String(name || 'Adjunto').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180) || 'Adjunto';
}

function canStoreFiles() {
  return typeof Blob !== 'undefined' && typeof File !== 'undefined';
}

function readSessionQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, MAX_SESSION_QUEUE_ITEMS) : [];
  } catch (_) {
    return [];
  }
}

function writeSessionQueue(items) {
  try {
    const list = Array.isArray(items) ? items.slice(0, MAX_SESSION_QUEUE_ITEMS) : [];
    if (!list.length) sessionStorage.removeItem(QUEUE_KEY);
    else sessionStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch (_) {
    // sessionStorage no siempre está disponible en modo privado/restricciones del navegador.
  }
}

function updateSessionQueueItem(item) {
  const list = readSessionQueue().filter(entry => entry.key !== item.key);
  if (item.status !== 'done' && item.status !== 'cancelled') list.push(item);
  writeSessionQueue(list);
}

function revoke(url) {
  if (!url || !String(url).startsWith('blob:')) return;
  try { URL.revokeObjectURL(url); } catch (_) {}
}

async function createImagePreviewBlob(file, { maxDimension = MAX_DIMENSION, quality = IMAGE_QUALITY } = {}) {
  if (!isImage(file)) return { blob: file, changed: false, width: 0, height: 0 };
  if (typeof document === 'undefined') return { blob: file, changed: false, width: 0, height: 0 };

  let source = null;
  let width = 0;
  let height = 0;
  let cleanup = () => {};

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        source = await createImageBitmap(file, { imageOrientation: 'from-image' });
        width = source.width;
        height = source.height;
      } catch (_) {
        source = await createImageBitmap(file);
        width = source.width;
        height = source.height;
      }
      cleanup = () => source?.close?.();
    }
  } catch (_) {
    source = null;
  }

  if (!source) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      });
      source = img;
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      cleanup = () => {};
    } finally {
      revoke(url);
    }
  }

  if (!width || !height) {
    cleanup();
    return { blob: file, changed: false, width, height };
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const rasterOptimizable = /^image\/(jpeg|jpg|webp|png)$/i.test(file.type || '');
  const shouldOptimize = rasterOptimizable && (file.size >= OPTIMIZE_FROM_BYTES || scale < 1);

  if (!shouldOptimize) {
    cleanup();
    return { blob: file, changed: false, width, height, thumbnailSource: source };
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    cleanup();
    return { blob: file, changed: false, width, height };
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  const mime = /png/i.test(file.type || '') && file.size < 2 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('No se pudo optimizar la imagen.')), mime, quality);
  });
  cleanup();
  return { blob, changed: true, width: targetWidth, height: targetHeight };
}

async function makeThumbnailDataUrl(blob, maxDimension = THUMB_DIMENSION) {
  if (!isImage(blob) || typeof document === 'undefined') return '';
  const optimized = await createImagePreviewBlob(blob, { maxDimension, quality: 0.76 });
  if (!(optimized.blob instanceof Blob)) return '';
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(optimized.blob);
  });
}

export function createMobileFileManager({
  attachmentRepository,
  getCurrentCaseId = () => '',
  createAttachment,
  maxAttachmentSize,
  maxAttachmentsPerNode = 10,
  save = async () => true,
  render = () => {},
  pushUndo = () => {},
  getNode = () => null,
  onStatus = () => {},
  onQueueChange = () => {}
} = {}) {
  const liveUrls = new Map();
  const managers = new WeakMap();
  let destroyed = false;
  let recoveryNoticeShown = false;

  function report(status) {
    try { onStatus(status); } catch (_) {}
  }

  function queueChanged(queue) {
    try { onQueueChange(queue); } catch (_) {}
  }

  function ensureNodeAttachments(node) {
    node.attachments = Array.isArray(node.attachments) ? node.attachments : [];
    return node.attachments;
  }

  async function prepareFile(file, item) {
    if (!(file instanceof Blob)) throw new Error('El archivo no es válido.');
    if (file.size > Number(maxAttachmentSize || 0)) {
      throw new Error(`"${safeName(file.name)}" supera el límite de ${Math.round(Number(maxAttachmentSize) / 1024 / 1024)} MB.`);
    }

    item.stage = 'preparando'; item.progress = 10; queueChanged(activeQueue(item.node));
    const result = isImage(file) ? await createImagePreviewBlob(file) : { blob: file, changed: false };
    item.stage = isImage(file) ? (result.changed ? 'optimizando' : 'procesando') : 'procesando';
    item.progress = 40; queueChanged(activeQueue(item.node));

    const blob = result.blob;
    if (blob.size > Number(maxAttachmentSize || 0)) {
      throw new Error(`La versión optimizada de "${safeName(file.name)}" sigue superando el límite permitido.`);
    }

    return { blob, width: result.width, height: result.height };
  }

  function activeQueue(node) {
    const manager = managers.get(node);
    return manager ? manager.queue.map(item => ({
      key: item.key,
      name: item.name,
      size: item.size,
      type: item.type,
      stage: item.stage,
      progress: item.progress,
      status: item.status,
      error: item.error || ''
    })) : [];
  }

  function createQueueItem(file, replaceId = '') {
    return {
      key: `mq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      nodeId: '',
      file,
      name: safeName(file.name),
      size: Number(file.size) || 0,
      type: String(file.type || 'application/octet-stream'),
      replaceId: String(replaceId || ''),
      status: 'queued',
      stage: 'en cola',
      progress: 0,
      error: ''
    };
  }

  async function processItem(node, item) {
    if (destroyed || item.status === 'cancelled') return;
    const attachments = ensureNodeAttachments(node);
    try {
      const { blob } = await prepareFile(item.file, item);
      if (item.status === 'cancelled') return;

      item.stage = 'guardando'; item.progress = 65; queueChanged(activeQueue(node));
      const oldAttachment = item.replaceId ? attachments.find(a => a.id === item.replaceId) : null;
      const metadata = await attachmentRepository.putBlob(blob, createAttachment({
        sourceId: node.id,
        caseId: getCurrentCaseId() || '',
        type: isImage(blob) ? 'image' : 'file',
        name: item.name,
        mimeType: blob.type || item.type || 'application/octet-stream',
        size: blob.size,
        extension: extensionOf(item.name)
      }));

      if (item.replaceId) {
        try { await attachmentRepository.deleteOne(item.replaceId); } catch (_) {}
      }

      const next = item.replaceId
        ? attachments.map(a => a.id === item.replaceId ? metadata : a)
        : attachments.concat(metadata);
      node.attachments = next.slice(0, maxAttachmentsPerNode);

      if (node.type === 'photo' && isImage(blob)) {
        try { node.photoData = await makeThumbnailDataUrl(blob); } catch (_) {}
      }

      item.stage = 'completado'; item.progress = 100; item.status = 'done';
      updateSessionQueueItem({ key: item.key, nodeId: node.id, name: item.name, size: item.size, type: item.type, status: 'done' });
      await save();
      try { render(); } catch (_) {}
    } catch (error) {
      item.status = 'error';
      item.stage = 'error';
      item.progress = 0;
      item.error = error?.message || 'No se pudo guardar el archivo.';
      updateSessionQueueItem({ key: item.key, nodeId: node.id, name: item.name, size: item.size, type: item.type, status: 'error' });
      report({ type: 'error', nodeId: node.id, item });
    }
  }

  async function pump(node) {
    const manager = managers.get(node);
    if (!manager || manager.running) return;
    manager.running = true;
    try {
      for (const item of manager.queue) {
        if (destroyed) break;
        if (item.status !== 'queued') continue;
        await processItem(node, item);
        if (item.status === 'error') break;
      }
    } finally {
      manager.running = false;
      manager.queue = manager.queue.filter(item => item.status !== 'done' && item.status !== 'cancelled');
      if (!manager.queue.length) writeSessionQueue([]);
      queueChanged(activeQueue(node));
    }
  }

  function enqueue(node, files, { replaceId = '', replaceFirst = false } = {}) {
    if (!canStoreFiles()) return;
    const manager = managers.get(node) || { queue: [], running: false };
    managers.set(node, manager);
    const list = Array.from(files || []).filter(file => file instanceof File);
    const attachments = ensureNodeAttachments(node);
    const available = Math.max(0, maxAttachmentsPerNode - attachments.length + (replaceId ? 1 : 0));
    if (available <= 0 && !replaceId) {
      report({ type: 'limit', nodeId: node.id, message: `Este elemento ya tiene el máximo de ${maxAttachmentsPerNode} adjuntos.` });
      return;
    }
    const accepted = list.slice(0, replaceId || replaceFirst ? 1 : available);
    for (const file of accepted) {
      const item = createQueueItem(file, replaceId);
      manager.queue.push(item);
      updateSessionQueueItem({ key: item.key, nodeId: node.id, name: item.name, size: item.size, type: item.type, status: item.status });
    }
    queueChanged(activeQueue(node));
    pump(node);
  }

  async function deleteAttachment(node, id) {
    if (!id) return;
    pushUndo();
    try { await attachmentRepository.deleteOne(id); } catch (_) {}
    ensureNodeAttachments(node);
    node.attachments = node.attachments.filter(a => a?.id !== id);
    if (node.type === 'photo' && !node.attachments.length) delete node.photoData;
    await save();
    render();
  }

  function getLiveUrl(id) {
    return liveUrls.get(id) || '';
  }

  async function previewUrl(id) {
    if (!id) return '';
    const existing = liveUrls.get(id);
    if (existing) return existing;
    const url = await attachmentRepository.getUrl(id);
    if (url) liveUrls.set(id, url);
    return url || '';
  }

  async function openAttachment(id, download = false) {
    const record = await attachmentRepository.get(id);
    if (!record?.blob) return false;
    const url = await previewUrl(id);
    if (!url) return false;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    if (download) link.download = safeName(record.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }

  function cancelItem(node, key) {
    const manager = managers.get(node);
    if (!manager) return;
    const item = manager.queue.find(entry => entry.key === key);
    if (!item) return;
    item.status = 'cancelled';
    item.stage = 'cancelado';
    item.progress = 0;
    updateSessionQueueItem({ key: item.key, nodeId: node.id, name: item.name, size: item.size, type: item.type, status: 'cancelled' });
    queueChanged(activeQueue(node));
    manager.queue = manager.queue.filter(entry => entry.key !== key);
  }

  function retryItem(node, key) {
    const manager = managers.get(node);
    const item = manager?.queue.find(entry => entry.key === key);
    if (!item || item.status !== 'error') return;
    item.status = 'queued'; item.stage = 'en cola'; item.progress = 0; item.error = '';
    pump(node);
    queueChanged(activeQueue(node));
  }

  function retryPersistedQueue(node) {
    const persisted = readSessionQueue().filter(entry => !entry.nodeId || entry.nodeId === node.id);
    if (!persisted.length || recoveryNoticeShown) return false;
    recoveryNoticeShown = true;
    report({ type: 'recovery-available', nodeId: node.id, items: persisted });
    return true;
  }

  function createPicker(node, options = {}) {
    const manager = managers.get(node) || { queue: [], running: false };
    managers.set(node, manager);
    const root = document.createElement('section');
    root.className = 'mobile-attachment-manager';
    root.setAttribute('aria-label', 'Archivos y fotografías');
    root.dataset.nodeId = node.id;

    const header = document.createElement('div');
    header.className = 'mobile-attachment-manager__header';
    const title = document.createElement('div');
    title.innerHTML = '<strong>Adjuntos</strong><span class="mobile-attachment-manager__count"></span>';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'mobile-attachment-manager__actions';
    const makeInput = (accept, label, capture = '') => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = accept; input.multiple = !options.single;
      input.className = 'mobile-attachment-input'; input.setAttribute('aria-label', label);
      if (capture) input.setAttribute('capture', capture);
      input.addEventListener('pointerdown', e => e.stopPropagation());
      input.addEventListener('click', e => e.stopPropagation());
      return input;
    };

    const fileInput = makeInput('.pdf,.doc,.docx,.txt,.md,.markdown,.html,.htm,.json,.csv,.xml,.js,.ts,.py,.java,.cs,.cpp,.h,.sql,.log,.rtf,.epub,.zip,.rar,.7z,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,application/*,text/*', 'Seleccionar archivos');
    const galleryInput = makeInput('image/*', 'Seleccionar fotografías de la galería');
    const cameraInput = makeInput('image/*', 'Tomar fotografía con la cámara', 'environment');

    const makeButton = (label, icon, input) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'mobile-attachment-action'; button.innerHTML = `<span>${icon}</span><span>${label}</span>`;
      button.addEventListener('pointerdown', e => e.stopPropagation()); button.addEventListener('click', e => { e.stopPropagation(); input.click(); });
      return button;
    };
    actions.appendChild(makeButton('Cámara', '📷', cameraInput));
    actions.appendChild(makeButton('Galería', '🖼️', galleryInput));
    actions.appendChild(makeButton('Archivos', '📎', fileInput));
    actions.append(fileInput, galleryInput, cameraInput);
    header.appendChild(actions);
    root.appendChild(header);

    const hint = document.createElement('p');
    hint.className = 'mobile-attachment-manager__hint';
    hint.textContent = 'Hasta 10 adjuntos por elemento · 25 MB por archivo';
    root.appendChild(hint);

    const persistedForNode = readSessionQueue().filter(entry => !entry.nodeId || entry.nodeId === node.id);
    if(persistedForNode.length){
      const recovery = document.createElement('div');
      recovery.className = 'mobile-attachment-recovery';
      const recoveryText = document.createElement('span');
      recoveryText.textContent = `Hay ${persistedForNode.length} archivo(s) pendientes de una sesión anterior.`;
      const recoveryButton = document.createElement('button');
      recoveryButton.type = 'button';
      recoveryButton.textContent = 'Reanudar';
      recoveryButton.addEventListener('click', e => {
        e.stopPropagation();
        fileInput.dataset.recovery = 'true';
        fileInput.click();
      });
      recovery.append(recoveryText, recoveryButton);
      root.appendChild(recovery);
    }

    const queueEl = document.createElement('div'); queueEl.className = 'mobile-attachment-queue'; root.appendChild(queueEl);
    const gallery = document.createElement('div'); gallery.className = 'mobile-attachment-gallery'; root.appendChild(gallery);

    const render = async () => {
      const attachments = ensureNodeAttachments(node);
      const count = root.querySelector('.mobile-attachment-manager__count');
      if (count) count.textContent = ` · ${attachments.length}/${maxAttachmentsPerNode}`;
      gallery.replaceChildren();
      for (const meta of attachments) {
        const item = document.createElement('article'); item.className = 'mobile-attachment-item'; item.dataset.attachmentId = meta.id;
        const thumb = document.createElement('div'); thumb.className = 'mobile-attachment-thumb';
        if (isImage(meta)) {
          const url = await previewUrl(meta.id);
          if (url) {
            const img = document.createElement('img'); img.src = url; img.alt = meta.name || 'Fotografía'; thumb.appendChild(img);
          } else thumb.textContent = 'IMG';
        } else {
          thumb.textContent = (extensionOf(meta.name) || 'FILE').toUpperCase().slice(0, 6);
        }
        const body = document.createElement('div'); body.className = 'mobile-attachment-item__body';
        const name = document.createElement('strong'); name.textContent = meta.name || 'Adjunto'; body.appendChild(name);
        const sub = document.createElement('span'); sub.textContent = `${formatSize(meta.size)} · ${meta.mimeType || 'archivo'}`; body.appendChild(sub);
        const controls = document.createElement('div'); controls.className = 'mobile-attachment-item__controls';
        const previewBtn = document.createElement('button'); previewBtn.type='button'; previewBtn.textContent=isImage(meta)?'Ver':'Abrir';
        previewBtn.addEventListener('click',e=>{e.stopPropagation();openAttachment(meta.id,false);});
        const downloadBtn = document.createElement('button'); downloadBtn.type='button'; downloadBtn.textContent='Descargar'; downloadBtn.addEventListener('click',e=>{e.stopPropagation();openAttachment(meta.id,true);});
        const replaceBtn = document.createElement('button'); replaceBtn.type='button'; replaceBtn.textContent='Sustituir'; replaceBtn.addEventListener('click',e=>{e.stopPropagation();fileInput.dataset.replaceId=meta.id;galleryInput.dataset.replaceId=meta.id;cameraInput.dataset.replaceId=meta.id;cameraInput.click();});
        const deleteBtn = document.createElement('button'); deleteBtn.type='button'; deleteBtn.textContent='Quitar'; deleteBtn.addEventListener('click',e=>{e.stopPropagation();deleteAttachment(node,meta.id);});
        controls.append(previewBtn,downloadBtn,replaceBtn,deleteBtn); body.appendChild(controls); item.append(thumb,body); gallery.appendChild(item);
      }
      queueEl.replaceChildren();
      for(const item of manager.queue){
        const row=document.createElement('div'); row.className='mobile-attachment-progress';
        const text=document.createElement('div'); text.className='mobile-attachment-progress__text'; text.innerHTML=`<strong>${item.name}</strong><span>${item.stage}${item.error?` · ${item.error}`:''}</span>`;
        const meter=document.createElement('progress'); meter.max=100; meter.value=item.progress;
        const cancel=document.createElement('button'); cancel.type='button'; cancel.textContent=item.status==='error'?'Reintentar':'Cancelar'; cancel.addEventListener('click',e=>{e.stopPropagation();item.status==='error'?retryItem(node,item.key):cancelItem(node,item.key);render();});
        row.append(text,meter,cancel); queueEl.appendChild(row);
      }
    };

    const handleFiles = (event) => {
      const input = event.currentTarget;
      const files = input.files;
      if (!files?.length) return;
      pushUndo();
      const replaceId = input.dataset.replaceId || '';
      const recovery = input.dataset.recovery === 'true';
      delete input.dataset.replaceId;
      delete input.dataset.recovery;
      if(recovery){
        writeSessionQueue(readSessionQueue().filter(entry => entry.nodeId && entry.nodeId !== node.id));
      }
      enqueue(node, files, { replaceId });
      input.value = '';
      setTimeout(render, 0);
    };
    fileInput.addEventListener('change', handleFiles);
    galleryInput.addEventListener('change', handleFiles);
    cameraInput.addEventListener('change', handleFiles);

    const statusHandler = () => render();
    manager.render = render;
    manager.root = root;
    manager.statusHandler = statusHandler;
    manager.sync = () => render();
    render();

    retryPersistedQueue(node);
    return root;
  }

  function syncNode(node) {
    const manager = managers.get(node);
    manager?.sync?.();
  }

  function destroy() {
    destroyed = true;
    for (const url of liveUrls.values()) revoke(url);
    liveUrls.clear();
  }

  return {
    createPicker,
    enqueue,
    cancelItem,
    retryItem,
    deleteAttachment,
    previewUrl,
    openAttachment,
    syncNode,
    readInterruptedQueue: readSessionQueue,
    destroy,
    formatSize
  };
}
