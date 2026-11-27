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
    setOverlayState(true);
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
    setOverlayState(true);
    focusName();
  }

  function closeNewCaseModal() {
    setOverlayState(false);
    setEditingCaseId(null);
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

  return {
    openNewCaseModal,
    openEditCaseModal,
    closeNewCaseModal,
    acceptCaseModal
  };
}
