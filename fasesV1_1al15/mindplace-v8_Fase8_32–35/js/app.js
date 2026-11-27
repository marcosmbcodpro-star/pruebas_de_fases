import {
  ensureStorageShim,
  deepCloneData,
  safeJsonParse,
  normalizeCategoryFilter,
  makeEmptyStore,
  normalizeStoreForRuntime,
  validateStoreStructure
} from './core/storage.js';
import {
  createEmptyBoardState,
  cloneBoardState,
  normalizeBoardState
} from './core/state.js';
import { createCase as createCaseModel, createNode, createEdge } from './models/models.js';
import { isValidCase, isValidNode, isValidEdge } from './models/validators.js';
import { DEMO_ID, seedPeluqueriaDemo } from './demo/demo-data.js';
import { askConfirm, showRecoveryNotice, showSaveWarning } from './ui/ui.js';
import {
  caseMatchesCategory,
  normalizeCaseCategoryList,
  sortCases,
  statusLabel
} from './cases/case-archive.js';
import {
  hasCaseFilters as hasAnyCaseFilters,
  caseFilterNodeMatches as matchCaseFilterNode,
  getCaseFilterSummaryText,
  getCaseFilterActiveCount,
  FILTER_CONNECTION_MODES,
  serializeCaseFilters,
  deserializeCaseFilters
} from './cases/case-filters.js';
import {
  searchNodeText as buildSearchNodeText,
  normalizeSearchQuery,
  searchTermsMatch,
  searchResultLabel as getSearchResultLabel,
  searchResultKind as getSearchResultKind
} from './cases/case-search.js';
import {
  getRenderSignature as buildRenderSignature,
  getMiniMapSignature as buildMiniMapSignature
} from './board/board-signatures.js';
import {
  drawMiniMap as drawMiniMapVisual,
  resizeMiniMapCanvas as resizeMiniMapCanvasVisual
} from './board/board-visuals.js';
import { renderBoard } from './board/board-render.js';
import { createBoardConnections } from './board/board-connections.js';
import { createBoardInteractions } from './board/board-interactions.js';
import { createBoardNavigation } from './board/board-navigation.js';
import { createHistoryManager } from './core/history-manager.js';
import { createCardUiControls } from './cards/card-ui.js';
import { createCardContentBuilders } from './cards/card-content.js';
import { createCaseEditor } from './cases/case-editor.js';
import { createPersistenceManager } from './core/persistence.js';
import { createAttachmentRepository, MAX_ATTACHMENT_SIZE, MAX_BACKUP_ATTACHMENT_BYTES } from './core/attachments.js';
import { createAttachment } from './models/models.js';
import { createCaseLifecycle } from './cases/case-lifecycle.js';
import {
  buildStructureChildrenMap as buildCaseStructureMap,
  sortStructureIds as sortCaseStructureIds,
  structureNodeIcon as getStructureNodeIcon,
  structureNodeLabel as getStructureNodeLabel,
  structureNodeState as getStructureNodeState
} from './cases/case-structure.js';

ensureStorageShim();

const STORE_KEY = 'tablero-store-v1';
const STORE_STORAGE_VERSION = 2;
const STORE_DATA_VERSION = 3;
const STORE_RECOVERY_KEY = STORE_KEY + '-pre-migration';
const STORE_LAST_GOOD_KEY = STORE_KEY + '-last-good';

let store = { index: [], cases: {}, theme: 'allanwake2', caseSort: 'updated-desc', caseCategoryFilter: [], storageVersion: STORE_STORAGE_VERSION, dataVersion: STORE_DATA_VERSION }; // caseSort: updated-desc|updated-asc|name-asc|name-desc|status; caseCategoryFilter: array
let currentCaseId = null;
let state = createEmptyBoardState();
let attachmentRepository = null;
let lastRenderSignature = '';
let lastMiniMapSignature = '';

let caseSearchMatches = [];
let caseSearchIndex = -1;
let caseSearchQuery = '';
let caseSearchScope = 'case';
let linkMode = false;
let linkSrc = null;
let linkOneShot = false;
let selectedCardId = null;
let connectionFocusIds = new Set();
let selectedEdgeId = null;
let idCounter = 1;

attachmentRepository = createAttachmentRepository({ getCurrentCaseId: () => currentCaseId });

const menuEl = document.getElementById('menu');
const caseGridEl = document.getElementById('caseGrid');
const boardEl = document.getElementById('board');
boardEl.addEventListener('scroll', scheduleMiniMap);
const zoomWrap = document.getElementById('zoomWrap');
let zoomLevel = 1;
const ZOOM_MIN = 0.22;
const ZOOM_MAX = 2.2;
let farPreviewLockedId = null;
let farPreviewHoverId = null;

function closeFarPreview(force=true){
  const preview = document.getElementById('farPreview');
  if(!preview) return;
  if(force) farPreviewLockedId = null;
  preview.classList.remove('show');
  preview.setAttribute('aria-hidden','true');
}

function applyZoom(){
  zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomLevel));
  zoomWrap.style.transform = `scale(${zoomLevel})`;

  // Tres niveles visuales:
  // detallado >= 0.65 · intermedio 0.38-0.65 · lejano < 0.38.
  const isCompact = zoomLevel < 0.65;
  const isVeryFar = zoomLevel < 0.38;
  boardEl.classList.toggle('zoom-compact', isCompact);
  boardEl.classList.toggle('zoom-very-far', isVeryFar);

  // La vista ampliada interactiva existe tanto en intermedia como en lejana.
  if(!isCompact){
    closeFarPreview(true);
  }
  if(typeof updateMiniMap === 'function') updateMiniMap();
}


// =========================
// MINIMAPA
// =========================
const miniMapEl = document.getElementById('miniMap');
const miniCanvas = document.getElementById('miniMapCanvas');
const miniViewport = document.getElementById('miniMapViewport');
const miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

function resizeMiniMapCanvas(){
  resizeMiniMapCanvasVisual({
    state,
    boardEl,
    zoomWrap,
    miniCanvas,
    miniCtx,
    miniMapEl,
    miniViewport,
    zoomLevel,
    currentCaseId,
    drawMiniMapFn: drawMiniMapVisual
  });
}

function drawMiniMap(){
  drawMiniMapVisual({
    state,
    boardEl,
    zoomWrap,
    miniCanvas,
    miniCtx,
    miniMapEl,
    miniViewport,
    zoomLevel,
    currentCaseId
  });
}

let miniMapRaf = 0;
function scheduleMiniMap(){
  if(!miniMapEl || miniMapRaf) return;
  const signature = buildMiniMapSignature({ state, currentCaseId, zoomWrap, boardEl, zoomLevel });
  if(signature === lastMiniMapSignature){
    return;
  }
  lastMiniMapSignature = signature;
  miniMapRaf = requestAnimationFrame(()=>{
    miniMapRaf = 0;
    if(!miniMapEl) return;
    miniMapEl.classList.toggle('hidden', currentCaseId === null);
    drawMiniMap();
  });
}

function updateMiniMap(){
  scheduleMiniMap();
}

if(miniCanvas){
  miniCanvas.addEventListener('click', (e)=>{
    const r=miniCanvas.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const boardW=zoomWrap?.offsetWidth || 4200, boardH=zoomWrap?.offsetHeight || 3000;
    const w=r.width, h=r.height, scale=Math.min(w/boardW,h/boardH);
    const ox=(w-boardW*scale)/2, oy=(h-boardH*scale)/2;
    const targetX=(x-ox)/scale, targetY=(y-oy)/scale;
    const vw=boardEl.clientWidth/zoomLevel, vh=boardEl.clientHeight/zoomLevel;
    boardEl.scrollLeft=Math.max(0, targetX-vw/2)*zoomLevel;
    boardEl.scrollTop=Math.max(0, targetY-vh/2)*zoomLevel;
    updateMiniMap(); drawStrings();
  });
}
window.addEventListener('resize', resizeMiniMapCanvas);

function renderFarPreview(sourceCard, lock=false){
  if(!sourceCard) return;
  const preview = document.getElementById('farPreview');
  const target = document.getElementById('farPreviewContent');
  if(!preview || !target) return;

  const sourceId = sourceCard.dataset.id;
  const clone = sourceCard.cloneNode(true);
  clone.classList.add('far-preview-card');
  clone.dataset.id = sourceId;
  clone.style.left = '';
  clone.style.top = '';
  clone.querySelectorAll('.plus-menu, .case-picker, .evidence-picker').forEach(el=>el.remove());

  // El botón de borrado del clon necesita volver a enlazarse manualmente.
  const del = clone.querySelector(':scope > .del');
  if(del){
    // En la visualización grande, solo este botón (eliminar la etiqueta completa)
    // cambia de la X al texto "Eliminar". Las X de las etiquetas internas no cambian.
    del.textContent = 'Eliminar';
    del.setAttribute('aria-label', 'Eliminar etiqueta');
    del.title = 'Eliminar etiqueta';
    del.addEventListener('pointerdown', e=>e.stopPropagation());
    del.addEventListener('click', e=>{
      e.stopPropagation();
      if(sourceId && sourceId !== '__case__'){
        closeFarPreview(true);
        deleteNode(sourceId);
      }
    });
  }

  // Reemplazamos el + clonado por uno funcional que opera sobre el nodo real.
  const oldPlus = clone.querySelector(':scope > .plus-btn');
  if(oldPlus) oldPlus.remove();

  target.replaceChildren(clone);
  addPlusButton(clone, sourceId);

  // Los controles de etiquetas del clon no conservan los listeners de la tarjeta
  // original porque cloneNode(true) solo copia el DOM. Los reenlazamos aquí para
  // que funcionen también en la visualización ampliada.
  if(sourceId && sourceId !== '__case__'){
    const sourceCardEl = document.querySelector(`[data-id="${CSS.escape(sourceId)}"]`);
    const refreshPreviewFromSource = ()=>{
      setTimeout(()=>{
        const fresh = document.querySelector(`[data-id="${CSS.escape(sourceId)}"]`);
        if(fresh) renderFarPreview(fresh, true);
      }, 35);
    };

    // Eliminar etiquetas/etiqueta de prioridad.
    const cloneTagDels = [...clone.querySelectorAll('.q-tag-del')];
    const sourceTagDels = sourceCardEl ? [...sourceCardEl.querySelectorAll('.q-tag-del')] : [];
    cloneTagDels.forEach((btn, index)=>{
      btn.addEventListener('pointerdown', e=>e.stopPropagation());
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const sourceBtn = sourceTagDels[index];
        if(sourceBtn){
          sourceBtn.click();
          refreshPreviewFromSource();
        }
      });
    });

    // + etiqueta y + prioridad: delegamos en los botones reales de la tarjeta.
    const cloneTagAdds = [...clone.querySelectorAll('.q-tag-add')];
    const sourceTagAdds = sourceCardEl ? [...sourceCardEl.querySelectorAll('.q-tag-add')] : [];
    cloneTagAdds.forEach((btn, index)=>{
      btn.addEventListener('pointerdown', e=>e.stopPropagation());
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const sourceBtn = sourceTagAdds[index];
        if(sourceBtn){
          sourceBtn.click();
          refreshPreviewFromSource();
        }
      });
    });

    // ================================
    // CONTROLES DE LA VISUALIZACION GRANDE
    // ================================
    // cloneNode() copia el aspecto, pero no los listeners. Para que la ficha
    // ampliada sea realmente editable, cada campo contenteditable del clon
    // se vincula con el campo equivalente de la tarjeta original.
    const bindEditableFields = ()=>{
      if(!sourceCardEl) return;
      const cloneFields = [...clone.querySelectorAll('[contenteditable="true"]')];
      const sourceFields = [...sourceCardEl.querySelectorAll('[contenteditable="true"]')];
      cloneFields.forEach((field, index)=>{
        const sourceField = sourceFields[index];
        if(!sourceField) return;
        field.setAttribute('contenteditable','true');
        field.addEventListener('pointerdown', e=>e.stopPropagation());
        field.addEventListener('focus', ()=>{
          // Conserva el contenido actual de la fuente por si el tablero
          // se ha vuelto a renderizar mientras se mostraba la vista grande.
          field.textContent = sourceField.textContent || '';
        });
        field.addEventListener('input', ()=>{
          sourceField.textContent = field.textContent;
          sourceField.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:null}));
          scheduleSave();
        });
        field.addEventListener('blur', ()=>{
          sourceField.textContent = field.textContent;
          sourceField.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:null}));
          save();
        });
      });
    };
    bindEditableFields();

    // ================================
    // ARCHIVOS EN VISUALIZACION GRANDE
    // ================================
    // cloneNode() no copia listeners de los selectores de archivo. En la vista
    // ampliada hacemos que los controles de Foto y Documento disparen el
    // <input type=file> real de la tarjeta original.
    const clonePhotoBoxes = [...clone.querySelectorAll('.photo-box')];
    const sourcePhotoBoxes = sourceCardEl ? [...sourceCardEl.querySelectorAll('.photo-box')] : [];
    clonePhotoBoxes.forEach((box,index)=>{
      const sourceBox = sourcePhotoBoxes[index];
      const sourceInput = sourceBox ? sourceBox.querySelector('input[type="file"]') : null;
      if(!sourceInput) return;
      box.addEventListener('pointerdown', e=>e.stopPropagation());
      box.addEventListener('click', e=>{
        e.stopPropagation();
        e.preventDefault();
        sourceInput.click();
      });
    });

    const cloneDocAttaches = [...clone.querySelectorAll('.d-attach')];
    const sourceDocAttaches = sourceCardEl ? [...sourceCardEl.querySelectorAll('.d-attach')] : [];
    cloneDocAttaches.forEach((attach,index)=>{
      const sourceAttach = sourceDocAttaches[index];
      const sourceInput = sourceAttach ? sourceAttach.querySelector('input[type="file"]') : null;
      if(!sourceInput) return;
      attach.addEventListener('pointerdown', e=>e.stopPropagation());
      attach.addEventListener('click', e=>{
        e.stopPropagation();
        e.preventDefault();
        sourceInput.click();
      });
      const cloneInput = attach.querySelector('input[type="file"]');
      if(cloneInput){
        cloneInput.addEventListener('pointerdown', e=>e.stopPropagation());
        cloneInput.addEventListener('click', e=>{
          e.stopPropagation();
          e.preventDefault();
          sourceInput.click();
        });
      }
    });

    // Botones que ya existen dentro de las distintas tarjetas.
    // Se enrutan al botón equivalente de la tarjeta original para conservar
    // exactamente la misma lógica: colores, importante, verificada,
    // conclusión, resuelto, prioridades, etc.
    if(sourceId === '__case__'){
      const cloneSummary = clone.querySelector('.case-summary-btn');
      if(cloneSummary){
        cloneSummary.style.setProperty('display','block','important');
        cloneSummary.style.setProperty('visibility','visible','important');
        cloneSummary.style.setProperty('opacity','1','important');
        cloneSummary.style.setProperty('pointer-events','auto','important');
        cloneSummary.style.setProperty('position','relative','important');
        cloneSummary.style.setProperty('z-index','60','important');
        cloneSummary.addEventListener('pointerdown', e=>e.stopPropagation());
        cloneSummary.addEventListener('click', e=>{
          e.stopPropagation();
          e.preventDefault();
          // La vista grande es un clon sin listeners propios. Abrimos el
          // resumen directamente y cerramos la previsualización para que el
          // modal quede libre y visible por encima de todo el tablero.
          try{ closeFarPreview(false); }catch{}
          openCaseSummary();
        });
      }
    }

    const proxiedButtonClasses = [
      '.note-color-btn', '.note-color-swatch', '.card-favorite-btn',
      '.q-tag-del', '.q-tag-add',
      '.h-tag-del', '.h-tag-add',
      '.t-stamp', '.t-stamp-add',
      '.e-stamp', '.e-stamp-add',
      '.tag-conclusion-toggle', '.tag-conclusion-resolved', '.tag-conclusion-resolved-add',
      '.c-stamp', '.c-stamp-add',
      '.case-go-btn', '.case-summary-btn'
    ];
    proxiedButtonClasses.forEach(selector=>{
      const cloneButtons = [...clone.querySelectorAll(selector)];
      const sourceButtons = sourceCardEl ? [...sourceCardEl.querySelectorAll(selector)] : [];
      cloneButtons.forEach((btn, index)=>{
        // En la tarjeta CASO el resumen ya tiene un listener específico arriba;
        // evitamos añadir un segundo listener genérico al mismo botón.
        if(sourceId === '__case__' && selector === '.case-summary-btn') return;
        // Estos botones ya pueden tener listeners propios copiados de otros
        // bloques de la vista ampliada. El listener añadido aquí siempre
        // detiene el evento y ejecuta el control real.
        btn.addEventListener('pointerdown', e=>e.stopPropagation());
        btn.addEventListener('click', e=>{
          e.stopPropagation();
          e.preventDefault();
          const sourceBtn = sourceButtons[index];
          if(sourceBtn){
            sourceBtn.click();
            refreshPreviewFromSource();
          }
        });
      });
    });

    // Las X internas de etiquetas/prioridades se han tratado arriba; aquí
    // cubrimos también cualquier botón funcional restante que tenga una
    // clase específica y no sea el + principal ni el botón de eliminar.
    const cloneFunctional = [...clone.querySelectorAll('button')].filter(btn=>
      !btn.classList.contains('plus-btn') && !btn.classList.contains('del') &&
      !btn.classList.contains('q-tag-del') && !btn.classList.contains('q-tag-add') &&
      !btn.classList.contains('h-tag-del') && !btn.classList.contains('h-tag-add') &&
      !btn.classList.contains('note-color-btn') && !btn.classList.contains('note-color-swatch') &&
      !btn.classList.contains('t-stamp') && !btn.classList.contains('t-stamp-add') &&
      !btn.classList.contains('e-stamp') && !btn.classList.contains('e-stamp-add') &&
      !btn.classList.contains('tag-conclusion-toggle') && !btn.classList.contains('tag-conclusion-resolved') && !btn.classList.contains('tag-conclusion-resolved-add') &&
      !btn.classList.contains('c-stamp') && !btn.classList.contains('c-stamp-add') &&
      !btn.classList.contains('case-go-btn')
    );
    cloneFunctional.forEach(btn=>{
      const selector = '.' + [...btn.classList].filter(Boolean).join('.');
      const sourceButtons = sourceCardEl ? [...sourceCardEl.querySelectorAll(selector)] : [];
      const index = cloneFunctional.indexOf(btn);
      const sourceBtn = sourceButtons[0] || sourceButtons[index];
      if(sourceBtn){
        btn.addEventListener('pointerdown', e=>e.stopPropagation());
        btn.addEventListener('click', e=>{
          e.stopPropagation();
          e.preventDefault();
          sourceBtn.click();
          refreshPreviewFromSource();
        });
      }
    });
  }

  preview.classList.add('show');
  preview.setAttribute('aria-hidden','false');
  if(lock){
    farPreviewLockedId = sourceId;
  }
}

function isPreviewZoomActive(){
  return boardEl.classList.contains('zoom-compact') || boardEl.classList.contains('zoom-very-far');
}

function setupFarPreview(cardEl){
  if(!cardEl || cardEl.dataset.farPreviewBound === '1') return;
  cardEl.dataset.farPreviewBound = '1';

  cardEl.addEventListener('mouseenter', ()=>{
    if(!isPreviewZoomActive()) return;
    farPreviewHoverId = cardEl.dataset.id || null;
    if(farPreviewLockedId) return;
    renderFarPreview(cardEl, false);
  });

  cardEl.addEventListener('mouseleave', ()=>{
    farPreviewHoverId = null;
    if(farPreviewLockedId) return;
    const preview = document.getElementById('farPreview');
    if(preview){
      preview.classList.remove('show');
      preview.setAttribute('aria-hidden','true');
    }
  });

  cardEl.addEventListener('click', (e)=>{
    if(!isPreviewZoomActive()) return;

    // En las vistas compacta y lejana, el click sobre la tarjeta sirve
    // para fijar/soltar la ficha ampliada y no para seleccionar la tarjeta
    // subyacente del tablero.
    e.stopPropagation();
    e.preventDefault();

    const id = cardEl.dataset.id || null;
    if(!id) return;
    if(farPreviewLockedId === id){
      closeFarPreview(true);
      return;
    }
    renderFarPreview(cardEl, true);
  });
}

const farPreviewEl = document.getElementById('farPreview');
if(farPreviewEl){
  farPreviewEl.addEventListener('mouseenter', ()=>{
    // Mientras el usuario está sobre la ficha ampliada, no se cierra.
  });
  farPreviewEl.addEventListener('mouseleave', ()=>{
    if(farPreviewLockedId) return;
    const preview = document.getElementById('farPreview');
    if(preview){
      preview.classList.remove('show');
      preview.setAttribute('aria-hidden','true');
    }
  });
}

// Cuando la ficha ampliada está fijada, cualquier clic fuera de ella
// cierra la visualización ampliada. Los clics dentro de la ficha siguen
// siendo interactivos (incluidos borrar, + y cualquier otro control).
document.addEventListener('click', (e)=>{
  if(!farPreviewLockedId) return;
  const preview = document.getElementById('farPreview');
  if(!preview || !preview.classList.contains('show')){
    farPreviewLockedId = null;
    return;
  }
  if(preview.contains(e.target)) return;
  closeFarPreview(true);
});

function focusOnCaseMarker(){ return centerCase(); }
function autoOrganize(){ return organizeBoard({ branchOnly: false }); }

boardEl.addEventListener('wheel', (e)=>{
  if(boardEl.classList.contains('hidden')) return;
  e.preventDefault();
  const wrapRect = zoomWrap.getBoundingClientRect();
  // Punto bajo el cursor, en coordenadas propias (sin escalar) de zoomWrap
  const originX = (e.clientX - wrapRect.left) / zoomLevel;
  const originY = (e.clientY - wrapRect.top) / zoomLevel;

  const delta = -e.deltaY * 0.0018;
  const nextZoom = zoomLevel + delta;

  // Respeta estrictamente los límites: si ya estamos en el mínimo/máximo
  // y el usuario sigue haciendo zoom en esa dirección, no cambia nada.
  const clampedZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom));
  if (clampedZoom === zoomLevel) return;
  zoomLevel = clampedZoom;

  zoomWrap.style.transformOrigin = `${originX}px ${originY}px`;
  applyZoom();
  drawStrings();
  applyParallax();
}, { passive:false });

// Paneo del tablero con el botón izquierdo del ratón.
// Funciona también después de acercar/alejar el zoom y en cualquier zona
// vacía del tablero. Las tarjetas y sus controles conservan sus propias
// interacciones (arrastrar tarjeta, editar, botones, etc.).
let boardPanning = false;
let boardPanStartX = 0;
let boardPanStartY = 0;
let boardPanScrollLeft = 0;
let boardPanScrollTop = 0;
let boardPanMoved = false;

function isBoardPanBlockedTarget(target){
  if(!(target instanceof Element)) return false;
  return !!target.closest('.card, .plus-menu, button, input, textarea, select, [contenteditable=\"true\"]');
}

boardEl.addEventListener('pointerdown', (e)=>{
  if(e.button !== 0) return;
  if(isBoardPanBlockedTarget(e.target)) return;
  if(linkMode) return;

  boardPanning = true;
  boardPanStartX = e.clientX;
  boardPanStartY = e.clientY;
  boardPanScrollLeft = boardEl.scrollLeft;
  boardPanScrollTop = boardEl.scrollTop;
  boardPanMoved = false;
  boardEl.style.cursor = 'grabbing';
  // Mantener la cadena iluminada mientras desplazamos/paneamos el tablero.
  // La selección solo se limpia mediante un click en una zona vacía del tablero.
  try{ boardEl.setPointerCapture(e.pointerId); }catch(err){}
  e.preventDefault();
});

boardEl.addEventListener('pointermove', (e)=>{
  if(!boardPanning) return;
  const dx = e.clientX - boardPanStartX;
  const dy = e.clientY - boardPanStartY;
  if(Math.abs(dx) + Math.abs(dy) > 2) boardPanMoved = true;
  boardEl.scrollLeft = boardPanScrollLeft - dx;
  boardEl.scrollTop = boardPanScrollTop - dy;
  drawStrings();
});

function stopBoardPan(e){
  if(!boardPanning) return;
  boardPanning = false;
  boardEl.style.cursor = linkMode ? 'crosshair' : 'default';
  try{ boardEl.releasePointerCapture(e.pointerId); }catch(err){}
}

boardEl.addEventListener('pointerup', stopBoardPan);
boardEl.addEventListener('pointercancel', stopBoardPan);

// La iluminación permanece aunque el ratón se mueva por el tablero o este se panee.
// Solo se elimina con un click en una zona vacía del tablero. Los controles,
// tarjetas y conexiones gestionan sus propios clicks y no borran la selección.
boardEl.addEventListener('click', (e)=>{
  if(boardPanMoved){
    // El gesto fue un arrastre/paneo, no un clic: no se limpia la iluminación.
    boardPanMoved = false;
    return;
  }
  if(isBoardPanBlockedTarget(e.target)) return;
  if(e.target.closest('.string-hit, .case-marker')) return;
  clearSelection();
});

const topbarEl = document.getElementById('topbar');
const hintEl = document.getElementById('hint');
const cardsEl = document.getElementById('cards');
const svgEl = document.getElementById('strings');
const titleEl = document.getElementById('caseTitle');

const topbarToggle = document.getElementById('topbarToggle');
const cleanModeToggle = document.getElementById('cleanModeToggle');
function updateCleanModeButton(){
  const inCase = currentCaseId !== null;
  cleanModeToggle.classList.toggle('is-visible', inCase);
  cleanModeToggle.setAttribute('aria-hidden', inCase ? 'false' : 'true');
  cleanModeToggle.textContent = document.body.classList.contains('clean-mode') ? '✕ Salir del modo limpio' : '🧠 Tablero limpio';
  cleanModeToggle.setAttribute('aria-label', document.body.classList.contains('clean-mode') ? 'Salir del modo tablero limpio' : 'Activar modo tablero limpio');
}

cleanModeToggle.addEventListener('click', (e)=>{
  e.stopPropagation();
  if(currentCaseId === null) return;
  document.body.classList.toggle('clean-mode');
  const clean = document.body.classList.contains('clean-mode');
  if(clean){
    topbarEl.classList.add('hidden');
    topbarToggle.classList.remove('is-visible');
  } else {
    topbarEl.classList.remove('hidden');
    updateTopbarToggle();
  }
  updateCleanModeButton();
  requestAnimationFrame(()=>{
    drawStrings();
    if(typeof updateMiniMap === 'function') updateMiniMap();
  });
});

function updateTopbarToggle(){
  const inCase = currentCaseId !== null;
  if(!inCase){
    topbarToggle.classList.remove('is-visible');
    topbarToggle.setAttribute('aria-hidden','true');
    return;
  }
  topbarToggle.classList.add('is-visible');
  topbarToggle.setAttribute('aria-hidden','false');
  const hidden = topbarEl.classList.contains('hidden');
  topbarToggle.textContent = hidden ? '▼ Menú' : '▲ Ocultar';
  topbarToggle.setAttribute('aria-label', hidden ? 'Mostrar menú superior' : 'Ocultar menú superior');
  updateCleanModeButton();
}

topbarToggle.addEventListener('click', (e)=>{
  e.stopPropagation();
  if(currentCaseId === null) return;
  topbarEl.classList.toggle('hidden');
  updateTopbarToggle();
  updateCleanModeButton();
});

function uid(prefix){ return prefix + (idCounter++) + '-' + Math.random().toString(36).slice(2,7); }

function todayEs(){
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d = new Date();
  return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
}

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmMsg = document.getElementById('confirmMsg');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

const MAX_UNDO = 80;

const historyManager = createHistoryManager({
  getState: () => state,
  setState: (nextState) => { state = nextState; },
  cloneState: cloneBoardState,
  uid,
  save: () => save(),
  render: () => render(),
  drawStrings: () => boardConnections?.drawStrings?.(),
  scheduleSave: () => scheduleSave(),
  maxUndo: MAX_UNDO
});

const {
  historySnapshot,
  ensureHistory,
  formatHistoryDate,
  renderHistory,
  addHistoryCheckpoint,
  restoreHistory,
  snapshotState,
  pushUndo,
  performUndo,
  performRedo,
  resetUndoHistory
} = historyManager;

let saveDebounceTimer = null;
function scheduleSave(){
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(()=>{ save(); }, 600);
}

// Captura un snapshot una sola vez por "sesión de edición" de un campo editable
// (desde que recibe el foco hasta que lo pierde), en vez de en cada pulsación de tecla.
let editSessionEl = null;
document.addEventListener('focusin', (e)=>{
  const t = e.target;
  if(t && t.isContentEditable){
    if(editSessionEl !== t){
      editSessionEl = t;
      pushUndo();
    }
  }
});
document.addEventListener('focusout', (e)=>{
  if(e.target === editSessionEl) editSessionEl = null;
});

document.addEventListener('keydown', (e)=>{
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if(!mod || (key !== 'z' && key !== 'y')) return;
  const active = document.activeElement;
  const tag = active && active.tagName;
  // Deja el undo nativo del navegador para inputs normales (p.ej. el nombre del caso
  // en los modales), pero intercepta siempre dentro de las tarjetas del tablero.
  if(tag === 'INPUT' || tag === 'TEXTAREA') return;
  e.preventDefault();
  if(active && active.isContentEditable) active.blur();
  editSessionEl = null;
  if(key === 'y' || (key === 'z' && e.shiftKey)){ performRedo(); }
  else { performUndo(); }
});



// ======================================================
// BÚSQUEDA DENTRO DEL CASO
// ======================================================
const helpPanel = document.getElementById('helpPanel');
const helpToggle = document.getElementById('helpToggle');
const helpClose = document.getElementById('helpClose');

function openHelp(){
  if(!helpPanel) return;
  helpPanel.classList.remove('hidden');
  helpPanel.setAttribute('aria-hidden','false');
  helpToggle?.setAttribute('aria-expanded','true');
}

function closeHelp(){
  if(!helpPanel) return;
  helpPanel.classList.add('hidden');
  helpPanel.setAttribute('aria-hidden','true');
  helpToggle?.setAttribute('aria-expanded','false');
}

helpToggle?.addEventListener('click',(e)=>{
  e.stopPropagation();
  if(helpPanel?.classList.contains('hidden')) openHelp();
  else closeHelp();
});
helpClose?.addEventListener('click',closeHelp);
document.addEventListener('click',(e)=>{
  if(!helpPanel || helpPanel.classList.contains('hidden')) return;
  if(helpPanel.contains(e.target) || helpToggle?.contains(e.target)) return;
  closeHelp();
});

const caseSearchPanel = document.getElementById('caseSearchPanel');
const caseSearchToggle = document.getElementById('caseSearchToggle');
const caseSearchInput = document.getElementById('caseSearchInput');
const caseSearchClose = document.getElementById('caseSearchClose');
const caseSearchCount = document.getElementById('caseSearchCount');
const caseSearchPrev = document.getElementById('caseSearchPrev');
const caseSearchNext = document.getElementById('caseSearchNext');
const caseSearchResults = document.getElementById('caseSearchResults');

const caseFilterPanel = document.getElementById('caseFilterPanel');
const caseFilterToggle = document.getElementById('caseFilterToggle');
const caseFilterClose = document.getElementById('caseFilterClose');
const caseFilterClear = document.getElementById('caseFilterClear');
const caseFilterSummary = document.getElementById('caseFilterSummary');
const caseFilterTypeOptions = document.getElementById('caseFilterTypeOptions');
const caseFilterStateOptions = document.getElementById('caseFilterStateOptions');
const caseFilterLockedOption = document.getElementById('caseFilterLockedOption');
const caseFilterConnectionOptions = document.getElementById('caseFilterConnectionOptions');

const caseStructurePanel = document.getElementById('caseStructurePanel');
const caseStructureToggle = document.getElementById('caseStructureToggle');
const caseStructureClose = document.getElementById('caseStructureClose');
const caseStructureTree = document.getElementById('caseStructureTree');

let caseStructureOpenNodes = new Set();

let caseFilterTypes = new Set();
let caseFilterStates = new Set();
let caseFilterFavorites = false;
let caseFilterLocked = false;
let caseFilterConnectionMode = FILTER_CONNECTION_MODES.ANY;

function getCaseConnectedNodeIds(){
  const ids = new Set();
  (state?.edges || []).forEach(edge => {
    if(edge?.a && edge.a !== '__case__') ids.add(edge.a);
    if(edge?.b && edge.b !== '__case__') ids.add(edge.b);
  });
  return ids;
}

function hasCaseFilters(){
  return hasAnyCaseFilters(caseFilterTypes, caseFilterStates, caseFilterFavorites, caseFilterLocked, caseFilterConnectionMode);
}

function caseFilterNodeMatches(node){
  return matchCaseFilterNode(
    node,
    caseFilterTypes,
    caseFilterStates,
    caseFilterFavorites,
    caseFilterLocked,
    caseFilterConnectionMode,
    getCaseConnectedNodeIds()
  );
}

function persistCaseFilters(){
  if(!state || typeof state !== 'object') return;
  if(!state.settings || typeof state.settings !== 'object' || Array.isArray(state.settings)) state.settings = {};
  state.settings.caseFilters = serializeCaseFilters({
    types: caseFilterTypes,
    states: caseFilterStates,
    favorites: caseFilterFavorites,
    locked: caseFilterLocked,
    connectionMode: caseFilterConnectionMode
  });
  scheduleSave();
}

function restoreCaseFilters(){
  const restored = deserializeCaseFilters(state?.settings?.caseFilters);
  caseFilterTypes = restored.types;
  caseFilterStates = restored.states;
  caseFilterFavorites = restored.favorites;
  caseFilterLocked = restored.locked;
  caseFilterConnectionMode = restored.connectionMode;
  refreshCaseFilterControls();
}

function updateCaseFilterSummary(){
  if(!caseFilterSummary) return;
  caseFilterSummary.textContent = getCaseFilterSummaryText(
    caseFilterTypes,
    caseFilterStates,
    caseFilterFavorites,
    caseFilterLocked,
    caseFilterConnectionMode
  );
}

function refreshCaseFilterControls(){
  caseFilterTypeOptions?.querySelectorAll('[data-filter-type]').forEach(btn=>{
    const key=btn.dataset.filterType;
    const selected = key === 'all' ? caseFilterTypes.size === 0 : caseFilterTypes.has(key);
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  caseFilterStateOptions?.querySelectorAll('[data-filter-state]').forEach(btn=>{
    const key=btn.dataset.filterState;
    const selected = key === 'all' ? caseFilterStates.size === 0 : caseFilterStates.has(key);
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  caseFilterLockedOption?.classList.toggle('active', caseFilterLocked);
  caseFilterLockedOption?.setAttribute('aria-pressed', caseFilterLocked ? 'true' : 'false');
  caseFilterConnectionOptions?.querySelectorAll('[data-filter-connection]').forEach(btn=>{
    const key=btn.dataset.filterConnection || FILTER_CONNECTION_MODES.ANY;
    const selected = key === caseFilterConnectionMode;
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  const activeCount = getCaseFilterActiveCount(caseFilterTypes, caseFilterStates, caseFilterFavorites, caseFilterLocked, caseFilterConnectionMode);
  const active = activeCount > 0;
  caseFilterToggle?.classList.toggle('active',active);
  caseFilterToggle?.setAttribute('aria-expanded', caseFilterPanel && !caseFilterPanel.classList.contains('hidden') ? 'true' : 'false');
  if(caseFilterToggle) caseFilterToggle.textContent = active ? `☰ Filtros · ${activeCount}` : '☰ Filtros';
  updateCaseFilterSummary();
}

function clearCaseFilterClasses(){
  boardEl?.classList.remove('has-filter-focus');
  document.querySelectorAll('.card.filter-match,.card.filter-dim').forEach(el=>el.classList.remove('filter-match','filter-dim'));
  document.querySelectorAll('.string-path.filter-match-edge,.string-path.filter-dim-edge,.string-hit.filter-match-edge,.string-hit.filter-dim-edge').forEach(el=>el.classList.remove('filter-match-edge','filter-dim-edge'));
}

function applyCaseFilters({persist=true} = {}){
  clearCaseFilterClasses();
  refreshCaseFilterControls();
  if(persist) persistCaseFilters();
  if(!hasCaseFilters()){
    if(typeof drawStrings==='function') drawStrings();
    return;
  }
  boardEl.classList.add('has-filter-focus');
  document.querySelectorAll('.card').forEach(card=>{
    const id=card.dataset.id;
    if(id==='__case__'){ card.classList.add('filter-match'); return; }
    const node=state.nodes.find(n=>n.id===id);
    const match=caseFilterNodeMatches(node);
    card.classList.toggle('filter-match',match);
    card.classList.toggle('filter-dim',!match);
  });
  if(typeof drawStrings==='function') drawStrings();
}

function closeCaseFilters(){
  if(!caseFilterPanel) return;
  caseFilterPanel.classList.add('hidden');
  caseFilterPanel.setAttribute('aria-hidden','true');
  caseFilterToggle?.setAttribute('aria-expanded','false');
}

function openCaseFilters(){
  if(!caseFilterPanel) return;
  if(currentCaseId===null){
    caseFilterPanel.classList.add('hidden');
    caseFilterPanel.setAttribute('aria-hidden','true');
    return;
  }
  closeCaseSearch();
  caseFilterPanel.classList.remove('hidden');
  caseFilterPanel.setAttribute('aria-hidden','false');
  caseFilterToggle?.setAttribute('aria-expanded','true');
  refreshCaseFilterControls();
}

function renderStructureTree(){
  if(!caseStructureTree) return;
  caseStructureTree.innerHTML='';
  if(currentCaseId===null || !state || !Array.isArray(state.nodes)){
    const empty=document.createElement('div');
    empty.className='case-structure-empty';
    empty.textContent='Abre un caso para ver su estructura.';
    caseStructureTree.appendChild(empty);
    return;
  }
  const children=buildCaseStructureMap(state);
  const labelForType={question:'Pregunta',note:'Nota',hypothesis:'Hipótesis',document:'Documento',person:'Persona',photo:'Foto',conclusion:'Conclusión',tag:'Etiqueta',evidence:'Evidencia'};
  const roots=sortCaseStructureIds(children.get('__case__')||[], state);
  const seen=new Set();
  const makeBranch=(id,depth)=>{
    const node=state.nodes.find(n=>n.id===id);
    if(!node || seen.has(id)) return;
    seen.add(id);
    const row=document.createElement('div');
    row.className='case-structure-row';
    row.style.setProperty('--structure-depth', depth);
    row.dataset.id=id;
    row.setAttribute('role','treeitem');
    const kids=sortCaseStructureIds(children.get(id)||[], state).filter(childId=>childId!==id);
    const isOpen=caseStructureOpenNodes.has(id);
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='case-structure-expander';
    toggle.textContent=kids.length ? (isOpen ? '▾' : '▸') : '·';
    toggle.disabled=!kids.length;
    toggle.setAttribute('aria-label', kids.length ? (isOpen?'Contraer rama':'Expandir rama') : 'Sin subelementos');
    toggle.addEventListener('click', e=>{
      e.stopPropagation();
      if(!kids.length) return;
      if(caseStructureOpenNodes.has(id)) caseStructureOpenNodes.delete(id);
      else caseStructureOpenNodes.add(id);
      renderStructureTree();
    });
    const select=document.createElement('button');
    select.type='button';
    select.className='case-structure-item';
    select.classList.toggle('active', selectedCardId===id);
    select.setAttribute('aria-label', `Seleccionar ${getStructureNodeLabel(node, t=>labelForType[t]||t)}`);
    const icon=document.createElement('span');
    icon.className='case-structure-icon';
    icon.textContent=getStructureNodeIcon(node);
    const stateIcon=document.createElement('span');
    stateIcon.className='case-structure-state';
    stateIcon.textContent=getStructureNodeState(node);
    const text=document.createElement('span');
    text.className='case-structure-text';
    text.textContent=getStructureNodeLabel(node, t=>labelForType[t]||t);
    select.append(icon,stateIcon,text);
    select.addEventListener('click', e=>{
      e.stopPropagation();
      selectCard(id);
      renderStructureTree();
    });
    row.append(toggle,select);
    caseStructureTree.appendChild(row);
    if(isOpen) kids.forEach(child=>makeBranch(child,depth+1));
  };
  roots.forEach(id=>makeBranch(id,0));
  state.nodes.forEach(node=>{ if(!seen.has(node.id)) makeBranch(node.id,0); });
  if(!caseStructureTree.children.length){
    const empty=document.createElement('div');
    empty.className='case-structure-empty';
    empty.textContent='Este caso todavía no tiene tarjetas.';
    caseStructureTree.appendChild(empty);
  }
}

function closeCaseStructure(){
  if(!caseStructurePanel) return;
  caseStructurePanel.classList.add('hidden');
  caseStructurePanel.setAttribute('aria-hidden','true');
  caseStructureToggle?.setAttribute('aria-expanded','false');
}

function openCaseStructure(){
  if(!caseStructurePanel) return;
  if(currentCaseId===null){
    closeCaseStructure();
    return;
  }
  closeCaseSearch();
  closeCaseFilters();
  renderStructureTree();
  caseStructurePanel.classList.remove('hidden');
  caseStructurePanel.setAttribute('aria-hidden','false');
  caseStructureToggle?.setAttribute('aria-expanded','true');
}

caseStructureToggle?.addEventListener('click',()=>{
  if(caseStructurePanel?.classList.contains('hidden')) openCaseStructure();
  else closeCaseStructure();
});
caseStructureClose?.addEventListener('click',closeCaseStructure);

function resetCaseFilters({persist=true} = {}){
  caseFilterTypes = new Set();
  caseFilterStates = new Set();
  caseFilterFavorites = false;
  caseFilterLocked = false;
  caseFilterConnectionMode = FILTER_CONNECTION_MODES.ANY;
  applyCaseFilters({persist});
}

function setCaseFilterConnectionMode(mode){
  caseFilterConnectionMode = Object.values(FILTER_CONNECTION_MODES).includes(mode) ? mode : FILTER_CONNECTION_MODES.ANY;
  applyCaseFilters();
}

caseFilterTypeOptions?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-filter-type]');
  if(!btn) return;

  const value=btn.dataset.filterType || 'all';

  if(value === 'all'){
    caseFilterTypes = new Set();
  }else{
    const next = new Set(caseFilterTypes);

    if(next.has(value)){
      next.delete(value);
    }else{
      next.add(value);
    }

    caseFilterTypes = next;
  }

  applyCaseFilters();
});

caseFilterStateOptions?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-filter-state]');
  if(!btn) return;

  const value=btn.dataset.filterState || 'all';

  if(value === 'all'){
    caseFilterStates = new Set();
  }else{
    const next = new Set(caseFilterStates);

    if(next.has(value)){
      next.delete(value);
    }else{
      next.add(value);
    }

    caseFilterStates = next;
  }

  applyCaseFilters();
});

const caseFilterFavoriteOption = document.getElementById('caseFilterFavoriteOption');
caseFilterFavoriteOption?.addEventListener('click',()=>{
  caseFilterFavorites = !caseFilterFavorites;
  applyCaseFilters();
});
caseFilterLockedOption?.addEventListener('click',()=>{
  caseFilterLocked = !caseFilterLocked;
  applyCaseFilters();
});
caseFilterConnectionOptions?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-filter-connection]');
  if(!btn) return;
  setCaseFilterConnectionMode(btn.dataset.filterConnection || FILTER_CONNECTION_MODES.ANY);
});

caseFilterToggle?.addEventListener('click',()=>{
  if(caseFilterPanel.classList.contains('hidden')) openCaseFilters();
  // Si ya está abierto, permanece abierto. Solo la X lo cierra.
});

caseFilterClose?.addEventListener('click',closeCaseFilters);
caseFilterClear?.addEventListener('click',resetCaseFilters);

function searchNodeText(node){
  const relationText = (state?.edges || []).filter(e => e?.a === node?.id || e?.b === node?.id).map(e => [e.label, e.type, e.kind].filter(Boolean).join(' ')).join(' ');
  return buildSearchNodeText(node, relationText);
}

function searchResultLabel(node){
return getSearchResultLabel(node);
}

function searchResultKind(node){
return getSearchResultKind(node);
}

function clearCaseSearchClasses(){
  boardEl.classList.remove('has-search-focus');
  document.querySelectorAll('.card.search-match,.card.search-active').forEach(el=>el.classList.remove('search-match','search-active'));
}

function closeCaseSearch(){
  if(!caseSearchPanel) return;
  clearCaseSearchClasses();
  caseSearchMatches=[]; caseSearchIndex=-1; caseSearchQuery='';
  caseSearchInput.value='';
  caseSearchCount.textContent='Escribe para buscar';
  caseSearchResults.innerHTML='';
  caseSearchPanel.classList.add('hidden');
  caseSearchPanel.setAttribute('aria-hidden','true');
  caseSearchToggle?.setAttribute('aria-expanded','false');
}

function updateCaseSearchScopeUI(){
  const global = caseSearchScope === 'global';
  if(caseSearchInput){
    caseSearchInput.placeholder = global ? 'Buscar en todo MindPlace...' : 'Buscar en este caso...';
    caseSearchInput.setAttribute('aria-label', global ? 'Buscar en todo MindPlace' : 'Buscar en este caso');
  }
}

function openCaseSearch(scope='case'){
  if(!caseSearchPanel) return;
  if(scope==='case' && currentCaseId===null) scope='global';
  caseSearchScope=scope;
  updateCaseSearchScopeUI();
  if(scope==='case') closeCaseFilters();
  else clearCaseSearchClasses();
  caseSearchPanel.classList.remove('hidden');
  caseSearchPanel.setAttribute('aria-hidden','false');
  caseSearchToggle?.setAttribute('aria-expanded','true');
  caseSearchMatches=[]; caseSearchIndex=-1; caseSearchQuery=''; caseSearchResults.innerHTML='';
  caseSearchCount.textContent=scope==='global' ? 'Escribe para buscar en todos los casos' : 'Escribe para buscar';
  requestAnimationFrame(()=>{ caseSearchInput?.focus(); caseSearchInput?.select(); });
}

function scrollCardToCenter(id){
  const el=document.querySelector(`[data-id="${CSS.escape(id)}"]`); if(!el) return;
  const br=boardEl.getBoundingClientRect(), er=el.getBoundingClientRect();
  boardEl.scrollLeft += (er.left+er.width/2)-(br.left+br.width/2);
  boardEl.scrollTop += (er.top+er.height/2)-(br.top+br.height/2);
}

function updateCaseSearchClasses(){
  clearCaseSearchClasses();
  if(caseSearchScope!=='case' || !caseSearchQuery || !caseSearchMatches.length) return;
  boardEl.classList.add('has-search-focus');
  caseSearchMatches.forEach((match,i)=>{
    if(match.caseId!==currentCaseId) return;
    const el=document.querySelector(`[data-id="${CSS.escape(match.id)}"]`);
    if(el){ el.classList.add('search-match'); if(i===caseSearchIndex) el.classList.add('search-active'); }
  });
}

function renderCaseSearchResults(){
  if(!caseSearchResults || !caseSearchCount) return;
  caseSearchResults.innerHTML='';
  if(!caseSearchQuery){
    caseSearchCount.textContent=caseSearchScope==='global' ? 'Escribe para buscar en todos los casos' : 'Escribe para buscar';
    caseSearchPrev.disabled=true; caseSearchNext.disabled=true; return;
  }
  if(!caseSearchMatches.length){
    caseSearchCount.textContent='0 resultados'; caseSearchPrev.disabled=true; caseSearchNext.disabled=true;
    const empty=document.createElement('div'); empty.className='case-search-empty';
    empty.textContent=caseSearchScope==='global' ? 'No se encontraron coincidencias en MindPlace.' : 'No se encontraron coincidencias en este caso.';
    caseSearchResults.appendChild(empty); return;
  }
  caseSearchCount.textContent=`${caseSearchIndex+1} / ${caseSearchMatches.length} resultados`;
  caseSearchPrev.disabled=caseSearchMatches.length<2; caseSearchNext.disabled=caseSearchMatches.length<2;
  caseSearchMatches.forEach((match,index)=>{
    const btn=document.createElement('button'); btn.type='button'; btn.className='case-search-result'; btn.classList.toggle('active',index===caseSearchIndex);
    btn.innerHTML='<span class="kind"></span><span><span class="label"></span><span class="snippet"></span><span class="case-search-origin"></span></span>';
    btn.querySelector('.kind').textContent=match.kind;
    btn.querySelector('.label').textContent=match.label;
    btn.querySelector('.snippet').textContent=match.snippet;
    btn.querySelector('.case-search-origin').textContent=caseSearchScope==='global' ? `Caso: ${match.caseTitle}` : '';
    btn.addEventListener('click',()=>{
      caseSearchIndex=index;
      if(caseSearchScope==='global'){
        const target=match.caseId;
        closeCaseSearch();
        openCase(target);
        setTimeout(()=>{
          selectCard(match.id);
          scrollCardToCenter(match.id);
        },80);
      }else{
        updateCaseSearchClasses(); renderCaseSearchResults(); scrollCardToCenter(match.id);
      }
    });
    caseSearchResults.appendChild(btn);
  });
}

function pushSearchMatch({caseId,id,kind,label,fullText,query}){
  const haystack=normalizeSearchQuery(fullText);
  const normalizedQuery=normalizeSearchQuery(query);
  if(!searchTermsMatch(fullText, normalizedQuery)) return;
  const pos=haystack.indexOf(normalizedQuery);
  const full=String(fullText||''), start=Math.max(0,pos-55);
  let snippet=full.slice(start,start+130).replace(/\s+/g,' ').trim();
  if(start>0) snippet='…'+snippet; if(start+130<full.length) snippet+='…';
  const entry=store?.index?.find(c=>c.id===caseId);
  caseSearchMatches.push({caseId,id,kind,label,snippet,caseTitle:entry?.title||'Caso'});
}

function performCaseSearch(){
  const query=normalizeSearchQuery(caseSearchInput?.value||'');
  caseSearchQuery=query; caseSearchMatches=[]; caseSearchIndex=-1;
  if(query){
    if(caseSearchScope==='case'){
      if(currentCaseId===null) return;
      const data=store?.cases?.[currentCaseId]; if(!data) return;
      pushSearchMatch({caseId:currentCaseId,id:'__case__',kind:'📌',label:data.title||'Caso principal',fullText:`${data.title||''} ${data.description||''} ${data.category||''}`,query});
      (data.nodes||[]).forEach(node=>pushSearchMatch({caseId:currentCaseId,id:node.id,kind:searchResultKind(node),label:searchResultLabel(node),fullText:searchNodeText(node),query}));
    }else{
      (store?.index||[]).filter(c=>!c.trashedAt).forEach(entry=>{
        const data=store?.cases?.[entry.id]; if(!data) return;
        const title=entry.title||data.title||'Caso';
        pushSearchMatch({caseId:entry.id,id:'__case__',kind:'📌',label:title,fullText:`${title} ${entry.description||data.description||''} ${entry.category||data.category||''} ${entry.status||data.status||''}`,query});
        (data.nodes||[]).forEach(node=>pushSearchMatch({caseId:entry.id,id:node.id,kind:searchResultKind(node),label:searchResultLabel(node),fullText:searchNodeText(node),query}));
      });
    }
    caseSearchIndex=caseSearchMatches.length?0:-1;
  }
  updateCaseSearchClasses(); renderCaseSearchResults();
  if(caseSearchScope==='case' && caseSearchMatches.length) scrollCardToCenter(caseSearchMatches[0].id);
}

function moveCaseSearch(delta){
  if(!caseSearchMatches.length) return;
  caseSearchIndex=(caseSearchIndex+delta+caseSearchMatches.length)%caseSearchMatches.length;
  updateCaseSearchClasses(); renderCaseSearchResults();
  if(caseSearchScope==='case') scrollCardToCenter(caseSearchMatches[caseSearchIndex].id);
}

const globalSearchHeaderBtns=document.querySelectorAll('.globalSearchHeaderBtn');
globalSearchHeaderBtns.forEach(btn=>btn.addEventListener('click',()=>openCaseSearch('global')));
caseSearchToggle?.addEventListener('click',()=>{
  if(caseSearchPanel.classList.contains('hidden')) openCaseSearch('case'); else closeCaseSearch();
});
caseSearchClose?.addEventListener('click',closeCaseSearch);
caseSearchInput?.addEventListener('input',performCaseSearch);
caseSearchPrev?.addEventListener('click',()=>moveCaseSearch(-1));
caseSearchNext?.addEventListener('click',()=>moveCaseSearch(1));

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && helpPanel && !helpPanel.classList.contains('hidden')){
    closeHelp();
    return;
  }
  if(e.key === 'Escape' && caseSearchPanel && !caseSearchPanel.classList.contains('hidden')){
    closeCaseSearch();
    return;
  }
  if(caseSearchPanel && !caseSearchPanel.classList.contains('hidden') && document.activeElement === caseSearchInput){
    if(e.key === 'Enter'){
      e.preventDefault();
      moveCaseSearch(e.shiftKey ? -1 : 1);
    }
  }
});

function renderMenu(){
  caseGridEl.innerHTML = '';

  store.caseCategoryFilter = normalizeCaseCategoryList(store.caseCategoryFilter);

  const activeCases = [...store.index]
    .filter(c => !c.trashedAt)
    .filter(c => caseMatchesCategory(c, store.caseCategoryFilter));

  const pinned = sortCases(activeCases.filter(c => !!c.pinned), store.caseSort || 'updated-desc');
  const regular = sortCases(activeCases.filter(c => !c.pinned), store.caseSort || 'updated-desc');

  let cardIndex = 0;

  function addSectionLabel(text, className){
    const label = document.createElement('div');
    label.className = className;
    label.textContent = text;
    caseGridEl.appendChild(label);
  }

  function addCaseCard(c){
    const card = document.createElement('div');
    card.className = 'case-card';
    card.style.setProperty('--rot', ((cardIndex % 5) - 2) * 1.1 + 'deg');
    cardIndex++;

    const pin = document.createElement('div');
    pin.className = 'pin';
    card.appendChild(pin);

    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-case' + (c.pinned ? ' is-pinned' : '');
    pinBtn.textContent = c.pinned ? '★' : '☆';
    pinBtn.title = c.pinned ? 'Desfijar caso' : 'Fijar caso';
    pinBtn.setAttribute('aria-label', c.pinned ? 'Desfijar caso' : 'Fijar caso');
    pinBtn.addEventListener('pointerdown', e=>e.stopPropagation());

    pinBtn.addEventListener('click', async (e)=>{
      e.stopPropagation();

      const entry = store.index.find(x=>x.id===c.id);
      if(!entry) return;

      if(!entry.pinned){
        const count = store.index.filter(x=>!x.trashedAt && x.pinned).length;
        if(count >= 5){
          await askConfirm(
            'Puedes fijar un máximo de 5 casos. Desfija uno antes de fijar otro.',
            'Aceptar'
          );
          return;
        }
      }

      entry.pinned = !entry.pinned;
      entry.updatedAt = Date.now();
      await saveStore();
      renderMenu();
    });

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '🗑';
    del.title = 'Mover a papelera';
    del.setAttribute('aria-label', `Mover "${c.title || 'caso'}" a la papelera`);
    del.addEventListener('pointerdown', e=>e.stopPropagation());

    del.onclick = async (e)=>{
      e.stopPropagation();

      const ok = await askConfirm(
        `¿Mover el caso "${c.title}" a la papelera? Podrás restaurarlo después.`,
        'Mover a papelera'
      );

      if(ok){
        const entry = store.index.find(x=>x.id===c.id);

        if(entry){
          entry.trashedAt = Date.now();
          entry.updatedAt = Date.now();
        }

        await saveStore();
        renderMenu();
        renderTrashMenu();
      }
    };

    card.appendChild(del);

    const edit = document.createElement('button');
    edit.className = 'edit-case';
    edit.textContent = '✎';
    edit.title = 'Editar nombre, descripción y estado';
    edit.addEventListener('pointerdown', e=>e.stopPropagation());
    edit.addEventListener('click', (e)=>{
      e.stopPropagation();
      caseEditor?.openEditCaseModal(c);
    });
    card.appendChild(edit);

    card.appendChild(pinBtn);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-case';
    exportBtn.textContent = '↗';
    exportBtn.title = 'Exportar caso';
    exportBtn.setAttribute('aria-label', 'Exportar caso');
    exportBtn.addEventListener('pointerdown', e=>e.stopPropagation());
    exportBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openCaseExportModal(c.id);
    });
    card.appendChild(exportBtn);

    const caseNum = document.createElement('div');
    caseNum.className = 'case-num';
    caseNum.textContent = 'CASE #' + String(cardIndex).padStart(3, '0');
    card.appendChild(caseNum);

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'CASO';
    card.appendChild(label);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = c.title || 'Sin título';
    card.appendChild(name);

    if(c.description){
      const desc = document.createElement('div');
      desc.className = 'case-desc';
      desc.style.fontSize = '12px';
      desc.style.opacity = '.65';
      desc.style.marginTop = '6px';
      desc.style.lineHeight = '1.25';
      desc.textContent = c.description.length > 70 ? c.description.slice(0,70)+'…' : c.description;
      card.appendChild(desc);
    }

    const badge = document.createElement('span');
    badge.className = 'status-badge status-' + (c.status || 'abierto');
    badge.style.marginTop = '10px';
    badge.style.display = 'inline-block';
    badge.textContent = statusLabel(c.status);
    card.appendChild(badge);

    if(c.category){
      const categoryBadge = document.createElement('span');
      categoryBadge.className = 'case-category-badge';
      categoryBadge.textContent = '🏷 ' + c.category;
      categoryBadge.title = 'Categoría: ' + c.category;
      card.appendChild(categoryBadge);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '';
    card.appendChild(meta);

    const footer = document.createElement('div');
    footer.className = 'case-footer';

    const footerDate = document.createElement('span');
    footerDate.className = 'case-footer-date';
    footerDate.textContent = c.updatedAt
      ? new Date(c.updatedAt).toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'numeric'}).toUpperCase()
      : '';
    footer.appendChild(footerDate);

    const footerOpen = document.createElement('span');
    footerOpen.className = 'case-footer-open';
    footerOpen.textContent = 'ABRIR →';
    footer.appendChild(footerOpen);

    card.appendChild(footer);

    card.addEventListener('click', ()=> openCase(c.id));
    caseGridEl.appendChild(card);
  }

  if(pinned.length){
    addSectionLabel('★ CASOS FIJADOS', 'pinned-section-label');
    pinned.forEach(addCaseCard);
  }

  if(regular.length){
    addSectionLabel('OTROS CASOS', 'all-cases-section-label');
    regular.forEach(addCaseCard);
  }

  const newCard = document.createElement('div');
  newCard.className = 'case-card new';
  newCard.textContent = '+ Nuevo caso';
  newCard.addEventListener('click', ()=>caseEditor?.openNewCaseModal());
  caseGridEl.appendChild(newCard);

  if(typeof refreshCaseFilterControls === 'function'){
    refreshCaseFilterControls();
  }
}


function renderTrashMenu(){
  const list = document.getElementById('trashList');
  if(!list) return;

  const trashed = [...store.index]
    .filter(c => !!c.trashedAt)
    .sort((a,b)=> (b.trashedAt||0) - (a.trashedAt||0));

  list.innerHTML = '';

  if(!trashed.length){
    list.innerHTML = '<div class="trash-empty">La papelera está vacía.</div>';
    return;
  }

  trashed.forEach(c=>{
    const item = document.createElement('div');
    item.className = 'trash-item';

    const info = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'trash-name';
    name.textContent = c.title || 'CASO SIN TÍTULO';
    info.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'trash-meta';
    const date = c.trashedAt
      ? new Date(c.trashedAt).toLocaleString('es-ES',{
          day:'2-digit',
          month:'2-digit',
          year:'numeric',
          hour:'2-digit',
          minute:'2-digit'
        })
      : '';
    meta.textContent = `Movido a la papelera${date ? ` · ${date}` : ''}`;
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'trash-actions';

    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'trash-restore';
    restore.textContent = '↩ Restaurar';
    restore.addEventListener('click', async (e)=>{
      e.stopPropagation();

      const ok = await askConfirm(
        `¿Restaurar el caso "${c.title || 'CASO SIN TÍTULO'}"?`,
        'Restaurar'
      );

      if(!ok) return;

      const entry = store.index.find(x=>x.id===c.id);

      if(entry){
        delete entry.trashedAt;
        entry.updatedAt = Date.now();
      }

      await saveStore();
      renderMenu();
      renderTrashMenu();
    });

    const forever = document.createElement('button');
    forever.type = 'button';
    forever.className = 'trash-delete';
    forever.textContent = '🗑 Eliminar definitivamente';
    forever.addEventListener('click', async (e)=>{
      e.stopPropagation();

      const ok = await askConfirm(
        `Esta acción eliminará definitivamente el caso "${c.title || 'CASO SIN TÍTULO'}" y no podrá recuperarse desde la papelera.`,
        'Eliminar definitivamente'
      );

      if(!ok) return;

      store.index = store.index.filter(x=>x.id!==c.id);
      delete store.cases[c.id];

      if(c.id === 'peluqueria-demo'){
        store.demoDeleted = store.demoDeleted || {};
        store.demoDeleted[c.id] = true;
      }

      await saveStore();
      renderMenu();
      renderTrashMenu();
    });

    actions.appendChild(restore);
    actions.appendChild(forever);

    item.appendChild(info);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

function openTrashModal(){
  const overlay = document.getElementById('trashOverlay');
  if(!overlay) return;

  renderTrashMenu();
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
}

function closeTrashModal(){
  const overlay = document.getElementById('trashOverlay');
  if(!overlay) return;

  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden','true');
}

const newCaseOverlay = document.getElementById('newCaseOverlay');
const ncTitle = document.getElementById('ncTitle');
const ncName = document.getElementById('ncName');
const ncDesc = document.getElementById('ncDesc');
const ncStatus = document.getElementById('ncStatus');
const ncCategory = document.getElementById('ncCategory');
const ncAccept = document.getElementById('ncAccept');
const ncCancel = document.getElementById('ncCancel');
let editingCaseId = null;
let caseEditor = null;

const CASE_NODE_LIMIT = 250;

const caseLifecycle = createCaseLifecycle({
  getStore: () => store,
  getState: () => state,
  setState: value => { state = value; },
  getCurrentCaseId: () => currentCaseId,
  setCurrentCaseId: value => { currentCaseId = value; },
  setSelectedCardId: value => { selectedCardId = value; },
  getStoreIndex: () => store.index,
  uid,
  createCaseModel,
  saveStore: (...args) => saveStore(...args),
  renderMenu,
  refreshCaseFilterControls,
  scheduleCaseFilterRefresh,
  openCase: id => caseLifecycle.openCase(id),
  render: () => render(),
  resetUndoHistory,
  ensureHistory,
  closeCaseStructure,
  setCaseStructureOpenNodes: value => { caseStructureOpenNodes = value; },
  closeCaseSearch,
  resetCaseFilters,
  restoreCaseFilters,
  closeCaseFilters,
  closeAllStatusMenus: (...args) => closeAllStatusMenus(...args),
  applyZoom,
  boardEl,
  topbarEl,
  hintEl,
  menuEl,
  topbarToggle,
  titleEl,
  applyCaseMeta: () => caseLifecycle.applyCaseMeta(),
  focusOnCaseMarker,
  restoreLastNavigation: () => window.__mindplaceRestoreLastNavigation?.() || false,
  updateTopbarToggle,
  pushUndo,
  save: (...args) => save(...args),
  askConfirm,
  showRecoveryNotice,
  CASE_NODE_LIMIT
});

const {
  updateCaseMeta,
  createCase,
  getNextContinuationTitle,
  createContinuationCase,
  ensureCaseCapacityForNewNode,
  applyCaseMeta,
  cycleStatus,
  openCase,
  backToMenu
} = caseLifecycle;

caseEditor = createCaseEditor({
  overlay: newCaseOverlay,
  titleEl: ncTitle,
  nameEl: ncName,
  descEl: ncDesc,
  statusEl: ncStatus,
  categoryEl: ncCategory,
  acceptBtn: ncAccept,
  cancelBtn: ncCancel,
  getEditingCaseId: () => editingCaseId,
  setEditingCaseId: (id) => { editingCaseId = id; },
  updateCaseMeta,
  createCase
});

let saveInFlight = false;
let savePendingAfter = false;

const persistence = createPersistenceManager({
  storeKey: STORE_KEY,
  storageVersion: STORE_STORAGE_VERSION,
  dataVersion: STORE_DATA_VERSION,
  recoveryKey: STORE_RECOVERY_KEY,
  lastGoodKey: STORE_LAST_GOOD_KEY,
  getStore: () => store,
  setStore: (nextStore) => { store = nextStore; },
  getCurrentCaseId: () => currentCaseId,
  getState: () => state,
  getUid: uid,
  isValidCase,
  showRecoveryNotice,
  showSaveWarning,
  applyTheme,
  renderMenu,
  openCase: (id) => openCase(id),
  removedThemes: ['sky', 'sky2', 'cork', 'chalk-dark', 'whiteboard', 'space', 'batman', 'spiderman'],
  attachmentRepository,
  scheduleSave: () => scheduleSave()
});

const loadStore = persistence.load;
const saveStore = persistence.saveStore;
const save = persistence.save;
const migrateStore = persistence.migrateStore;
const normalizeStateForSave = persistence.normalizeStateForSave;
function labelFor(type){
  if(type==='note') return 'NOTA/HIPÓTESIS';
  if(type==='question') return 'PREGUNTA';
  if(type==='hypothesis') return 'HIPÓTESIS';
  if(type==='conclusion') return 'CONCLUSIÓN';
  if(type==='tag') return 'PISTA';
  if(type==='evidence') return 'EVIDENCIA';
  if(type==='person') return 'PERSONA';
  if(type==='photo') return 'FOTO';
  if(type==='document') return 'DOCUMENTO';
  if(type==='case') return 'CASO';
  return '';
}

function formatFileSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return Math.round(bytes/1024) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

const DOC_EMBED_LIMIT = 300 * 1024; // no se guarda el contenido de archivos más grandes de esto

function documentDisplayId(node){
  const ds = state.nodes.filter(n=>n.type==='document');
  const idx = ds.indexOf(node) + 1;
  return 'D-' + String(idx || ds.length).padStart(4, '0');
}

async function deleteNode(id){
  pushUndo();
  try{ await attachmentRepository?.deleteForSource(id); }catch(error){ console.warn('No se pudieron eliminar todos los adjuntos del elemento eliminado.',error); }
  state.nodes = state.nodes.filter(n=>n.id!==id);
  state.edges = state.edges.filter(e=>e.a!==id && e.b!==id);
  save();
  render();
}

function edgeExists(a,b,options={}){
  const direction=options.direction || 'none';
  const type=options.type || 'default';
  const label=typeof options.label==='string'?options.label:'';
  return state.edges.some(e=>{
    if(e.type!==type || (e.direction||'none')!==direction || (e.label||'')!==label) return false;
    if(direction==='none' || direction==='both') return (e.a===a&&e.b===b)||(e.a===b&&e.b===a);
    return e.a===a && e.b===b;
  });
}

function addEdge(a,b,overrides={}){
  if(a===b || !a || !b) return null;
  if(edgeExists(a,b,overrides)) {
    const existing=state.edges.find(e=>((e.a===a&&e.b===b)||(e.a===b&&e.b===a)) && (e.type||'default')===(overrides.type||'default'));
    if(existing) selectEdge(existing.id);
    return existing || null;
  }
  const edge = createEdge({ a, b, ...overrides });
  if(!isValidEdge(edge)) return null;
  pushUndo();
  state.edges.push(edge);
  selectedEdgeId=edge.id;
  save();
  render();
  requestAnimationFrame(()=>{
    const paths = svgEl.querySelectorAll('.string-path');
    if(paths.length) paths[paths.length - 1].classList.add('new-edge');
    renderEdgeInspector();
  });
  return edge;
}

function getEdgeById(id){ return state.edges.find(e=>e.id===id) || null; }
function getEndpointLabel(id){
  if(id==='__case__') return state.title || 'Caso principal';
  const n=state.nodes.find(node=>node.id===id);
  return n ? (getSummaryNodeTitle(n) || labelFor(n.type) || 'Elemento') : 'Elemento eliminado';
}
function selectEdge(id){
  selectedEdgeId=getEdgeById(id)?id:null;
  document.body.classList.toggle('edge-selected-mode', !!selectedEdgeId);
  renderEdgeInspector();
  boardConnections?.drawStrings?.();
}
function clearEdgeSelection(){
  selectedEdgeId=null;
  document.body.classList.remove('edge-selected-mode');
  renderEdgeInspector();
  boardConnections?.drawStrings?.();
}
function updateSelectedEdge(patch={}){
  const edge=getEdgeById(selectedEdgeId);
  if(!edge) return;
  const next={...edge,...patch};
  if(!isValidEdge(next)) return;
  const normalized={...next, type:next.type||next.kind||'default', kind:next.type||next.kind||'default', direction:next.direction||'none', label:typeof next.label==='string'?next.label.slice(0,120):''};
  if(edgeExists(normalized.a,normalized.b,{...normalized, label:normalized.label, direction:normalized.direction, type:normalized.type}) && normalized.id!==edge.id) return;
  pushUndo();
  Object.assign(edge,normalized);
  save();
  render();
  requestAnimationFrame(renderEdgeInspector);
}
function removeEdgeById(id){
  const edge=getEdgeById(id);
  if(!edge) return;
  pushUndo();
  state.edges=state.edges.filter(e=>e.id!==id);
  if(selectedEdgeId===id) selectedEdgeId=null;
  save();
  render();
}
function renderEdgeInspector(){
  const panel=document.getElementById('edgeInspector');
  if(!panel) return;
  const edge=getEdgeById(selectedEdgeId);
  if(!edge){ panel.classList.remove('show'); panel.setAttribute('aria-hidden','true'); return; }
  panel.classList.add('show'); panel.setAttribute('aria-hidden','false');
  const type=edge.type||edge.kind||'default';
  const direction=edge.direction||'none';
  panel.innerHTML=`
    <div class="edge-inspector-head"><strong>Relación seleccionada</strong><button type="button" id="edgeInspectorClose" aria-label="Cerrar">✕</button></div>
    <div class="edge-inspector-route"><span>${escapeHtml(getEndpointLabel(edge.a))}</span><span class="edge-route-arrow">${direction==='reverse'?'←':direction==='both'?'↔':direction==='forward'?'→':'—'}</span><span>${escapeHtml(getEndpointLabel(edge.b))}</span></div>
    <label>Tipo<select id="edgeTypeEdit">
      <option value="default">Relación</option><option value="supports">Apoya</option><option value="contradicts">Contradice</option><option value="causes">Causa</option><option value="references">Referencia</option><option value="depends">Depende de</option><option value="related">Relacionada</option>
    </select></label>
    <label>Dirección<select id="edgeDirectionEdit">
      <option value="none">Sin dirección</option><option value="forward">A → B</option><option value="reverse">A ← B</option><option value="both">A ↔ B</option>
    </select></label>
    <label>Etiqueta<input id="edgeLabelEdit" maxlength="120" placeholder="Ej. confirma, contradice..." value="${escapeHtml(edge.label||'')}"></label>
    <div class="edge-inspector-actions"><button type="button" id="edgeSelectA">Seleccionar origen</button><button type="button" id="edgeSelectB">Seleccionar destino</button><button type="button" class="danger" id="edgeDelete">Eliminar relación</button></div>`;
  panel.querySelector('#edgeTypeEdit').value=type;
  panel.querySelector('#edgeDirectionEdit').value=direction;
  panel.querySelector('#edgeInspectorClose').addEventListener('click',clearEdgeSelection);
  panel.querySelector('#edgeTypeEdit').addEventListener('change',e=>updateSelectedEdge({type:e.target.value,kind:e.target.value}));
  panel.querySelector('#edgeDirectionEdit').addEventListener('change',e=>updateSelectedEdge({direction:e.target.value}));
  panel.querySelector('#edgeLabelEdit').addEventListener('change',e=>updateSelectedEdge({label:e.target.value}));
  panel.querySelector('#edgeSelectA').addEventListener('click',()=>{ selectCard?.(edge.a); centerSelected?.(); });
  panel.querySelector('#edgeSelectB').addEventListener('click',()=>{ selectCard?.(edge.b); centerSelected?.(); });
  panel.querySelector('#edgeDelete').addEventListener('click',()=>removeEdgeById(edge.id));
}
function getNodePos(id){
  if(id === '__case__') return state.marker || {x:60,y:100};
  const n = state.nodes.find(n=>n.id===id);
  return n ? {x:n.x, y:n.y} : {x:60,y:100};
}

function nodeRect(n){
  const size = MIN_SIZES[n.type] || MIN_SIZES.note;
  return { x: n.x, y: n.y, w: n.width || size.w, h: n.height || size.h };
}

function rectsOverlap(a, b, pad){
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}

// Mantiene cualquier etiqueta dentro de los límites reales del tablero (#zoomWrap).
// Se usan las dimensiones propias del tablero, no las dimensiones visibles tras el zoom.
function clampBoardPosition(x, y, w, h){
  const boardW = zoomWrap.offsetWidth || 4200;
  const boardH = zoomWrap.offsetHeight || 3000;
  const maxX = Math.max(0, boardW - Math.max(1, w));
  const maxY = Math.max(0, boardH - Math.max(1, h));
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y))
  };
}

function clampCardToBoard(node, card){
  if(!node || !card) return false;
  const w = card.offsetWidth || (MIN_SIZES[node.type] || MIN_SIZES.note).w;
  const h = card.offsetHeight || (MIN_SIZES[node.type] || MIN_SIZES.note).h;
  const pos = clampBoardPosition(Number(node.x) || 0, Number(node.y) || 0, w, h);
  const changed = node.x !== pos.x || node.y !== pos.y;
  node.x = pos.x;
  node.y = pos.y;
  card.style.left = pos.x + 'px';
  card.style.top = pos.y + 'px';
  return changed;
}

// Busca la posición libre más cercana al punto deseado para que la tarjeta nueva
// no quede encimada con ninguna otra (igual que hace "Organizar").
function findFreePosition(startX, startY, w, h, excludeId){
  const pad = 50;
  const others = state.nodes.filter(n=>n.id !== excludeId).map(nodeRect);
  if(state.marker){
    const ms = MIN_SIZES.case;
    others.push({ x: state.marker.x, y: state.marker.y, w: state.marker.width || ms.w, h: state.marker.height || ms.h });
  }
  function overlapsAny(rect){
    return others.some(o => rectsOverlap(rect, o, pad));
  }
  const first = { x: startX, y: startY, w, h };
  if(!overlapsAny(first)) return { x: startX, y: startY };
  const step = 36;
  for(let radius = 1; radius <= 60; radius++){
    const angleSteps = 16;
    for(let i = 0; i < angleSteps; i++){
      const angle = (i / angleSteps) * Math.PI * 2;
      const rx = startX + Math.cos(angle) * radius * step;
      const ry = startY + Math.sin(angle) * radius * step;
      const rect = { x: rx, y: ry, w, h };
      if(!overlapsAny(rect)) return { x: rx, y: ry };
    }
  }
  return { x: startX, y: startY };
}

function getConclusionOwner(sourceId){
  if(sourceId === '__case__') return state.marker || null;
  return state.nodes.find(n=>n.id===sourceId) || null;
}

async function addNodeFrom(type, sourceId, extra={}){
  if(type === 'conclusion'){
    return addConclusionToNode(getConclusionOwner(sourceId));
  }
  if(!(await ensureCaseCapacityForNewNode())) return false;
  pushUndo();
  const base = getNodePos(sourceId);
  const desiredX = base.x + 230 + Math.random()*40;
  const desiredY = base.y + (Math.random()*180 - 90);
  const size = MIN_SIZES[type] || MIN_SIZES.note;
  const freePos = findFreePosition(desiredX, desiredY, size.w, size.h);
  const pos = clampBoardPosition(freePos.x, freePos.y, size.w, size.h);
  const node = createNode({ id: uid(), type, text: '', x: pos.x, y: pos.y, status:'normal' });
  if(type === 'case') node.caseId = extra.caseId || null;
  node.attachments = Array.isArray(node.attachments) ? node.attachments : [];
  if(type === 'photo' || type === 'person') node.photoData = null;
  if(type === 'note' || type === 'question' || type === 'hypothesis' || type === 'conclusion' || type === 'tag' || type === 'evidence' || type === 'document' || type === 'case') node.dateText = todayEs();
  if(!isValidNode(node)) return false;
  const edge = createEdge({ a: sourceId, b: node.id });
  if(!isValidEdge(edge)) return false;
  state.nodes.push(node);
  state.edges.push(edge);
  save();
  render();
  return true;
}






function getSummaryNodeTitle(node){
  if(!node) return 'Elemento';
  return node.qTitle || node.docTitle || node.personName || node.title || node.text || labelFor(node.type) || 'Elemento';
}

function getCaseSummary(){
  const nodes = Array.isArray(state.nodes) ? state.nodes : [];
  const statusCounts = { normal:0, pending:0, validated:0, discarded:0 };
  let favorites = 0;
  nodes.forEach(node=>{
    const st = node?.status || 'normal';
    if(Object.prototype.hasOwnProperty.call(statusCounts, st)) statusCounts[st]++;
    if(node?.favorite) favorites++;
  });

  const pendingNodes = nodes
    .filter(node => (node?.status || 'normal') === 'pending')
    .slice(0,4);

  const inlineConclusions = nodes.filter(node => node?.conclusion && typeof node.conclusion === 'object').length;
  const standaloneConclusions = nodes.filter(node => node?.type === 'conclusion').length;

  return {
    total: nodes.length,
    questions: nodes.filter(n=>n?.type==='question').length,
    notes: nodes.filter(n=>n?.type==='note').length,
    hypotheses: nodes.filter(n=>n?.type==='hypothesis').length,
    documents: nodes.filter(n=>n?.type==='document').length,
    people: nodes.filter(n=>n?.type==='person').length,
    photos: nodes.filter(n=>n?.type==='photo').length,
    conclusions: inlineConclusions + standaloneConclusions + (state.marker?.conclusion ? 1 : 0),
    edges: Array.isArray(state.edges) ? state.edges.length : 0,
    favorites,
    ...statusCounts,
    pendingNodes
  };
}

function closeCaseSummary(){
  if(!caseSummaryOverlay) return;
  caseSummaryOverlay.classList.add('hidden');
  caseSummaryOverlay.setAttribute('aria-hidden','true');
  caseSummaryOverlay.style.removeProperty('z-index');
}

function openCaseSummary(){
  if(!caseSummaryOverlay) return;

  // El resumen debe abrirse siempre por encima de cualquier vista previa ampliada.
  // Cerramos primero la vista grande y elevamos explícitamente la capa del resumen.
  try{ closeFarPreview(true); }catch{}
  caseSummaryOverlay.style.zIndex = '50000';

  const summary = getCaseSummary();
  caseSummaryTitle.textContent = state.title || 'Caso sin título';
  caseSummaryStats.innerHTML = '';

  const stats = [
    ['Preguntas', summary.questions, '❓'],
    ['Notas/Hipótesis', summary.notes + summary.hypotheses, '📝'],
    ['Conclusiones', summary.conclusions, '✅'],
    ['Conexiones', summary.edges, '🔗'],
    ['Pendientes', summary.pending, '⏳'],
    ['Validados', summary.validated, '✓'],
    ['Descartados', summary.discarded, '✕'],
    ['Favoritos', summary.favorites, '⭐']
  ];

  stats.forEach(([label,value,icon])=>{
    const item=document.createElement('div');
    item.className='case-summary-stat';
    item.innerHTML=`<span class="case-summary-stat-icon">${icon}</span><span class="case-summary-stat-value">${value}</span><span class="case-summary-stat-label">${label}</span>`;
    caseSummaryStats.appendChild(item);
  });

  caseSummaryNotice.innerHTML='';
  if(summary.pending > 0){
    const notice=document.createElement('div');
    notice.className='case-summary-notice-item warning';
    notice.textContent=`⏳ Hay ${summary.pending} ${summary.pending===1?'elemento pendiente':'elementos pendientes'}.`;
    caseSummaryNotice.appendChild(notice);
  }else{
    const notice=document.createElement('div');
    notice.className='case-summary-notice-item ok';
    notice.textContent='✓ No hay elementos pendientes.';
    caseSummaryNotice.appendChild(notice);
  }

  caseSummaryPending.innerHTML='';
  if(summary.pendingNodes.length){
    const title=document.createElement('div');
    title.className='case-summary-subtitle';
    title.textContent='PRÓXIMOS PUNTOS';
    caseSummaryPending.appendChild(title);
    summary.pendingNodes.forEach(node=>{
      const row=document.createElement('button');
      row.type='button';
      row.className='case-summary-pending-row';
      row.textContent=`⏳ ${getSummaryNodeTitle(node)}`;
      row.addEventListener('click',()=>{
        closeCaseSummary();
        selectCard(node.id);
        scrollCardToCenter(node.id);
      });
      caseSummaryPending.appendChild(row);
    });
  }

  caseSummaryOverlay.classList.remove('hidden');
  caseSummaryOverlay.setAttribute('aria-hidden','false');
}

// Listener delegado para el botón de resumen: funciona tanto en la tarjeta CASO
// normal como en su vista ampliada/clonada. Se ejecuta antes que los listeners
// internos del clon para evitar que la previsualización intercepte el clic.
document.addEventListener('click', (e)=>{
  const btn = e.target?.closest?.('.case-summary-btn');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  try{ closeFarPreview(true); }catch{}
  openCaseSummary();
}, true);

caseSummaryClose?.addEventListener('click',closeCaseSummary);
caseSummaryOverlay?.addEventListener('pointerdown',e=>{
  if(e.target===caseSummaryOverlay) closeCaseSummary();
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && caseSummaryOverlay && !caseSummaryOverlay.classList.contains('hidden')){
    closeCaseSummary();
  }
});

function renderCaseMarker(){
  if(!state.marker) state.marker = { x: 60, y: 100 };
  const marker = document.createElement('div');
  marker.className = 'card case-marker';
  marker.style.left = state.marker.x + 'px';
  marker.style.top = state.marker.y + 'px';
  marker.dataset.id = '__case__';

  const pin = document.createElement('div');
  pin.className = 'pin';
  marker.appendChild(pin);

  const content = document.createElement('div');
  content.className = 'card-content';
  marker.appendChild(content);

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'CASO';
  content.appendChild(label);

  const title = document.createElement('div');
  title.className = 'marker-title';
  title.contentEditable = true;
  title.textContent = state.title || 'CASO SIN TÍTULO';
  title.addEventListener('input', ()=>{
    state.title = title.textContent;
    titleEl.value = state.title;
    scheduleSave();
  });
  title.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(title);

  const desc = document.createElement('div');
  desc.className = 'marker-desc';
  desc.contentEditable = true;
  desc.textContent = state.description || '';
  desc.addEventListener('input', ()=>{
    state.description = desc.textContent;
    applyCaseMeta();
    scheduleSave();
  });
  desc.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(desc);

  const badge = document.createElement('span');
  badge.className = 'status-badge status-' + (state.status || 'abierto');
  badge.textContent = statusLabel(state.status);
  badge.addEventListener('pointerdown', e=>e.stopPropagation());
  badge.addEventListener('click', (e)=>{ e.stopPropagation(); cycleStatus(); refreshMarkerBadge(); });
  content.appendChild(badge);

  const summaryBtn = document.createElement('button');
  summaryBtn.type = 'button';
  summaryBtn.className = 'case-summary-btn';
  summaryBtn.textContent = '📊 Ver resumen';
  summaryBtn.title = 'Ver resumen automático del caso';
  summaryBtn.addEventListener('pointerdown', e=>e.stopPropagation());
  summaryBtn.addEventListener('click', e=>{
    e.stopPropagation();
    openCaseSummary();
  });
  content.appendChild(summaryBtn);

  if(state.marker.conclusion){
    buildInlineConclusion(content, state.marker);
    marker.classList.add('has-inline-conclusion');
    addConclusionStatusIcon(marker, state.marker.conclusion);
  }

  marker.addEventListener('pointerdown', (e)=>startDrag(e, state.marker, marker));
  marker.addEventListener('click', (e)=>{
    if(linkMode){
      e.stopPropagation();
      handleLinkClick('__case__', marker);
    } else {
      e.stopPropagation();
      selectCard('__case__');
    }
  });
  addPlusButton(marker, '__case__');
  addResizeHandle(marker, state.marker, MIN_SIZES.case.w, MIN_SIZES.case.h);
  if(selectedCardId === '__case__') marker.classList.add('selected');

  marker.style.animationDelay = '0.3s';
  cardsEl.appendChild(marker);
  // Las etiquetas pueden permanecer en cualquier posición del tablero;
  // no se corrige su posición contra los límites al renderizar.
  setupFarPreview(marker);
}

function refreshMarkerBadge(){
  const marker = document.querySelector('[data-id="__case__"]');
  if(!marker) return;
  const badge = marker.querySelector('.status-badge');
  if(badge){
    badge.className = 'status-badge status-' + (state.status || 'abierto');
    badge.textContent = statusLabel(state.status);
  }
}


const cardUi = createCardUiControls({
  boardEl,
  getStore: () => store,
  addNodeFrom,
  startLinkFrom: (...args) => startLinkFrom(...args),
  getConclusionOwner,
  pushUndo,
  scheduleSave: () => scheduleSave(),
  render: () => render(),
  drawStrings: (...args) => drawStrings(...args)
});
const {
  MIN_SIZES,
  addCaseLinkFrom,
  closeAllPlusMenus,
  addPlusButton,
  addConclusionStatusIcon,
  normalizeNodeState,
  closeAllStatusMenus,
  addCardStateButton,
  addCardLockButton,
  addCardFavoriteButton
} = cardUi;

const cardContentBuilders = createCardContentBuilders({
  getState: () => state,
  getStore: () => store,
  todayEs,
  scheduleSave: () => scheduleSave(),
  pushUndo,
  save: () => save(),
  render: () => render(),
  labelFor,
  documentDisplayId,
  statusLabel,
  DOC_EMBED_LIMIT,
  attachmentRepository,
  getCurrentCaseId: () => currentCaseId,
  createAttachment,
  MAX_ATTACHMENT_SIZE,
  setEditSessionEl: value => { editSessionEl = value; }
});
const {
  buildPhotoContent,
  buildDocumentContent,
  buildNoteContent,
  buildQuestionContent,
  buildHypothesisContent,
  buildConclusionContent,
  buildTagContent,
  buildEvidenceContent,
  buildCaseContent,
  buildPersonAvatar,
  buildInlineConclusion,
  addConclusionToNode
} = cardContentBuilders;

function render(){
  return renderBoard({
    state, selectedCardId, linkMode, caseSearchQuery, cardsEl, caseStructurePanel,
    hasCaseFilters, caseFilterNodeMatches, minSizes: MIN_SIZES,
    callbacks: {
      getRenderSignature: () => buildRenderSignature({ state, currentCaseId, selectedCardId, caseFilterTypes, caseFilterStates, caseFilterFavorites, caseFilterLocked, caseFilterConnectionMode, hasCaseFilters }),
      getLastRenderSignature: () => lastRenderSignature,
      setLastRenderSignature: value => { lastRenderSignature = value; },
      closeAllPlusMenus, closeAllStatusMenus, renderCaseMarker, buildPhotoContent, buildDocumentContent, buildNoteContent, buildQuestionContent, buildHypothesisContent, buildConclusionContent, buildTagContent, buildEvidenceContent, buildCaseContent, buildPersonAvatar, labelFor, addCardFavoriteButton, addCardLockButton, addCardStateButton, buildInlineConclusion, addConclusionStatusIcon, startDrag, selectCard, handleLinkClick, addPlusButton, addResizeHandle, setupFarPreview, applyConnectionFocus, performCaseSearch, applyCaseFilters, renderStructureTree, scheduleSave, deleteNode
    }
  });
}


const boardInteractions = createBoardInteractions({
  getContext: () => ({
    state,
    boardEl,
    selectedCardId,
    setSelectedCardId: value => { selectedCardId = value; },
    setConnectionFocusIds: value => { connectionFocusIds = value; },
    selectedEdgeId,
    selectEdge,
    clearEdgeSelection,
    drawStrings: () => boardConnections?.drawStrings?.(),
    linkMode,
    setLinkMode: value => { linkMode = value; },
    linkSrc,
    setLinkSrc: value => { linkSrc = value; },
    linkOneShot,
    setLinkOneShot: value => { linkOneShot = value; },
    addEdge,
    pushUndo,
    getZoomLevel: () => zoomLevel,
    updateMiniMap,
    getBoardSize: () => ({ w: zoomWrap.offsetWidth || 4200, h: zoomWrap.offsetHeight || 3000 }),
    zoomWrap,
    minSizes: MIN_SIZES,
    scheduleMiniMap,
    save,
    selectCard: id => boardInteractions.selectCard(id)
  })
});
const { startDrag, selectCard, clearSelection, applyConnectionFocus, handleLinkClick, startLinkFrom, getPathFocusIds, addResizeHandle } = boardInteractions;

const boardConnections = createBoardConnections({
  getContext: () => ({ state, zoomWrap, svgEl, selectedCardId, connectionFocusIds, selectedEdgeId, currentCaseId, hasCaseFilters, caseFilterNodeMatches, selectEdge, removeEdge: edge => removeEdgeById(edge.id) })
});
const { drawStrings, scheduleDrawStrings, drawStringsNow } = boardConnections;

const boardNavigation = createBoardNavigation({
  getContext: () => ({
    state,
    selectedCardId,
    boardEl,
    zoomWrap,
    zoomLevel,
    setZoomLevel: value => { zoomLevel = value; },
    applyZoom,
    minSizes: MIN_SIZES,
    selectCard,
    pushUndo,
    save,
    render,
    drawStrings,
    scheduleMiniMap
  })
});
const {
  centerCase,
  centerSelected,
  centerBranch,
  centerAll,
  moveConnected,
  restoreLastNavigation,
  autoOrganize: organizeBoard,
  arrangeBranches,
  align: alignBranch,
  distribute: distributeBranch,
  getStateSummary: getBoardStateSummary
} = boardNavigation;
window.__mindplaceRestoreLastNavigation = restoreLastNavigation;

// =========================================================
// MODO PRESENTACIÓN
// =========================================================
const presentationOverlay = document.getElementById('presentationOverlay');
const presentationTitle = document.getElementById('presentationTitle');
const presentationContent = document.getElementById('presentationContent');
const presentationCounter = document.getElementById('presentationCounter');
const presentationPrev = document.getElementById('presentationPrev');
const presentationNext = document.getElementById('presentationNext');
const presentationClose = document.getElementById('presentationClose');
let presentationSlides = [];
let presentationIndex = 0;

function presentationTypeLabel(node){
  if(!node) return 'ELEMENTO';
  if(node.type==='question') return '❓ Pregunta';
  if(node.type==='note' || node.type==='hypothesis') return '📝 Nota/Hipótesis';
  if(node.type==='document') return '📄 Documento';
  if(node.type==='photo') return '📷 Foto';
  if(node.type==='person') return '👤 Persona';
  if(node.type==='conclusion') return '✅ Conclusión';
  if(node.type==='tag') return '🏷️ Etiqueta';
  if(node.type==='evidence') return '📎 Evidencia';
  return 'ELEMENTO';
}
function presentationStatusText(node){
  const st = node?.status || 'normal';
  if(st==='pendiente') return '⏳ Pendiente';
  if(st==='validado') return '✓ Validado';
  if(st==='descartado') return '✕ Descartado';
  return '○ Normal';
}
function presentationNodeTitle(node){
  if(!node) return '';
  if(node.type==='question') return node.qTitle || node.text || 'Pregunta';
  if(node.type==='document') return node.docTitle || node.text || 'Documento';
  if(node.type==='person') return node.personName || node.text || 'Persona';
  if(node.type==='conclusion' && node.conclusion?.text) return node.conclusion.text;
  if(node.type==='tag') return node.text || node.category || 'Etiqueta';
  return node.text || node.title || 'Elemento';
}
function presentationNodeText(node){
  if(!node) return '';
  const parts=[];
  if(node.type==='question'){
    if(node.text && node.text !== nodeNodeTitleSafe(node)) parts.push(node.text);
    if(node.conclusion?.text) parts.push('Conclusión: '+node.conclusion.text);
    if(node.conclusion?.detail) parts.push(node.conclusion.detail);
  } else if(node.type==='document'){
    if(node.text) parts.push(node.text);
    if(node.author) parts.push('Autor: '+node.author);
  } else if(node.type==='person'){
    if(node.text && node.text !== node.personName) parts.push(node.text);
  } else if(node.type==='conclusion'){
    if(node.text) parts.push(node.text);
    if(node.conclusion?.detail) parts.push(node.conclusion.detail);
  } else {
    if(node.text) parts.push(node.text);
    if(node.conclusion?.text) parts.push('Conclusión: '+node.conclusion.text);
    if(node.conclusion?.detail) parts.push(node.conclusion.detail);
  }
  return parts.join('\n\n').trim();
}
function nodeNodeTitleSafe(node){ return presentationNodeTitle(node); }
function hasInlineConclusion(node){ return !!(node && node.conclusion && (node.conclusion.text || node.conclusion.detail)); }
function buildPresentationSlides(){
  if(!state) return [];
  const slides=[{
    kind:'case',
    type:'Caso',
    title:state.title || 'CASO SIN TÍTULO',
    text:state.description || 'Recorrido del caso y sus elementos principales.',
    status:null
  }];
  const nodes = Array.isArray(state.nodes) ? state.nodes : [];
  const edges = Array.isArray(state.edges) ? state.edges : [];
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const adj=new Map();
  const addAdj=(a,b)=>{ if(!adj.has(a)) adj.set(a,[]); adj.get(a).push(b); };
  edges.forEach(e=>{ if(e.a==='__case__' || byId.has(e.a)) addAdj(e.a,e.b); if(e.b==='__case__' || byId.has(e.b)) addAdj(e.b,e.a); });
  const roots = (adj.get('__case__')||[]).filter(id=>byId.has(id));
  const ordered=[]; const visited=new Set();
  function walk(id){
    if(visited.has(id) || !byId.has(id)) return;
    visited.add(id); ordered.push(id);
    const children=(adj.get(id)||[]).filter(x=>x!=='__case__' && byId.has(x));
    children.sort((a,b)=>{
      const na=byId.get(a), nb=byId.get(b);
      return ((na?.y||0)-(nb?.y||0)) || String(na?.id).localeCompare(String(nb?.id));
    });
    children.forEach(walk);
  }
  roots.slice().sort((a,b)=>((byId.get(a)?.y||0)-(byId.get(b)?.y||0))).forEach(walk);
  nodes.slice().sort((a,b)=>((a?.y||0)-(b?.y||0))).forEach(n=>{ if(!visited.has(n.id)) walk(n.id); });
  ordered.forEach(id=>{
    const node=byId.get(id);
    if(!node) return;
    slides.push({
      kind:'node',
      id,
      type:presentationTypeLabel(node),
      title:presentationNodeTitle(node),
      text:presentationNodeText(node),
      status:presentationStatusText(node),
      hasConclusion:hasInlineConclusion(node),
      node
    });
  });
  return slides;
}
function renderPresentationSlide(){
  if(!presentationSlides.length) return;
  const slide=presentationSlides[presentationIndex];
  presentationTitle.textContent = state?.title || 'CASO';
  const card=document.createElement('div');
  card.className='presentation-card'+(slide.kind==='case'?' case-presentation':'');
  const type=document.createElement('div'); type.className='p-type'; type.textContent=slide.type;
  const title=document.createElement('div'); title.className='p-title'; title.textContent=slide.title;
  card.appendChild(type); card.appendChild(title);
  if(slide.text){ const text=document.createElement('div'); text.className='p-text'; text.textContent=slide.text; card.appendChild(text); }
  if(slide.status){ const meta=document.createElement('div'); meta.className='p-meta'; const badge=document.createElement('span'); badge.className='p-badge'; badge.textContent=slide.status; meta.appendChild(badge); card.appendChild(meta); }
  presentationContent.innerHTML=''; presentationContent.appendChild(card);
  presentationCounter.textContent=`${presentationIndex+1} / ${presentationSlides.length}`;
  presentationPrev.disabled=presentationIndex<=0;
  presentationNext.disabled=presentationIndex>=presentationSlides.length-1;
}
function openPresentation(){
  if(currentCaseId===null || !state) return;
  closeCaseSearch(); closeCaseFilters(); closeCaseStructure();
  presentationSlides=buildPresentationSlides();
  presentationIndex=0;
  renderPresentationSlide();
  presentationOverlay.classList.add('show');
  presentationOverlay.setAttribute('aria-hidden','false');
}
function closePresentation(){
  presentationOverlay.classList.remove('show');
  presentationOverlay.setAttribute('aria-hidden','true');
}
function presentationNextSlide(){ if(presentationIndex < presentationSlides.length-1){ presentationIndex++; renderPresentationSlide(); } }
function presentationPrevSlide(){ if(presentationIndex > 0){ presentationIndex--; renderPresentationSlide(); } }
presentationNext.addEventListener('click',presentationNextSlide);
presentationPrev.addEventListener('click',presentationPrevSlide);
presentationClose.addEventListener('click',closePresentation);
document.addEventListener('keydown',e=>{
  if(!presentationOverlay.classList.contains('show')) return;
  if(e.key==='Escape'){ e.preventDefault(); closePresentation(); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); presentationNextSlide(); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); presentationPrevSlide(); }
});


const boardNavToggle = document.getElementById('boardNavToggle');
const boardNavMenu = document.getElementById('boardNavMenu');
function positionBoardNavMenu(){
  if(!boardNavToggle || !boardNavMenu) return;
  const r=boardNavToggle.getBoundingClientRect();
  const mw=boardNavMenu.offsetWidth || 250;
  let left=r.left, top=r.bottom+8;
  if(left+mw>window.innerWidth-8) left=window.innerWidth-mw-8;
  if(left<8) left=8;
  if(top>window.innerHeight-80) top=Math.max(8,r.top-(boardNavMenu.offsetHeight||420)-8);
  boardNavMenu.style.left=Math.round(left)+'px';
  boardNavMenu.style.top=Math.round(top)+'px';
}
function closeBoardNavMenu(){
  if(!boardNavMenu) return;
  boardNavMenu.classList.add('hidden');
  boardNavMenu.setAttribute('aria-hidden','true');
  boardNavToggle?.setAttribute('aria-expanded','false');
}
boardNavToggle?.addEventListener('click',(e)=>{
  e.stopPropagation();
  if(!boardNavMenu) return;
  const open=boardNavMenu.classList.toggle('hidden')===false;
  boardNavMenu.setAttribute('aria-hidden',open?'false':'true');
  boardNavToggle.setAttribute('aria-expanded',open?'true':'false');
  if(open){positionBoardNavMenu(); requestAnimationFrame(positionBoardNavMenu);}
});
window.addEventListener('resize', positionBoardNavMenu);
document.addEventListener('click',(e)=>{
  if(!boardNavMenu || boardNavMenu.classList.contains('hidden')) return;
  if(boardNavMenu.contains(e.target) || boardNavToggle?.contains(e.target)) return;
  closeBoardNavMenu();
});

if(!document.getElementById('edgeInspector')){
  const panel=document.createElement('aside');
  panel.id='edgeInspector';
  panel.setAttribute('aria-hidden','true');
  panel.setAttribute('aria-label','Editor de relación');
  document.body.appendChild(panel);
}

document.getElementById('toolbar').addEventListener('click', (e)=>{
  const action = e.target.dataset.action;
  if(!action) return;
  if(action==='toggle-link'){
    linkMode = !linkMode;
    linkSrc = null;
    linkOneShot = false;
    document.querySelectorAll('.card').forEach(c=>c.classList.remove('linking-src'));
    e.target.classList.toggle('active', linkMode);
    boardEl.style.cursor = linkMode ? 'crosshair' : 'default';
  }
  if(action==='focus-case') centerCase();
  if(action==='center-all') centerAll();
  if(action==='center-selected') centerSelected();
  if(action==='center-branch') centerBranch();
  if(action==='next-connected') moveConnected(1);
  if(action==='prev-connected') moveConnected(-1);
  if(action==='organize') organizeBoard({ branchOnly:false });
  if(action==='organize-branches') arrangeBranches();
  if(action==='align-branch') alignBranch(e.target.dataset.align || 'left');
  if(action==='distribute-branch') distributeBranch(e.target.dataset.distribute || 'vertical');
  if(['center-all','center-selected','center-branch','next-connected','prev-connected','organize-branches','align-branch','distribute-branch'].includes(action)) closeBoardNavMenu();
  if(action==='presentation'){ openPresentation(); }
  if(action==='history'){
    const panel=document.getElementById('historyPanel');
    panel.classList.toggle('show'); panel.setAttribute('aria-hidden', panel.classList.contains('show') ? 'false':'true');
    if(panel.classList.contains('show')) renderHistory();
  }
  if(action==='clear'){
    askConfirm('¿Vaciar todo el tablero? Podrás deshacerlo con Ctrl+Z si te arrepientes.').then(ok=>{
      if(ok){
        pushUndo();
        state = normalizeBoardState({
          ...state,
          title: state.title,
          nodes: [],
          edges: [],
          history: Array.isArray(state.history) ? state.history : []
        });
        save();
        render();
      }
    });
  }
});


const historyCloseBtn = document.getElementById('historyClose');
if(historyCloseBtn){ historyCloseBtn.addEventListener('click',()=>{ const p=document.getElementById('historyPanel'); p.classList.remove('show'); p.setAttribute('aria-hidden','true'); }); }
const historySaveBtn = document.getElementById('historySave');
if(historySaveBtn){ historySaveBtn.addEventListener('click',()=>{ const name=window.prompt('Nombre del punto de control:', 'Punto de control'); if(name && name.trim()) addHistoryCheckpoint(name.trim()); }); }
document.addEventListener('click',(e)=>{ const p=document.getElementById('historyPanel'); const tb=document.getElementById('toolbar'); if(!p || !p.classList.contains('show')) return; if(p.contains(e.target) || (tb && tb.contains(e.target))) return; p.classList.remove('show'); p.setAttribute('aria-hidden','true'); });

titleEl.addEventListener('input', ()=>{ state.title = titleEl.value; scheduleSave(); });
document.getElementById('backToMenu').addEventListener('click', backToMenu);
document.getElementById('caseStatusBadge').addEventListener('click', cycleStatus);

window.getMindPlaceBoardStateSummary = getBoardStateSummary;

window.addEventListener('resize', drawStrings);
function applyParallax(){
  if(!document.body.classList.contains('theme-detective2')) return;
  const px = -(boardEl.scrollLeft * 0.06);
  const py = -(boardEl.scrollTop * 0.06);
  boardEl.style.backgroundPosition = `${px}px ${py}px, ${px}px ${py}px, 0 0, 0 0, 0 0`;
}

boardEl.addEventListener('scroll', ()=>{ drawStrings(); applyParallax(); });

function applyTheme(name, persist){
  document.body.classList.remove('theme-detective2', 'theme-futuristic', 'theme-allanwake2');
  if(name !== 'detective') document.body.classList.add('theme-' + name);
  store.theme = name;
  document.querySelectorAll('.theme-option').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
  if(name === 'detective2') applyParallax();
  else boardEl.style.backgroundPosition = '';
  if(persist) saveStore();
}

const themeBtn = document.getElementById('themeBtn');
const themeMenu = document.getElementById('themeMenu');
if(themeBtn && themeMenu){
  themeBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    themeMenu.classList.toggle('hidden');
  });
  themeMenu.querySelectorAll('.theme-option').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      applyTheme(btn.dataset.theme, true);
      themeMenu.classList.add('hidden');
    });
  });
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('#themeWrap')) themeMenu.classList.add('hidden');
  });
}

document.querySelectorAll('.newCaseHeaderBtn').forEach(btn=>{
  btn.addEventListener('click', ()=>caseEditor?.openNewCaseModal());
});

// ===== FILTROS DEL ARCHIVO DE CASOS =====
function getCaseFilterWraps(){
  return [...document.querySelectorAll('.caseFilterWrap')];
}

function closeCaseFilterMenus(){
  getCaseFilterWraps().forEach(wrap=>{
    const menu=wrap.querySelector('.caseFilterMenu');
    const btn=wrap.querySelector('.caseFilterBtn');
    if(menu) menu.classList.add('hidden');
    if(btn) btn.setAttribute('aria-expanded','false');
  });
}

function normalizeCaseCategoryFilter(){
  const raw = store.caseCategoryFilter;
  const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  store.caseCategoryFilter = [...new Set(list.filter(v=>typeof v==='string' && v.trim() !== ''))];
  return store.caseCategoryFilter;
}

function selectedCaseCategories(){
  return normalizeCaseCategoryFilter();
}

function getCaseCategories(){
  const set = new Set();
  store.index.filter(c=>!c.trashedAt).forEach(c=>{
    const cat=String(c.category || '').trim();
    if(cat) set.add(cat);
  });
  return [...set].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
}

function refreshCaseArchiveFilterControls(){
  const labels={
    'updated-desc':'Más recientes',
    'updated-asc':'Más antiguos',
    'name-asc':'Nombre A–Z',
    'name-desc':'Nombre Z–A',
    'status':'Estado'
  };
  const selected = selectedCaseCategories();
  const categories = getCaseCategories();

  // Si se borró una categoría, deja de estar seleccionada automáticamente.
  const valid = new Set(categories);
  const cleaned = selected.filter(v=>v==='__uncategorized__' || valid.has(v));
  if(cleaned.length !== selected.length) store.caseCategoryFilter = cleaned;

  getCaseFilterWraps().forEach(wrap=>{
    const menu=wrap.querySelector('.caseFilterMenu');
    const btn=wrap.querySelector('.caseFilterBtn');
    if(!menu || !btn) return;

    menu.querySelectorAll('.case-sort-option').forEach(opt=>{
      opt.classList.toggle('active', opt.dataset.sort === (store.caseSort || 'updated-desc'));
    });

    const opts=menu.querySelector('.caseCategoryOptions');
    if(opts){
      opts.innerHTML='';

      const all=document.createElement('button');
      all.type='button';
      all.className='case-category-option';
      all.textContent='Todas las categorías';
      all.dataset.category='';
      if(store.caseCategoryFilter.length===0) all.classList.add('active');
      opts.appendChild(all);

      const unc=document.createElement('button');
      unc.type='button';
      unc.className='case-category-option';
      unc.textContent='Sin categoría';
      unc.dataset.category='__uncategorized__';
      if(store.caseCategoryFilter.includes('__uncategorized__')) unc.classList.add('active');
      opts.appendChild(unc);

      categories.forEach(cat=>{
        const opt=document.createElement('button');
        opt.type='button';
        opt.className='case-category-option';
        opt.textContent='🏷 ' + cat;
        opt.dataset.category=cat;
        if(store.caseCategoryFilter.includes(cat)) opt.classList.add('active');
        opts.appendChild(opt);
      });

      opts.querySelectorAll('.case-category-option').forEach(opt=>{
        opt.addEventListener('click', async e=>{
          e.stopPropagation();
          const category = opt.dataset.category || '';
          const current = selectedCaseCategories();

          if(category === ''){
            store.caseCategoryFilter = [];
          }else{
            const next = [...current];
            const idx = next.indexOf(category);
            if(idx >= 0) next.splice(idx,1);
            else next.push(category);
            store.caseCategoryFilter = next;
          }

          await saveStore();
          refreshCaseArchiveFilterControls();
          renderMenu();
          scheduleCaseFilterRefresh();
        });
      });
    }

    const sortActive = store.caseSort && store.caseSort !== 'updated-desc';
    const categoryCount = store.caseCategoryFilter.length;
    const activeCount = (sortActive ? 1 : 0) + categoryCount;
    btn.textContent = activeCount ? `☰ FILTROS · ${activeCount}` : '☰ FILTROS';
  });
}

getCaseFilterWraps().forEach(wrap=>{
  const btn=wrap.querySelector('.caseFilterBtn');
  const menu=wrap.querySelector('.caseFilterMenu');

  btn?.addEventListener('click',e=>{
    e.stopPropagation();
    const willOpen=menu?.classList.contains('hidden');
    closeCaseFilterMenus();
    if(willOpen){
      refreshCaseArchiveFilterControls();
      menu?.classList.remove('hidden');
      btn.setAttribute('aria-expanded','true');
    }
  });

  menu?.querySelectorAll('.case-sort-option').forEach(opt=>{
    opt.addEventListener('click',async e=>{
      e.stopPropagation();
      store.caseSort=opt.dataset.sort || 'updated-desc';
      await saveStore();
      refreshCaseArchiveFilterControls();
      renderMenu();
    });
  });
});

document.addEventListener('click',e=>{
  if(!e.target.closest('.caseFilterWrap')) closeCaseFilterMenus();
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape') closeCaseFilterMenus();
});

function scheduleCaseFilterRefresh(){
  refreshCaseArchiveFilterControls();
  requestAnimationFrame(()=>refreshCaseArchiveFilterControls());
  setTimeout(()=>refreshCaseArchiveFilterControls(), 0);
}

scheduleCaseFilterRefresh();

// ===== EXPORTACIÓN PROFESIONAL DE CASOS =====
const caseExportOverlay = document.getElementById('caseExportOverlay');
const caseExportCaseName = document.getElementById('caseExportCaseName');
const caseExportClose = document.getElementById('caseExportClose');
const importCaseHeaderBtns = document.querySelectorAll('.importCaseHeaderBtn');
const caseImportOverlay = document.getElementById('caseImportOverlay');
const caseImportClose = document.getElementById('caseImportClose');
const caseImportAccept = document.getElementById('caseImportAccept');
const caseImportFile = document.getElementById('caseImportFile');
const caseImportFileName = document.getElementById('caseImportFileName');
const caseImportStatus = document.getElementById('caseImportStatus');
let pendingImportFile = null;

const exportMapVisualBtn = document.getElementById('exportMapVisualBtn');
const exportReportBtn = document.getElementById('exportReportBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const caseExportToast = document.getElementById('caseExportToast');

let exportTargetCaseId = null;
let exportToastTimer = null;

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function escapeXml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&apos;');
}

function downloadTextFile(filename, content, mime='text/plain;charset=utf-8'){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function safeFileName(name){
  return String(name || 'caso')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g,'-')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,90) || 'caso';
}

function typeLabelForExport(type){
  const labels = {
    question:'Pregunta',
    note:'Nota/Hipótesis',
    hypothesis:'Nota/Hipótesis',
    evidence:'Evidencia',
    person:'Persona',
    photo:'Foto',
    document:'Documento',
    conclusion:'Conclusión',
    tag:'Etiqueta'
  };
  return labels[type] || 'Elemento';
}

function stateLabelForExport(node){
  const s = node?.status || 'normal';
  if(s === 'pendiente') return 'Pendiente';
  if(s === 'validado') return 'Validado';
  if(s === 'descartado') return 'Descartado';
  return 'Normal';
}

function nodeDisplayTitleForExport(node){
  if(!node) return '';
  if(node.type === 'question') return node.qTitle || node.text || 'Pregunta';
  if(node.type === 'document') return node.docTitle || node.text || 'Documento';
  if(node.type === 'person') return node.personName || node.text || 'Persona';
  if(node.type === 'photo') return node.text || node.caption || 'Foto';
  if(node.type === 'conclusion') return node.text || 'Conclusión';
  return node.text || node.title || 'Elemento';
}

function collectConclusionForExport(node, isCaseMarker=false){
  if(!node) return null;
  if(node.conclusion) return node.conclusion;
  if(isCaseMarker && node.marker && node.marker.conclusion) return node.marker.conclusion;
  return null;
}

function buildExportSnapshot(caseId){
  const data = store?.cases?.[caseId];
  const entry = store?.index?.find(x=>x.id===caseId);
  if(!data) return null;

  const snapshot = deepCloneData(data) || {};

  snapshot.id = caseId;
  snapshot.indexMeta = entry ? deepCloneData(entry) : null;
  snapshot.exportedAt = Date.now();
  snapshot.exportVersion = 'mindplace-export-v1';
  return snapshot;
}

function setCaseImportStatus(message, ok=false){
  if(!caseImportStatus) return;
  caseImportStatus.textContent = message || '';
  caseImportStatus.classList.toggle('show', !!message);
  caseImportStatus.classList.toggle('ok', !!ok);
}

function resetCaseImportForm(){
  pendingImportFile = null;
  if(caseImportFile) caseImportFile.value = '';
  if(caseImportFileName) caseImportFileName.textContent = 'Ningún archivo seleccionado.';
  if(caseImportAccept) caseImportAccept.disabled = true;
  setCaseImportStatus('');
}

function openCaseImportModal(){
  if(!caseImportOverlay) return;
  resetCaseImportForm();
  caseImportOverlay.classList.remove('hidden');
  caseImportOverlay.setAttribute('aria-hidden','false');
}

function closeCaseImportModal(){
  if(!caseImportOverlay) return;
  caseImportOverlay.classList.add('hidden');
  caseImportOverlay.setAttribute('aria-hidden','true');
  resetCaseImportForm();
}

function normalizeImportedCase(raw, fileName){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('El archivo no contiene un caso MindPlace válido.');
  if(!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error('La copia no contiene la estructura de nodos y conexiones necesaria.');

  const cloned = deepCloneData(raw) || {};
  const legacyAttachments=[];
  (Array.isArray(cloned.nodes)?cloned.nodes:[]).forEach(node=>{
    if(!node || typeof node!=='object') return;
    if(typeof node.fileData==='string' && node.fileData.startsWith('data:')) legacyAttachments.push({id:`legacy-${uid('a')}`,sourceId:node.id,type:'document',name:node.fileName||'Adjunto',mimeType:node.fileType||'application/octet-stream',size:Number(node.fileSize)||0,createdAt:Date.now(),dataUrl:node.fileData});
    if(typeof node.photoData==='string' && node.photoData.startsWith('data:')) legacyAttachments.push({id:`legacy-${uid('a')}`,sourceId:node.id,type:'image',name:node.fileName||'Imagen',mimeType:node.fileType||'image/*',size:0,createdAt:Date.now(),dataUrl:node.photoData});
  });
  if(!Array.isArray(cloned.attachments)) cloned.attachments=[];
  cloned.attachments.push(...legacyAttachments);
  const legacyByNode=new Map(); legacyAttachments.forEach(a=>legacyByNode.set(a.sourceId,(legacyByNode.get(a.sourceId)||[]).concat(a)));
  cloned.nodes.forEach(node=>{ if(!node||typeof node!=='object') return; node.attachments=(Array.isArray(node.attachments)?node.attachments:[]).concat(legacyByNode.get(node.id)||[]).map(a=>({...a,sourceId:node.id})); });
  const newId = uid('c');
  const safeTitle = typeof cloned.title === 'string' && cloned.title.trim() ? cloned.title.trim() : (fileName || 'Caso importado').replace(/\.json$/i,'');
  const safeStatus = ['abierto','curso','resuelto'].includes(cloned.status) ? cloned.status : 'abierto';

  const nodeIds = new Set(cloned.nodes.filter(n=>n && typeof n==='object').map(n=>String(n.id||'')).filter(Boolean));
  cloned.nodes = cloned.nodes.filter(n=>n && typeof n==='object' && typeof n.id==='string' && n.id).slice(0,500);
  cloned.edges = cloned.edges.filter(e=>e && typeof e==='object' && typeof e.a==='string' && typeof e.b==='string')
    .filter(e=>(e.a==='__case__'||nodeIds.has(e.a)) && (e.b==='__case__'||nodeIds.has(e.b))).slice(0,1000);

  if(!Array.isArray(cloned.history)) cloned.history=[];
  delete cloned.indexMeta; delete cloned.exportedAt; delete cloned.exportVersion; delete cloned.id;
  cloned.title=safeTitle;
  cloned.description=typeof cloned.description==='string'?cloned.description:'';
  cloned.status=safeStatus;
  cloned.category=typeof cloned.category==='string' ? cloned.category.trim().slice(0,40) : '';
  if(!cloned.marker || typeof cloned.marker!=='object') cloned.marker={x:40,y:200};
  if(!Number.isFinite(Number(cloned.marker.x))) cloned.marker.x=40;
  if(!Number.isFinite(Number(cloned.marker.y))) cloned.marker.y=200;

  cloned.history.push({
    id:uid('h'),
    title:'Caso importado',
    createdAt:Date.now(),
    snapshot:JSON.parse(JSON.stringify({title:cloned.title,description:cloned.description,status:cloned.status,nodes:cloned.nodes,edges:cloned.edges,marker:cloned.marker}))
  });

  return {id:newId,data:cloned};
}

async function importCaseFromFile(file){
  if(!file) throw new Error('Selecciona primero una copia .json.');
  const text=await file.text();
  let raw;
  raw = safeJsonParse(text, null, 'archivo importado');
  if(!raw){ throw new Error('El archivo no contiene JSON válido.'); }
  const imported=normalizeImportedCase(raw,file.name);
  const duplicate=store.index.find(c=>!c.trashedAt && String(c.title||'').trim().toLowerCase()===imported.data.title.trim().toLowerCase());
  if(duplicate){
    const ok=await askConfirm(
      `Ya existe un caso llamado "${imported.data.title}". ¿Quieres importar esta copia de todas formas?`,
      'Crear copia'
    );
    if(!ok) return null;
  }
  store.index.push({id:imported.id,title:imported.data.title,description:imported.data.description,status:imported.data.status,pinned:false,updatedAt:Date.now()});
  store.cases[imported.id]=imported.data;
  await saveStore();
  renderMenu();
  showExportToast('Caso importado correctamente.');
  return imported.id;
}

function openCaseExportModal(caseId){
  const data = store?.cases?.[caseId];
  if(!data || !caseExportOverlay) return;

  exportTargetCaseId = caseId;
  caseExportCaseName.textContent = data.title || 'Caso sin título';
  caseExportOverlay.classList.remove('hidden');
  caseExportOverlay.setAttribute('aria-hidden','false');
}

function closeCaseExportModal(){
  if(!caseExportOverlay) return;
  caseExportOverlay.classList.add('hidden');
  caseExportOverlay.setAttribute('aria-hidden','true');
  exportTargetCaseId = null;
}

function showExportToast(message){
  if(!caseExportToast) return;
  clearTimeout(exportToastTimer);
  caseExportToast.textContent = message;
  caseExportToast.classList.add('show');
  exportToastTimer = setTimeout(()=>caseExportToast.classList.remove('show'), 2600);
}

function buildMapVisualSvg(snapshot){
  const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
  const edges = Array.isArray(snapshot.edges) ? snapshot.edges : [];
  const marker = snapshot.marker || {x:40,y:200};

  const cardW = 220;
  const cardH = 135;
  const pad = 100;

  const positions = new Map();
  let minX = Number(marker.x) || 40;
  let minY = Number(marker.y) || 200;
  let maxX = minX + cardW;
  let maxY = minY + cardH;

  for(const n of nodes){
    const x = Number(n.x) || 0;
    const y = Number(n.y) || 0;
    positions.set(n.id, {x,y});
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + cardW);
    maxY = Math.max(maxY, y + cardH);
  }

  minX = Math.floor(minX - pad);
  minY = Math.floor(minY - pad);
  maxX = Math.ceil(maxX + pad);
  maxY = Math.ceil(maxY + pad);

  const width = Math.max(1000, maxX - minX);
  const height = Math.max(700, maxY - minY);

  const colors = {
    question:'#d8cae4',
    note:'#dcd6c6',
    hypothesis:'#e3bb47',
    evidence:'#c7cdd1',
    document:'#c9b283',
    person:'#8fa3b8',
    photo:'#3a3a3a',
    conclusion:'#8fae6e',
    tag:'#6f9384'
  };

  const textColor = {
    photo:'#ffffff'
  };

  const textLines = (text, maxChars=28)=>{
    const str = String(text || '').trim();
    if(!str) return [''];
    const words = str.split(/\s+/);
    const lines = [];
    let current = '';
    for(const word of words){
      const candidate = current ? current + ' ' + word : word;
      if(candidate.length > maxChars){
        if(current) lines.push(current);
        current = word;
      }else{
        current = candidate;
      }
      if(lines.length >= 4) break;
    }
    if(current && lines.length < 4) lines.push(current);
    if(lines.length && words.join(' ').length > lines.join(' ').length){
      lines[lines.length-1] = lines[lines.length-1].slice(0, maxChars-1) + '…';
    }
    return lines;
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity=".22"/>
    </filter>
  </defs>
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#2b190d"/>
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#wood)" opacity=".16"/>
  <text x="${minX+26}" y="${minY+38}" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#f0e6d5">${escapeXml(snapshot.title || 'CASO')}</text>
  <text x="${minX+26}" y="${minY+66}" font-family="Arial, sans-serif" font-size="11" fill="#d4c7b0">${escapeXml(snapshot.description || '')}</text>`;

  for(const edge of edges){
    const a = edge.a === '__case__'
      ? {x:Number(marker.x)||40, y:Number(marker.y)||200}
      : positions.get(edge.a);
    const b = edge.b === '__case__'
      ? {x:Number(marker.x)||40, y:Number(marker.y)||200}
      : positions.get(edge.b);

    if(!a || !b) continue;

    const ax = a.x + (edge.a === '__case__' ? 100 : cardW/2);
    const ay = a.y + (edge.a === '__case__' ? 40 : cardH/2);
    const bx = b.x + (edge.b === '__case__' ? 100 : cardW/2);
    const by = b.y + (edge.b === '__case__' ? 40 : cardH/2);

    svg += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#b8935a" stroke-width="2.2" opacity=".75"/>`;
  }

  // Caso principal
  const mx = Number(marker.x)||40;
  const my = Number(marker.y)||200;
  svg += `<g filter="url(#shadow)">
    <rect x="${mx}" y="${my}" width="200" height="90" rx="8" fill="#b8935a"/>
    <text x="${mx+16}" y="${my+30}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#241c14">CASO</text>
    <text x="${mx+16}" y="${my+54}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#241c14">${escapeXml(snapshot.title || 'CASO SIN TÍTULO')}</text>
  </g>`;

  for(const node of nodes){
    const p = positions.get(node.id);
    if(!p) continue;

    const fill = colors[node.type] || '#ece3ce';
    const fg = textColor[node.type] || '#241c14';
    const title = nodeDisplayTitleForExport(node);
    const lines = textLines(title);
    const typeLabel = typeLabelForExport(node.type);
    const status = stateLabelForExport(node);

    svg += `<g filter="url(#shadow)">
      <rect x="${p.x}" y="${p.y}" width="${cardW}" height="${cardH}" rx="8" fill="${fill}" stroke="rgba(0,0,0,.18)"/>
      <text x="${p.x+14}" y="${p.y+22}" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="${fg}" opacity=".78">${escapeXml(typeLabel.toUpperCase())}</text>
      <text x="${p.x+14}" y="${p.y+45}" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${fg}">${escapeXml(lines[0] || '')}</text>
      ${lines.slice(1).map((line,i)=>`<text x="${p.x+14}" y="${p.y+45+(i+1)*18}" font-family="Arial, sans-serif" font-size="12" fill="${fg}">${escapeXml(line)}</text>`).join('')}
      <text x="${p.x+14}" y="${p.y + cardH - 14}" font-family="Arial, sans-serif" font-size="10" fill="${fg}" opacity=".65">${escapeXml(status)}</text>
    </g>`;
  }

  return svg + `</svg>`;
}

function downloadMapVisual(caseId){
  const snapshot = buildExportSnapshot(caseId);
  if(!snapshot) return;
  const svg = buildMapVisualSvg(snapshot);
  const filename = `${safeFileName(snapshot.title)}_mapa.svg`;
  downloadTextFile(filename, svg, 'image/svg+xml;charset=utf-8');
  showExportToast('Mapa visual exportado.');
}

function buildReportHtml(snapshot){
  const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
  const edges = Array.isArray(snapshot.edges) ? snapshot.edges : [];
  const stateCounts = {normal:0, pendiente:0, validado:0, descartado:0};
  for(const node of nodes){
    const s = node?.status || 'normal';
    if(stateCounts[s] == null) stateCounts[s] = 0;
    stateCounts[s]++;
  }

  const grouped = {
    question:[], note:[], evidence:[], document:[], person:[], photo:[], hypothesis:[], conclusion:[], tag:[]
  };
  nodes.forEach(node=>{
    const t = grouped[node.type] ? node.type : 'note';
    grouped[t].push(node);
  });

  const section = (title, arr)=>{
    if(!arr.length) return '';
    return `<section><h2>${escapeHtml(title)}</h2>${arr.map(node=>{
      const text = nodeDisplayTitleForExport(node);
      const extra = node.type === 'document' ? (node.docTitle || node.author || node.category || '') : (node.category || '');
      const conclusion = node.conclusion ? `<div class="conclusion"><strong>Conclusión:</strong> ${escapeHtml(node.conclusion.text || '')}${node.conclusion.detail ? `<br><span>${escapeHtml(node.conclusion.detail)}</span>`:''}</div>` : '';
      return `<article><div class="meta">${escapeHtml(typeLabelForExport(node.type))} · ${escapeHtml(stateLabelForExport(node))}</div><h3>${escapeHtml(text || 'Sin título')}</h3>${extra ? `<p>${escapeHtml(extra)}</p>`:''}${conclusion}</article>`;
    }).join('')}</section>`;
  };

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(snapshot.title || 'MindPlace')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:0;background:#f4efe5;color:#261d14}
  .wrap{max-width:900px;margin:0 auto;padding:42px 24px 64px}
  .cover{background:#2b190d;color:#f2e8d8;padding:42px 36px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.16)}
  .eyebrow{letter-spacing:3px;text-transform:uppercase;font-size:11px;opacity:.72}
  h1{font-size:34px;margin:10px 0 12px}
  .lead{font-size:16px;line-height:1.6;opacity:.88}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:22px}
  .stat{background:#fffaf0;padding:12px;border-radius:8px;border:1px solid #ddd0ba;color:#261d14}
  .stat strong{display:block;font-size:22px}
  .stat span{font-size:11px;opacity:.65}
  section{margin-top:28px}
  h2{font-size:20px;border-bottom:2px solid #b8935a;padding-bottom:7px}
  article{background:#fffaf0;border:1px solid #e0d5c4;border-radius:8px;padding:14px 16px;margin:10px 0}
  article h3{margin:5px 0 8px;font-size:17px}
  article p{margin:0;color:#594b3a;line-height:1.5}
  .meta{font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:#8c6e3c}
  .conclusion{margin-top:10px;padding:10px;border-left:4px solid #5f7d45;background:#eff5e9}
  .conclusion span{opacity:.76}
  .footer{margin-top:38px;font-size:10px;opacity:.55}
  @media print{
    body{background:#fff}
    .wrap{max-width:none;padding:0}
    .cover{box-shadow:none}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="cover">
    <div class="eyebrow">MINDPLACE · INFORME DE CASO</div>
    <h1>${escapeHtml(snapshot.title || 'Caso sin título')}</h1>
    <div class="lead">${escapeHtml(snapshot.description || 'Sin descripción.')}</div>
    <div class="stats">
      <div class="stat"><strong>${nodes.length}</strong><span>Elementos</span></div>
      <div class="stat"><strong>${edges.length}</strong><span>Conexiones</span></div>
      <div class="stat"><strong>${stateCounts.pendiente || 0}</strong><span>Pendientes</span></div>
      <div class="stat"><strong>${stateCounts.validado || 0}</strong><span>Validados</span></div>
    </div>
  </div>
  ${section('Preguntas', grouped.question)}
  ${section('Notas / Hipótesis', [...grouped.note, ...grouped.hypothesis])}
  ${section('Documentos', grouped.document)}
  ${section('Personas', grouped.person)}
  ${section('Fotos', grouped.photo)}
  ${section('Evidencias', grouped.evidence)}
  ${section('Conclusiones', grouped.conclusion)}
  ${section('Etiquetas', grouped.tag)}
  <div class="footer">Exportado desde MindPlace · ${new Date(snapshot.exportedAt || Date.now()).toLocaleString('es-ES')}</div>
</div>
</body>
</html>`;
}

function downloadReport(caseId){
  const snapshot = buildExportSnapshot(caseId);
  if(!snapshot) return;
  const htmlReport = buildReportHtml(snapshot);
  const filename = `${safeFileName(snapshot.title)}_informe.html`;
  downloadTextFile(filename, htmlReport, 'text/html;charset=utf-8');
  showExportToast('Informe exportado. Puedes imprimirlo o guardarlo como PDF desde el navegador.');
}

async function downloadCaseData(caseId){
  const snapshot=buildExportSnapshot(caseId);
  if(!snapshot) return;
  try{
    snapshot.exportVersion='mindplace-export-v2';
    snapshot.attachments=attachmentRepository ? await attachmentRepository.getBundleForCase(caseId) : [];
    const filename=`${safeFileName(snapshot.title)}_copia.json`;
    downloadTextFile(filename,JSON.stringify(snapshot,null,2),'application/json;charset=utf-8');
    showExportToast(`Copia del caso exportada · ${snapshot.attachments.length} adjuntos.`);
  }catch(error){ console.error('No se pudo exportar el caso',error); showExportToast(error?.message||'No se pudo exportar el caso.'); }
}

if(caseExportClose){
  caseExportClose.addEventListener('click', closeCaseExportModal);
}
if(exportMapVisualBtn){
  exportMapVisualBtn.addEventListener('click', ()=>{
    if(exportTargetCaseId) downloadMapVisual(exportTargetCaseId);
  });
}
if(exportReportBtn){
  exportReportBtn.addEventListener('click', ()=>{
    if(exportTargetCaseId) downloadReport(exportTargetCaseId);
  });
}
if(exportDataBtn){
  exportDataBtn.addEventListener('click', ()=>{
    if(exportTargetCaseId) downloadCaseData(exportTargetCaseId);
  });
}
if(caseExportOverlay){
  caseExportOverlay.addEventListener('pointerdown',(e)=>{
    if(e.target === caseExportOverlay) closeCaseExportModal();
  });
}
document.addEventListener('keydown',(e)=>{
  if(e.key === 'Escape' && caseImportOverlay && !caseImportOverlay.classList.contains('hidden')){
    closeCaseImportModal();
    return;
  }
});

document.addEventListener('keydown',(e)=>{
  if(e.key === 'Escape' && caseExportOverlay && !caseExportOverlay.classList.contains('hidden')){
    closeCaseExportModal();
  }
});

importCaseHeaderBtns.forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.preventDefault(); e.stopPropagation(); openCaseImportModal();
  });
});

// =========================================================
// COPIAS DE SEGURIDAD DE MINDPLACE
// =========================================================
const backupOverlay = document.getElementById('backupOverlay');
const backupClose = document.getElementById('backupClose');
const backupCloseTop = document.getElementById('backupCloseTop');
const backupCreateChoice = document.getElementById('backupCreateChoice');
const backupImportChoice = document.getElementById('backupImportChoice');
const backupCreatePanel = document.getElementById('backupCreatePanel');
const backupImportPanel = document.getElementById('backupImportPanel');
const backupCreateBtn = document.getElementById('backupCreateBtn');
const backupFile = document.getElementById('backupFile');
const backupFileName = document.getElementById('backupFileName');
const backupStatus = document.getElementById('backupStatus');
const backupAddBtn = document.getElementById('backupAddBtn');
const backupReplaceBtn = document.getElementById('backupReplaceBtn');
let pendingBackup = null;

function openBackupModal(){
  if(!backupOverlay) return;
  pendingBackup = null;
  if(backupFile) backupFile.value = '';
  if(backupFileName) backupFileName.textContent = 'Ningún archivo seleccionado.';
  if(backupStatus){ backupStatus.textContent=''; backupStatus.classList.remove('show'); }
  if(backupAddBtn) backupAddBtn.disabled = true;
  if(backupReplaceBtn) backupReplaceBtn.disabled = true;
  selectBackupPanel('create');
  backupOverlay.classList.remove('hidden');
  backupOverlay.setAttribute('aria-hidden','false');
}

function closeBackupModal(){
  if(!backupOverlay) return;
  backupOverlay.classList.add('hidden');
  backupOverlay.setAttribute('aria-hidden','true');
  pendingBackup = null;
}

const BACKUP_RECOVERY_KEY = STORE_KEY + '-pre-backup-restore';

async function saveBackupRecovery(rawStore){
  try{
    const attachments=attachmentRepository ? await attachmentRepository.getFullBundle() : [];
    await window.storage.set(BACKUP_RECOVERY_KEY,JSON.stringify({recoveryType:'mindplace-pre-backup-restore',createdAt:Date.now(),store:deepCloneData(rawStore)||rawStore,attachments}),false);
    return true;
  }catch(error){ console.warn('No se pudo crear la recuperación previa a la restauración',error); return false; }
}

async function loadBackupRecovery(){
  try{
    const res=await window.storage.get(BACKUP_RECOVERY_KEY,false);
    if(!res || !res.value) return null;
    const raw=safeJsonParse(res.value,null,'recuperación previa a la restauración');
    return raw && raw.store ? raw : null;
  }catch(error){ console.warn('No se pudo leer la recuperación previa a la restauración',error); return null; }
}

async function clearBackupRecovery(){
  try{ await window.storage.set(BACKUP_RECOVERY_KEY, '', false); }catch(e){}
}

async function verifyPersistedStore(expected){
  try{
    const res = await window.storage.get(STORE_KEY, false);
    if(!res || !res.value) return false;
  const persisted = safeJsonParse(res.value, null, 'estado persistido');
  return !!persisted && validateStoreStructure(persisted) && JSON.stringify(persisted) === JSON.stringify(expected);
  }catch(e){
    return false;
  }
}

async function restoreBackupRecovery(){
  const recovery=await loadBackupRecovery();
  if(!recovery || !validateStoreStructure(migrateStore(recovery.store))) return false;
  const safe=migrateStore(recovery.store);
  try{
    if(attachmentRepository) await attachmentRepository.clearAll();
    if(attachmentRepository && Array.isArray(recovery.attachments) && recovery.attachments.length){
      const map=await attachmentRepository.importBundle(recovery.attachments,{sourceIdRewrite:(sourceId)=>sourceId});
      Object.values(safe.cases).forEach(caseData=>caseData?.nodes?.forEach(node=>{ node.attachments=(node.attachments||[]).map(a=>({...a,id:map.get(a.id)||a.id,sourceId:node.id})); }));
    }
    store=safe;
    const saved=await saveStore();
    return !!saved && await verifyPersistedStore(safe);
  }catch(error){ console.error('No se pudo restaurar la recuperación completa.',error); return false; }
}

async function buildFullBackup(){
  const cloned=deepCloneData(store)||makeEmptyStore();
  const attachments=attachmentRepository ? await attachmentRepository.getFullBundle() : [];
  return {backupType:'mindplace-full-backup',backupVersion:'mindplace-backup-v2',exportedAt:Date.now(),app:'MindPlace',storageVersion:STORE_STORAGE_VERSION,dataVersion:STORE_DATA_VERSION,attachmentCount:attachments.length,attachmentBytes:attachments.reduce((sum,item)=>sum+Number(item?.size||0),0),store:cloned,attachments};
}

async function downloadFullBackup(){
  try{
    const payload=await buildFullBackup();
    const d=new Date(payload.exportedAt);
    const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    downloadTextFile(`MindPlace_Backup_${stamp}.json`,JSON.stringify(payload,null,2),'application/json;charset=utf-8');
    if(backupStatus){ backupStatus.textContent=`Copia completa creada · ${payload.attachmentCount} adjuntos.`; backupStatus.classList.add('show'); }
  }catch(error){ if(backupStatus){ backupStatus.textContent=error?.message||'No se pudo crear la copia completa.'; backupStatus.classList.add('show'); } }
}

function normalizeFullBackup(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('El archivo no contiene una copia de seguridad válida.');
  if(raw.backupType !== 'mindplace-full-backup') throw new Error('Este archivo no es una copia de seguridad completa de MindPlace.');
  if(!raw.store || typeof raw.store !== 'object') throw new Error('La copia no contiene datos válidos de MindPlace.');
  const incoming = JSON.parse(JSON.stringify(raw.store));
  const safeIndex = Array.isArray(incoming.index) ? incoming.index.filter(x=>x && typeof x==='object' && typeof x.id==='string') : [];
  const safeCases = incoming.cases && typeof incoming.cases==='object' ? incoming.cases : {};
  return {
    index:safeIndex,
    cases:safeCases,
    theme:typeof incoming.theme==='string' ? incoming.theme : 'allanwake2',
    caseSort:typeof incoming.caseSort==='string' ? incoming.caseSort : 'updated-desc',
    caseCategoryFilter:normalizeCategoryFilter(incoming.caseCategoryFilter),
    storageVersion:STORE_STORAGE_VERSION,
    dataVersion:STORE_DATA_VERSION,
    demoDeleted:incoming.demoDeleted && typeof incoming.demoDeleted==='object' ? incoming.demoDeleted : {},
    attachmentStorage:'indexeddb'
  };
}

function backupSummary(data,attachments=[]){
  const active = (data.index||[]).filter(c=>!c.trashedAt);
  const categories = new Set(active.map(c=>String(c.category||'').trim()).filter(Boolean));
  let nodes=0, edges=0;
  Object.values(data.cases||{}).forEach(c=>{
    if(!c || typeof c!=='object') return;
    nodes += Array.isArray(c.nodes) ? c.nodes.length : 0;
    edges += Array.isArray(c.edges) ? c.edges.length : 0;
  });
  return {cases:active.length,categories:categories.size,nodes,edges,attachments:attachments.length,attachmentBytes:attachments.reduce((sum,item)=>sum+Number(item?.size||0),0)};
}

function importBackupFile(file){
  if(!file) return Promise.resolve(null);
  return file.text().then(text=>{
    let raw;
    try{ raw=JSON.parse(text); }catch{ throw new Error('El archivo seleccionado no contiene JSON válido.'); }
    const data = normalizeFullBackup(raw);
    if(!validateStoreStructure(data)) throw new Error('La copia no supera la validación de estructura de MindPlace.');
    const attachments=Array.isArray(raw.attachments)?raw.attachments:[];
    const attachmentBytes=attachments.reduce((sum,item)=>sum+Number(item?.size||0),0);
    if(attachmentBytes > MAX_BACKUP_ATTACHMENT_BYTES) throw new Error('La copia contiene más de 150 MB de adjuntos.');
    return {data,attachments,meta:backupSummary(data,attachments),exportedAt:raw.exportedAt||null};
  });
}

function uniqueCaseId(baseId, used){
  let id = baseId && !used.has(baseId) ? baseId : uid('c');
  while(used.has(id)) id = uid('c');
  used.add(id);
  return id;
}

function mergeBackupIntoCurrent(imported){
  const merged = JSON.parse(JSON.stringify(store));
  if(!Array.isArray(merged.index)) merged.index=[];
  if(!merged.cases || typeof merged.cases!=='object') merged.cases={};
  const used = new Set(merged.index.map(c=>c.id));
  const titleKeys = new Set(merged.index.filter(c=>!c.trashedAt).map(c=>String(c.title||'').trim().toLowerCase()));
  let added=0;

  imported.index.forEach(entry=>{
    const sourceCase = imported.cases[entry.id];
    if(!sourceCase) return;
    let newId = uniqueCaseId(entry.id, used);
    let title = String(entry.title||'CASO SIN TÍTULO').trim() || 'CASO SIN TÍTULO';
    let key = title.toLowerCase();
    if(titleKeys.has(key)){
      let n=2;
      while(titleKeys.has(`${key} (${n})`)) n++;
      title = `${title} (${n})`;
      key = title.toLowerCase();
    }
    const clonedCase = JSON.parse(JSON.stringify(sourceCase));
    clonedCase.id = newId;
    merged.cases[newId] = clonedCase;
    merged.index.push({...JSON.parse(JSON.stringify(entry)), id:newId, title});
    titleKeys.add(key);
    added++;
  });
  return {merged,added};
}

function selectBackupPanel(mode){
  const isCreate = mode === 'create';
  backupCreateChoice?.classList.toggle('active',isCreate);
  backupImportChoice?.classList.toggle('active',!isCreate);
  backupCreatePanel?.classList.toggle('hidden',!isCreate);
  backupImportPanel?.classList.toggle('hidden',isCreate);
}
if(backupCreateChoice) backupCreateChoice.addEventListener('click',()=>selectBackupPanel('create'));
if(backupImportChoice) backupImportChoice.addEventListener('click',()=>selectBackupPanel('import'));
if(backupCreateBtn) backupCreateBtn.addEventListener('click',downloadFullBackup);
if(backupClose) backupClose.addEventListener('click',closeBackupModal);
if(backupCloseTop) backupCloseTop.addEventListener('click',closeBackupModal);
if(backupOverlay) backupOverlay.addEventListener('pointerdown',e=>{ if(e.target===backupOverlay) closeBackupModal(); });

if(backupFile){
  backupFile.addEventListener('change',async()=>{
    const file=backupFile.files?.[0]||null;
    pendingBackup=null;
    if(backupAddBtn) backupAddBtn.disabled=true;
    if(backupReplaceBtn) backupReplaceBtn.disabled=true;
    if(backupFileName) backupFileName.textContent=file ? `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB` : 'Ningún archivo seleccionado.';
    if(backupStatus){ backupStatus.textContent=''; backupStatus.classList.remove('show'); }
    if(!file) return;
    try{
      pendingBackup = await importBackupFile(file);
      const m=pendingBackup.meta;
      if(backupStatus){ backupStatus.textContent=`Copia válida · ${m.cases} casos · ${m.categories} categorías · ${m.nodes} elementos · ${m.edges} conexiones · ${m.attachments} adjuntos.`; backupStatus.classList.add('show'); }
      if(backupAddBtn) backupAddBtn.disabled=false;
      if(backupReplaceBtn) backupReplaceBtn.disabled=false;
    }catch(err){
      if(backupStatus){ backupStatus.textContent=err?.message||'No se pudo leer la copia.'; backupStatus.classList.add('show'); }
    }
  });
}

if(backupAddBtn){
  backupAddBtn.addEventListener('click',async()=>{
    if(!pendingBackup) return;
    const m=pendingBackup.meta;
    const ok=await askConfirm(`Se añadirán ${m.cases} casos de la copia a tus casos actuales. Los datos actuales no se reemplazarán. ¿Continuar?`,'Añadir casos');
    if(!ok) return;

    const previous = JSON.parse(JSON.stringify(store));
    if(!await saveBackupRecovery(previous)){
      if(backupStatus){ backupStatus.textContent='No se pudo crear la protección previa. No se ha modificado el proyecto.'; backupStatus.classList.add('show'); }
      return;
    }

    try{
      const result=mergeBackupIntoCurrent(pendingBackup.data);
      if(!validateStoreStructure(result.merged)) throw new Error('Los datos combinados no superan la validación.');
      if(attachmentRepository && pendingBackup.attachments?.length){
        const map=await attachmentRepository.importBundle(pendingBackup.attachments,{sourceIdRewrite:(sourceId)=>sourceId});
        Object.values(result.merged.cases).forEach(caseData=>caseData?.nodes?.forEach(node=>{ node.attachments=(node.attachments||[]).map(a=>({...a,id:map.get(a.id)||a.id,sourceId:node.id})); }));
      }
      store=result.merged;
      const saved=await saveStore();
      if(!saved || !(await verifyPersistedStore(store))){
        throw new Error('No se pudo verificar la restauración después del guardado.');
      }
      await clearBackupRecovery();
      renderMenu();
      if(backupStatus){ backupStatus.textContent=`Restauración completada · ${result.added} casos añadidos.`; backupStatus.classList.add('show'); }
      setTimeout(closeBackupModal,700);
    }catch(err){
      const restored=await restoreBackupRecovery();
      if(restored){
        renderMenu();
        if(backupStatus){ backupStatus.textContent='La restauración falló. Tus datos anteriores se han conservado.'; backupStatus.classList.add('show'); }
      }else{
        store=previous;
        renderMenu();
        if(backupStatus){ backupStatus.textContent='La restauración falló. No se pudo confirmar el estado guardado; conserva tu copia de seguridad antes de continuar.'; backupStatus.classList.add('show'); }
      }
      console.error('Error al añadir copia de seguridad', err);
    }
  });
}

if(backupReplaceBtn){
  backupReplaceBtn.addEventListener('click',async()=>{
    if(!pendingBackup) return;
    const m=pendingBackup.meta;
    const ok=await askConfirm(`ATENCIÓN: se reemplazarán los datos actuales por la copia (${m.cases} casos). Se creará una protección automática del estado actual. ¿Continuar?`,'Reemplazar datos');
    if(!ok) return;

    if(!await saveBackupRecovery(store)){
      if(backupStatus){ backupStatus.textContent='No se pudo crear la protección previa. No se ha reemplazado el proyecto.'; backupStatus.classList.add('show'); }
      return;
    }

    try{
      const replacement=JSON.parse(JSON.stringify(pendingBackup.data));
      if(!validateStoreStructure(replacement)) throw new Error('La copia no supera la validación final.');
      if(attachmentRepository) await attachmentRepository.clearAll();
      if(attachmentRepository && pendingBackup.attachments?.length){
        const map=await attachmentRepository.importBundle(pendingBackup.attachments,{sourceIdRewrite:(sourceId)=>sourceId});
        Object.values(replacement.cases).forEach(caseData=>caseData?.nodes?.forEach(node=>{ node.attachments=(node.attachments||[]).map(a=>({...a,id:map.get(a.id)||a.id,sourceId:node.id})); }));
      }
      store=replacement;
      currentCaseId=null;
      state={title:'CASO SIN TÍTULO',nodes:[],edges:[],history:[]};
      resetUndoHistory();
      backToMenu();
      applyTheme(store.theme || 'allanwake2', false);
      const saved=await saveStore();
      if(!saved || !(await verifyPersistedStore(store))){
        throw new Error('No se pudo verificar el proyecto restaurado.');
      }
      await clearBackupRecovery();
      renderMenu();
      if(backupStatus){ backupStatus.textContent='Proyecto restaurado correctamente.'; backupStatus.classList.add('show'); }
      setTimeout(closeBackupModal,700);
    }catch(err){
      const restored=await restoreBackupRecovery();
      if(restored){
        currentCaseId=null;
        state={title:'CASO SIN TÍTULO',nodes:[],edges:[],history:[]};
        resetUndoHistory();
        backToMenu();
        applyTheme(store.theme || 'allanwake2', false);
        renderMenu();
        if(backupStatus){ backupStatus.textContent='La restauración falló. Se han recuperado tus datos anteriores.'; backupStatus.classList.add('show'); }
      }else if(backupStatus){
        backupStatus.textContent='La restauración falló y no pudo verificarse la recuperación automática. Conserva la copia original y no cierres esta pestaña.'; backupStatus.classList.add('show');
      }
      console.error('Error al reemplazar con copia de seguridad', err);
    }
  });
}

// El botón de copia se gestiona por delegación para que funcione de forma fiable
// aunque el encabezado visible se cambie por tema o se reconstruya dinámicamente.
document.addEventListener('click', (e)=>{
  const btn = e.target.closest?.('.backupHeaderBtn');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  openBackupModal();
});

const trashCaseHeaderBtns = document.querySelectorAll('.trashCaseHeaderBtn');
trashCaseHeaderBtns.forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.preventDefault();
    e.stopPropagation();
    openTrashModal();
  });
});

const trashClose = document.getElementById('trashClose');
if(trashClose) trashClose.addEventListener('click', closeTrashModal);

const trashOverlay = document.getElementById('trashOverlay');
if(trashOverlay){
  trashOverlay.addEventListener('pointerdown',(e)=>{
    // El fondo no cierra la papelera. Se cierra con "Cerrar" o Esc.
  });
}

document.addEventListener('keydown',(e)=>{
  if(e.key === 'Escape' && backupOverlay && !backupOverlay.classList.contains('hidden')){
    closeBackupModal();
    return;
  }
});

document.addEventListener('keydown',(e)=>{
  if(e.key === 'Escape' && trashOverlay && !trashOverlay.classList.contains('hidden')){
    closeTrashModal();
  }
});

if(caseImportClose) caseImportClose.addEventListener('click',closeCaseImportModal);

if(caseImportFile){
  caseImportFile.addEventListener('change',()=>{
    const file=caseImportFile.files?.[0]||null;
    pendingImportFile=file;
    if(caseImportFileName) caseImportFileName.textContent=file ? `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB` : 'Ningún archivo seleccionado.';
    if(caseImportAccept) caseImportAccept.disabled=!file;
    setCaseImportStatus('');
  });
}

if(caseImportAccept){
  caseImportAccept.addEventListener('click',async()=>{
    if(!pendingImportFile) return;
    caseImportAccept.disabled=true;
    setCaseImportStatus('Importando el caso…');
    try{
      const importedId=await importCaseFromFile(pendingImportFile);
      if(!importedId){ caseImportAccept.disabled=false; return; }
      setCaseImportStatus('Caso importado correctamente.',true);
      setTimeout(()=>closeCaseImportModal(),650);
    }catch(error){
      console.error('ERROR IMPORTANDO CASO:',error);
      setCaseImportStatus(error?.message||'No se pudo importar el caso.');
      caseImportAccept.disabled=false;
    }
  });
}

if(caseImportOverlay){
  caseImportOverlay.addEventListener('pointerdown',(e)=>{
    // No se cierra al pulsar el fondo. Usa Cancelar o termina con la X cuando esté disponible.
  });
}

// ===== ACCESO PREPARADO PARA CREAR CON IA =====
const aiCaseHeaderBtns = document.querySelectorAll('.aiCaseHeaderBtn');
const aiPaymentOverlay = document.getElementById('aiPaymentOverlay');
const aiPaymentCancel = document.getElementById('aiPaymentCancel');
const aiFuturePrompt = document.getElementById('aiFuturePrompt');
const aiFutureName = document.getElementById('aiFutureName');
const aiPaymentAccept = document.getElementById('aiPaymentAccept');
const aiPaymentNotice = document.getElementById('aiPaymentNotice');
const aiFutureFile = document.getElementById('aiFutureFile');
const aiFutureFileName = document.getElementById('aiFutureFileName');

function openAIPaymentModal(){
  if(!aiPaymentOverlay) return;
  if(aiPaymentNotice) aiPaymentNotice.classList.remove('show');
  if(aiFuturePrompt) aiFuturePrompt.value = '';
  if(aiFutureName) aiFutureName.value = '';
  if(aiFutureFile) aiFutureFile.value = '';
  if(aiFutureFileName) aiFutureFileName.textContent = 'Ningún archivo seleccionado.';
  aiPaymentOverlay.classList.remove('hidden');
}

function closeAIPaymentModal(){
  if(aiPaymentOverlay) aiPaymentOverlay.classList.add('hidden');
}

aiCaseHeaderBtns.forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    openAIPaymentModal();
  });
});

if(aiPaymentCancel){
  aiPaymentCancel.addEventListener('click', closeAIPaymentModal);
}

if(aiFutureFile){
  aiFutureFile.addEventListener('change', ()=>{
    const file = aiFutureFile.files?.[0];
    if(aiFutureFileName){
      aiFutureFileName.textContent = file
        ? `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`
        : 'Ningún archivo seleccionado.';
    }
  });
}

if(aiPaymentAccept){
  aiPaymentAccept.addEventListener('click', ()=>{
    if(aiPaymentNotice) aiPaymentNotice.classList.add('show');
  });
}

if(aiPaymentOverlay){
  aiPaymentOverlay.addEventListener('pointerdown', (e)=>{
    if(e.target === aiPaymentOverlay) closeAIPaymentModal();
  });
}

async function bootstrapApp(){
  try{
    await loadStore();
  }catch(error){
    console.error('ERROR INICIALIZANDO MINDPLACE:', error);
    renderMenu();
  }

  // La demo debe sembrarse DESPUÉS de terminar la carga/persistencia.
  // Así evitamos que una carga asíncrona pueda sobrescribir el caso Peluquería.
  try{
    seedPeluqueriaDemo(store, {
      saveStore,
      renderMenu,
      render,
      getCurrentCaseId: () => currentCaseId,
      setState: (nextState) => { state = nextState; }
    });
  }catch(error){
    console.error('ERROR CARGANDO LA DEMO DE PELUQUERÍA:', error);
  }
}

bootstrapApp();

