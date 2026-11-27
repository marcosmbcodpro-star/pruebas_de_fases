// MindPlace — Fase 20: edición y formularios móviles.
// Capa agnóstica de la interfaz que protege el foco, adapta la ventana
// cuando aparece el teclado, conserva borradores transitorios y acelera
// la edición/creación de elementos sin acoplarse al modelo de datos.

const DRAFT_PREFIX = 'mindplace-mobile-edit-draft:';
const DRAFT_TTL = 1000 * 60 * 30;

function isTextEditable(el){
  if(!(el instanceof HTMLElement)) return false;
  if(el.isContentEditable) return true;
  if(el.tagName === 'TEXTAREA') return true;
  if(el.tagName !== 'INPUT') return false;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  return !['button','checkbox','color','date','datetime-local','file','hidden','image','radio','range','reset','submit','time','month','week'].includes(type);
}

function shouldHandleEditable(el){
  if(!(el instanceof HTMLElement) || !isTextEditable(el)) return false;
  if(el.closest('#caseSearchPanel, #caseFilterPanel, #caseStructurePanel, #settingsOverlay, #helpPanel')) return el.isContentEditable === true;
  if(el.closest('.card, #newCaseBox, #edgeInspector, #settingsBox')) return true;
  if(el.id === 'caseTitle') return true;
  return el.isContentEditable === true;
}

function getEditableKey(el, currentCaseId){
  if(!(el instanceof HTMLElement)) return null;
  const explicit = el.dataset.mobileDraftKey;
  if(explicit) return `${currentCaseId || 'global'}:${explicit}`;
  if(el.id) return `${currentCaseId || 'global'}:id:${el.id}`;
  const card = el.closest('[data-id]');
  const cardId = card?.dataset?.id || '';
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0,3).join('.') : el.tagName.toLowerCase();
  return `${currentCaseId || 'global'}:${cardId || 'global'}:${cls || el.tagName.toLowerCase()}`;
}

function textValue(el){
  if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
  return el.textContent || '';
}

function setTextValue(el, value){
  if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement){
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles:true }));
  } else if(el.isContentEditable){
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:null }));
  }
}

function createMobileEditingController({
  getCurrentCaseId = () => null,
  scheduleSave = () => {},
  save = () => Promise.resolve(false),
  quickCreate = null
} = {}){
  let activeEditable = null;
  let activeKey = null;
  let restoreTimer = 0;
  let draftWriteTimer = 0;
  let toolbar = null;
  let lastSavedFocusKey = null;

  const storageKey = key => DRAFT_PREFIX + encodeURIComponent(key);

  function writeDraft(el = activeEditable){
    if(!el || !shouldHandleEditable(el)) return;
    const caseId = getCurrentCaseId() || null;
    const key = getEditableKey(el, caseId);
    if(!key) return;
    const value = textValue(el);
    try{
      sessionStorage.setItem(storageKey(key), JSON.stringify({key, caseId, value, updatedAt:Date.now()}));
    }catch(_){ /* sessionStorage puede estar bloqueado */ }
    activeKey = key;
  }

  function writeDraftSoon(){
    clearTimeout(draftWriteTimer);
    draftWriteTimer = setTimeout(()=>writeDraft(), 120);
  }

  function readDraft(key){
    if(!key) return null;
    try{
      const raw = sessionStorage.getItem(storageKey(key));
      if(!raw) return null;
      const draft = JSON.parse(raw);
      if(!draft || typeof draft.value !== 'string' || !Number.isFinite(Number(draft.updatedAt))) return null;
      if(Date.now() - Number(draft.updatedAt) > DRAFT_TTL){ sessionStorage.removeItem(storageKey(key)); return null; }
      return draft;
    }catch(_){ return null; }
  }

  function clearDraft(key = activeKey){
    if(!key) return;
    try{ sessionStorage.removeItem(storageKey(key)); }catch(_){ }
  }

  function focusVisible(el){
    if(!(el instanceof HTMLElement)) return;
    window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(()=>{
      try{ el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'}); }
      catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    }, 70);
  }

  function ensureTextAreaSize(el){
    if(!(el instanceof HTMLTextAreaElement)) return;
    el.style.height = 'auto';
    const max = Math.max(150, Math.floor(window.innerHeight * 0.48));
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }

  function updateViewportInsets(){
    const vv = window.visualViewport;
    const height = vv?.height || window.innerHeight;
    const offsetTop = vv?.offsetTop || 0;
    const inset = Math.max(0, Math.round(window.innerHeight - height - offsetTop));
    document.documentElement.style.setProperty('--mp-keyboard-inset', `${inset}px`);
    document.documentElement.style.setProperty('--mp-viewport-height', `${Math.round(height)}px`);
    if(activeEditable && isTextEditable(activeEditable)) focusVisible(activeEditable);
  }

  function findEditableByKey(key){
    if(!key) return null;
    const all = document.querySelectorAll('input,textarea,[contenteditable="true"]');
    for(const el of all){
      if(getEditableKey(el, getCurrentCaseId()) === key) return el;
    }
    return null;
  }

  function maybeRestoreDraft(el){
    const key = getEditableKey(el, getCurrentCaseId());
    if(!key) return;
    const draft = readDraft(key);
    if(!draft || draft.value === textValue(el)) return;

    // Solo recuperamos automáticamente un borrador cuando el control está vacío
    // o cuando el valor actual no parece contener una edición más reciente.
    const current = textValue(el);
    if(current && current.trim() !== '') return;
    setTextValue(el, draft.value);
    try{ el.setSelectionRange?.(el.value.length, el.value.length); }catch(_){ }
  }

  function ensureToolbar(){
    if(toolbar) return toolbar;
    toolbar = document.createElement('div');
    toolbar.id = 'mobileEditToolbar';
    toolbar.className = 'mobile-edit-toolbar';
    toolbar.setAttribute('aria-label','Acciones rápidas de edición');
    toolbar.hidden = true;

    const status = document.createElement('span');
    status.className = 'mobile-edit-toolbar-status';
    status.textContent = 'Editando';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'mobile-edit-toolbar-save';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', async ()=>{
      writeDraft();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando…';
      try{
        const ok = await save();
        saveBtn.textContent = ok === false ? 'Reintentar' : 'Guardado';
        if(ok !== false) clearDraft();
      }finally{
        window.setTimeout(()=>{
          saveBtn.disabled = false;
          saveBtn.textContent = 'Guardar';
        }, 900);
      }
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'mobile-edit-toolbar-add';
    addBtn.textContent = '+ Nota';
    addBtn.hidden = typeof quickCreate !== 'function';
    addBtn.addEventListener('click', async ()=>{
      if(typeof quickCreate !== 'function') return;
      await quickCreate('note');
    });

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'mobile-edit-toolbar-done';
    doneBtn.textContent = 'Listo';
    doneBtn.addEventListener('click', ()=>{
      const el = activeEditable;
      writeDraft(el);
      el?.blur();
      save();
    });

    toolbar.append(status, saveBtn, addBtn, doneBtn);
    document.body.appendChild(toolbar);
    return toolbar;
  }

  function showToolbar(el){
    const bar = ensureToolbar();
    const status = bar.querySelector('.mobile-edit-toolbar-status');
    if(status){
      const label = el?.closest('.card')?.querySelector('.label')?.textContent?.trim();
      status.textContent = label ? `Editando · ${label}` : 'Editando';
    }
    bar.hidden = false;
    bar.classList.add('show');
    requestAnimationFrame(()=>bar.style.setProperty('--mp-toolbar-bottom', 'calc(var(--mp-keyboard-inset, 0px) + 8px)'));
  }

  function hideToolbar(){
    if(!toolbar) return;
    toolbar.classList.remove('show');
    toolbar.hidden = true;
  }

  function onFocusIn(event){
    const el = event.target;
    if(!shouldHandleEditable(el)) return;
    activeEditable = el;
    activeKey = getEditableKey(el, getCurrentCaseId());
    document.body.classList.add('mobile-editing-mode');
    el.classList.add('mobile-editing-active');
    maybeRestoreDraft(el);
    ensureTextAreaSize(el);
    focusVisible(el);
    showToolbar(el);
  }

  function onInput(event){
    const el = event.target;
    if(!shouldHandleEditable(el)) return;
    activeEditable = el;
    activeKey = getEditableKey(el, getCurrentCaseId());
    ensureTextAreaSize(el);
    writeDraftSoon();
    scheduleSave();
  }

  function onChange(event){
    const el = event.target;
    if(!shouldHandleEditable(el)) return;
    writeDraft(el);
    scheduleSave();
  }

  function onFocusOut(event){
    const el = event.target;
    if(el !== activeEditable) return;
    writeDraft(el);
    el.classList.remove('mobile-editing-active');
    // El borrador temporal se conserva un poco para sobrevivir a un render
    // inmediato; después del guardado normal se elimina del almacenamiento de sesión.
    window.setTimeout(()=>{
      if(document.activeElement !== el && lastSavedFocusKey !== activeKey) clearDraft(activeKey);
    }, 1800);
    save();
    hideToolbar();
    document.body.classList.remove('mobile-editing-mode');
    document.body.classList.remove('mindplace-mobile-mode');
    activeEditable = null;
  }

  async function flushBeforeLeave(){
    writeDraft();
    try{ await save(); }catch(_){ }
  }

  function restoreAfterViewportChange(){
    window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(()=>{
      if(activeEditable && document.contains(activeEditable)) focusVisible(activeEditable);
      else if(activeKey){
        const replacement = findEditableByKey(activeKey);
        if(replacement){
          activeEditable = replacement;
          replacement.classList.add('mobile-editing-active');
          maybeRestoreDraft(replacement);
          replacement.focus({preventScroll:true});
          focusVisible(replacement);
          showToolbar(replacement);
        }
      }
      updateViewportInsets();
    }, 180);
  }

  function onPaste(event){
    const el = event.target;
    if(!isTextEditable(el)) return;
    const text = event.clipboardData?.getData('text/plain');
    if(typeof text !== 'string') return;
    event.preventDefault();
    const cleaned = text.replace(/\u0000/g,'').replace(/\r\n?/g,'\n');
    if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement){
      try{ el.setRangeText(cleaned, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'end'); }
      catch(_){ el.value += cleaned; }
      el.dispatchEvent(new Event('input',{bubbles:true}));
      return;
    }
    // `insertText` conserva el historial nativo mejor que reemplazar innerHTML.
    const inserted = document.execCommand?.('insertText', false, cleaned);
    if(!inserted){
      const sel = window.getSelection();
      if(sel && sel.rangeCount){
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(cleaned));
        range.collapse(false);
        sel.removeAllRanges(); sel.addRange(range);
      }
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:cleaned}));
    }
    writeDraft(el);
    scheduleSave();
  }

  function onKeyDown(event){
    const el = event.target;
    if(!isTextEditable(el)) return;
    if(event.key === 'Escape'){
      event.preventDefault();
      el.blur();
      return;
    }
    // En móvil, Enter mantiene el comportamiento del campo salvo en el nombre
    // del caso, que ya dispone de su propia lógica de aceptación.
  }

  function updateMobileMode(){
    const mobile = window.matchMedia?.('(max-width: 820px)').matches === true || (navigator.maxTouchPoints || 0) > 0;
    document.body.classList.toggle('mindplace-mobile-mode', mobile);
  }

  function install(){
    updateMobileMode();
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', restoreAfterViewportChange, {passive:true});
    window.addEventListener('resize', updateMobileMode, {passive:true});
    window.addEventListener('orientationchange', restoreAfterViewportChange, {passive:true});
    window.addEventListener('pagehide', flushBeforeLeave, {passive:true});
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'hidden') flushBeforeLeave();
      else restoreAfterViewportChange();
    });
    window.visualViewport?.addEventListener('resize', updateViewportInsets, {passive:true});
    window.visualViewport?.addEventListener('scroll', updateViewportInsets, {passive:true});
    updateViewportInsets();

    // Inyecta etiquetas de edición rápida sin exigir cambios en los componentes legacy.
    document.addEventListener('click', event=>{
      const quick = event.target?.closest?.('[data-mobile-quick-edit]');
      if(!quick) return;
      const selector = quick.getAttribute('data-mobile-quick-edit');
      if(!selector) return;
      const root = quick.closest('.card, #newCaseBox, #edgeInspector, #caseSearchPanel');
      const target = root?.querySelector(selector) || document.querySelector(selector);
      if(target && shouldHandleEditable(target)){
        event.preventDefault(); event.stopPropagation();
        target.focus({preventScroll:true});
        focusVisible(target);
      }
    });
    return api;
  }

  function dispose(){
    document.body.classList.remove('mobile-editing-mode');
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('change', onChange, true);
    document.removeEventListener('focusout', onFocusOut, true);
    document.removeEventListener('paste', onPaste, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', restoreAfterViewportChange);
    window.removeEventListener('resize', updateMobileMode);
    window.removeEventListener('orientationchange', restoreAfterViewportChange);
    toolbar?.remove(); toolbar = null;
  }

  const api = {
    install,
    dispose,
    flushBeforeLeave,
    focusVisible,
    updateViewportInsets,
    writeDraft,
    clearDraft
  };
  return api;
}

export { createMobileEditingController, isTextEditable, getEditableKey };
