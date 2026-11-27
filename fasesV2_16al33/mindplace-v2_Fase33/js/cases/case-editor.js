// Fase 3 - gestión del formulario de creación/edición de casos.
// No modifica el formato de datos ni la funcionalidad visible; recibe las
// dependencias desde app.js para evitar acoplamiento directo al estado global.

export function createCaseEditor({
  overlay,
  titleEl,
  nameEl,
  descEl,
  statusEl,
  categoryEl,
  acceptBtn,
  cancelBtn,
  getEditingCaseId,
  setEditingCaseId,
  updateCaseMeta,
  createCase
}) {
  if (!overlay) return null;

  // El overlay puede abrirse/cerrarse muchas veces. Cuando está cerrado no debe
  // exponer ni mantener el foco de sus controles a tecnologías asistivas.
  // `inert` impide además que el foco vuelva accidentalmente al diálogo oculto.
  let lastFocusedElement = null;
  let mobileStep = 0;
  let mobileStepActions = null;
  let mobileSteps = [];

  function setupMobileSteps(){
    if(!overlay) return;
    const box = overlay.querySelector('#newCaseBox');
    if(!box) return;
    const fields = [nameEl, descEl, statusEl, categoryEl]
      .map(el => el?.closest?.('.field'))
      .filter(Boolean);
    if(fields.length < 4) return;
    mobileSteps = [fields.slice(0,2), fields.slice(2)];
    if(!mobileStepActions){
      mobileStepActions = document.createElement('div');
      mobileStepActions.className = 'mobile-form-step-actions';
      mobileStepActions.setAttribute('aria-label','Pasos del formulario');
      const back = document.createElement('button');
      back.type = 'button'; back.className = 'mobile-form-step-back'; back.textContent = 'Atrás';
      const next = document.createElement('button');
      next.type = 'button'; next.className = 'mobile-form-step-next'; next.textContent = 'Siguiente';
      back.addEventListener('click',()=>setMobileStep(mobileStep-1));
      next.addEventListener('click',()=>setMobileStep(mobileStep+1));
      mobileStepActions.append(back,next);
      box.insertBefore(mobileStepActions, box.querySelector('.actions'));
    }
    applyMobileStep();
  }

  function setMobileStep(nextStep){
    mobileStep = Math.max(0, Math.min(1, Number(nextStep) || 0));
    applyMobileStep();
    const target = mobileStep === 0 ? nameEl : statusEl;
    setTimeout(()=>target?.focus?.({preventScroll:true}),30);
  }

  function applyMobileStep(){
    const isMobile = window.matchMedia?.('(max-width: 820px)').matches === true;
    if(!mobileSteps.length) return;
    mobileSteps.flat().forEach(field=>{
      field.classList.remove('mobile-step-hidden');
      field.removeAttribute('aria-hidden');
      field.inert = false;
    });
    if(!isMobile){
      if(mobileStepActions) mobileStepActions.hidden = true;
      return;
    }
    mobileSteps.forEach((fields,index)=>{
      fields.forEach(field=>{
        const hidden = index !== mobileStep;
        field.classList.toggle('mobile-step-hidden', hidden);
        field.setAttribute('aria-hidden', hidden ? 'true' : 'false');
        field.inert = hidden;
      });
    });
    if(mobileStepActions){
      mobileStepActions.hidden = false;
      const back = mobileStepActions.querySelector('.mobile-form-step-back');
      const next = mobileStepActions.querySelector('.mobile-form-step-next');
      if(back) back.disabled = mobileStep === 0;
      if(next){ next.hidden = mobileStep === 1; next.textContent = 'Siguiente'; }
      mobileStepActions.dataset.step = String(mobileStep + 1);
    }
  }

  function setOverlayState(isOpen) {
    if (isOpen) {
      const active = document.activeElement;
      lastFocusedElement = active instanceof HTMLElement && !overlay.contains(active)
        ? active
        : null;
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      overlay.inert = false;
      return;
    }

    // Primero sacamos el foco del contenido del diálogo y lo devolvemos al
    // elemento que abrió el modal; después ocultamos el overlay. Así nunca
    // queda un elemento enfocado dentro de un ancestro aria-hidden=true.
    if (overlay.contains(document.activeElement)) {
      document.activeElement?.blur();
    }

    const restoreTarget = lastFocusedElement;
    lastFocusedElement = null;

    overlay.inert = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.add('hidden');

    if (restoreTarget && document.contains(restoreTarget) && typeof restoreTarget.focus === 'function') {
      requestAnimationFrame(() => restoreTarget.focus());
    }
  }

  function focusName() {
    setTimeout(() => {
      if (!overlay.classList.contains('hidden')) nameEl?.focus();
    }, 30);
  }

  function openNewCaseModal() {
    setEditingCaseId(null);
    if (titleEl) titleEl.textContent = 'Nuevo caso';
    if (acceptBtn) acceptBtn.textContent = 'Aceptar';
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
    if (statusEl) statusEl.value = 'abierto';
    if (categoryEl) categoryEl.value = '';
    mobileStep = 0;
    setupMobileSteps();
    setOverlayState(true);
    applyMobileStep();
    focusName();
  }

  function openEditCaseModal(caseData) {
    if (!caseData) return;
    setEditingCaseId(caseData.id);
    if (titleEl) titleEl.textContent = 'Editar caso';
    if (acceptBtn) acceptBtn.textContent = 'Guardar';
    if (nameEl) nameEl.value = caseData.title || '';
    if (descEl) descEl.value = caseData.description || '';
    if (statusEl) statusEl.value = caseData.status || 'abierto';
    if (categoryEl) categoryEl.value = caseData.category || '';
    mobileStep = 0;
    setupMobileSteps();
    setOverlayState(true);
    applyMobileStep();
    focusName();
  }

  function closeNewCaseModal() {
    setOverlayState(false);
    setEditingCaseId(null);
    mobileStep = 0;
    applyMobileStep();
  }

  async function acceptCaseModal() {
    const title = nameEl?.value.trim() || 'CASO SIN TÍTULO';
    const description = descEl?.value.trim() || '';
    const status = statusEl?.value || 'abierto';
    const category = (categoryEl?.value || '').trim().slice(0, 40);
    const targetId = getEditingCaseId();

    closeNewCaseModal();

    if (targetId) {
      await updateCaseMeta(targetId, title, description, status, category);
    } else {
      await createCase(title, description, status, category);
    }
  }

  cancelBtn?.addEventListener('click', closeNewCaseModal);
  acceptBtn?.addEventListener('click', acceptCaseModal);
  nameEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      acceptBtn?.click();
    }
  });
  window.addEventListener('resize', applyMobileStep, { passive: true });

  return {
    openNewCaseModal,
    openEditCaseModal,
    closeNewCaseModal,
    acceptCaseModal
  };
}
