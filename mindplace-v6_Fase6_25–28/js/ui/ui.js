export function showSaveWarning() {
  let el = document.getElementById('saveWarning');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saveWarning';
    el.textContent = '⚠ No se ha podido guardar el último cambio. Reintentando...';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  clearTimeout(window.__saveWarningTimer);
  window.__saveWarningTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

export function showRecoveryNotice(message) {
  let el = document.getElementById('recoveryNotice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'recoveryNotice';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__recoveryNoticeTimer);
  window.__recoveryNoticeTimer = setTimeout(() => el.classList.remove('show'), 6500);
}

export function askConfirm(message, yesLabel = 'Eliminar') {
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmMsg = document.getElementById('confirmMsg');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

  if (!confirmOverlay || !confirmMsg || !confirmYes || !confirmNo) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    confirmMsg.textContent = message;
    const previousYesLabel = confirmYes.textContent;
    confirmYes.textContent = yesLabel;
    confirmOverlay.classList.remove('hidden');

    function cleanup(result) {
      confirmOverlay.classList.add('hidden');
      confirmYes.removeEventListener('click', onYes);
      confirmNo.removeEventListener('click', onNo);
      confirmYes.textContent = previousYesLabel;
      resolve(result);
    }

    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }

    confirmYes.addEventListener('click', onYes);
    confirmNo.addEventListener('click', onNo);
  });
}
