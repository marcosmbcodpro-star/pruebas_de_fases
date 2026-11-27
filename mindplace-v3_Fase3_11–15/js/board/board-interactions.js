export function createBoardInteractions({ getContext }) {
  function getPathFocusIds(id) {
    const { state } = getContext();
    const ids = new Set();
    if (!id) return ids;

    const queue = [id];
    ids.add(id);

    while (queue.length) {
      const current = queue.shift();
      if (current === '__case__') continue;

      state.edges.forEach(edge => {
        let next = null;
        if (edge.a === current) next = edge.b;
        else if (edge.b === current) next = edge.a;

        if (next && !ids.has(next)) {
          ids.add(next);
          queue.push(next);
        }
      });
    }

    return ids;
  }

  function applyConnectionFocus() {
    const { boardEl, selectedCardId, setConnectionFocusIds, drawStrings } = getContext();
    const active = !!selectedCardId;
    boardEl.classList.toggle('has-connection-focus', active);
    const connectionFocusIds = active ? getPathFocusIds(selectedCardId) : new Set();
    setConnectionFocusIds(connectionFocusIds);

    document.querySelectorAll('.card').forEach(c => {
      const id = c.dataset.id;
      c.classList.toggle('selected', active && id === selectedCardId);
      c.classList.toggle('connection-focus', active && connectionFocusIds.has(id));
    });

    const caseMarker = document.querySelector('.case-marker');
    if (caseMarker) {
      caseMarker.classList.toggle('selected', active && selectedCardId === '__case__');
      caseMarker.classList.toggle('connection-focus', active && connectionFocusIds.has('__case__'));
    }

    drawStrings();
  }

  function selectCard(id) {
    const { setSelectedCardId } = getContext();
    setSelectedCardId(id);
    applyConnectionFocus();
  }

  function clearSelection() {
    const { boardEl, selectedCardId, setSelectedCardId } = getContext();
    if (!selectedCardId && !boardEl.classList.contains('has-connection-focus')) return;
    setSelectedCardId(null);
    applyConnectionFocus();
  }

  function handleLinkClick(id, card) {
    const { linkSrc, setLinkSrc, linkOneShot, setLinkOneShot, setLinkMode, boardEl, addEdge, save, drawStrings } = getContext();
    if (!linkSrc) {
      setLinkSrc(id);
      card.classList.add('linking-src');
      return;
    }

    addEdge(linkSrc, id);
    setLinkSrc(null);
    if (linkOneShot) {
      setLinkOneShot(false);
      setLinkMode(false);
      boardEl.style.cursor = 'default';
      const toolLinkBtn = document.querySelector('.tool.link');
      if (toolLinkBtn) toolLinkBtn.classList.remove('active');
    }
  }

  function startLinkFrom(sourceId, cardEl) {
    const { boardEl, setLinkMode, setLinkSrc, setLinkOneShot } = getContext();
    setLinkMode(true);
    setLinkSrc(sourceId);
    setLinkOneShot(true);
    document.querySelectorAll('.card').forEach(c => c.classList.remove('linking-src'));
    cardEl.classList.add('linking-src');
    boardEl.style.cursor = 'crosshair';
    const toolLinkBtn = document.querySelector('.tool.link');
    if (toolLinkBtn) toolLinkBtn.classList.add('active');
  }

  function startDrag(e, node, card) {
    const context = getContext();
    const { linkMode, selectCard, pushUndo, getZoomLevel, drawStrings, scheduleMiniMap, save } = context;
    if (linkMode) return;
    e.preventDefault();
    e.stopPropagation();

    selectCard(node.id);

    const startX = e.clientX, startY = e.clientY;
    const origX = node.x, origY = node.y;
    card.classList.add('dragging');
    if (card.setPointerCapture && e.pointerId !== undefined) {
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    }

    let finished = false;
    let movedSnapshotTaken = false;
    let dragFrame = 0;
    let latestEvent = e;

    const applyLatestPosition = () => {
      dragFrame = 0;
      if (finished || !latestEvent) return;
      if (!movedSnapshotTaken) { movedSnapshotTaken = true; pushUndo(); }
      const rawX = origX + (latestEvent.clientX - startX) / getZoomLevel();
      const rawY = origY + (latestEvent.clientY - startY) / getZoomLevel();
      node.x = rawX;
      node.y = rawY;
      card.style.left = rawX + 'px';
      card.style.top = rawY + 'px';
      drawStrings();
      scheduleMiniMap();
    };

    function onMove(ev) {
      if (finished) return;
      latestEvent = ev;
      if (!dragFrame) dragFrame = requestAnimationFrame(applyLatestPosition);
    }

    function finishDrag() {
      if (finished) return;
      finished = true;
      if (dragFrame) {
        cancelAnimationFrame(dragFrame);
        dragFrame = 0;
      }
      if (latestEvent) {
        const rawX = origX + (latestEvent.clientX - startX) / getZoomLevel();
        const rawY = origY + (latestEvent.clientY - startY) / getZoomLevel();
        node.x = rawX;
        node.y = rawY;
        card.style.left = rawX + 'px';
        card.style.top = rawY + 'px';
      }
      card.classList.remove('dragging');
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerup', finishDrag);
      card.removeEventListener('pointercancel', finishDrag);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', finishDrag);
      scheduleMiniMap();
      drawStrings();
      save();
    }

    if (window.PointerEvent) {
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerup', finishDrag);
      card.addEventListener('pointercancel', finishDrag);
    } else {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', finishDrag);
    }
  }

  function addResizeHandle(cardEl, sizeObj, minW, minH){
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.title = 'Arrastra para cambiar el tamaño';
    handle.setAttribute('role','button');
    handle.setAttribute('aria-label','Cambiar tamaño');
    handle.innerHTML = '<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="pointer-events:none">' +
      '<line x1="2" y1="12" x2="12" y2="2"/>' +
      '<line x1="2" y1="8" x2="8" y2="2"/>' +
      '<line x1="2" y1="4" x2="4" y2="2"/>' +
      '</svg>';

    if(sizeObj.width) cardEl.style.width = sizeObj.width + 'px';
    if(sizeObj.height) cardEl.style.height = sizeObj.height + 'px';

    let active = false;
    let startX = 0, startY = 0, startW = 0, startH = 0, startPosX = 0, startPosY = 0;
    let moved = false;

    function getBoardSize(){
      const { zoomWrap } = getContext();
      return {
        w: zoomWrap?.offsetWidth || 4200,
        h: zoomWrap?.offsetHeight || 3000
      };
    }

    function move(ev){
      if(!active) return;
      const { getZoomLevel, drawStrings, updateMiniMap } = getContext();
      const dx = (ev.clientX - startX) / (getZoomLevel() || 1);
      const dy = (ev.clientY - startY) / (getZoomLevel() || 1);
      if(Math.abs(dx) + Math.abs(dy) > 0.5) moved = true;

      const {w:boardW, h:boardH} = getBoardSize();
      const maxW = Math.max(minW, Math.min(boardW, startPosX + startW));
      const maxH = Math.max(minH, Math.min(boardH, boardH - startPosY));
      const newW = Math.min(maxW, Math.max(minW, startW - dx));
      const newH = Math.min(maxH, Math.max(minH, startH + dy));
      const newX = startPosX - (newW - startW);

      sizeObj.x = Math.min(Math.max(0, newX), Math.max(0, boardW - newW));
      sizeObj.y = Math.min(Math.max(0, startPosY), Math.max(0, boardH - newH));
      sizeObj.width = newW;
      sizeObj.height = newH;

      cardEl.style.width = newW + 'px';
      cardEl.style.height = newH + 'px';
      cardEl.style.left = sizeObj.x + 'px';
      cardEl.style.top = sizeObj.y + 'px';
      cardEl.classList.add('resizing');
      drawStrings();
      if(typeof updateMiniMap === 'function') updateMiniMap();

      if(ev.cancelable) ev.preventDefault();
      ev.stopPropagation?.();
    }

    function finish(){
      if(!active) return;
      active = false;
      cardEl.classList.remove('resizing');
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', finish, true);
      document.removeEventListener('pointercancel', finish, true);
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', finish, true);
      document.removeEventListener('touchmove', touchMove, true);
      document.removeEventListener('touchend', touchFinish, true);
      document.documentElement.classList.remove('synapse-resizing');
      if(moved){
        getContext().save();
      }
    }

    function start(clientX, clientY, pointerType='mouse', originalEvent=null){
      if(active) return;
      if(getContext().linkMode) return;
      active = true;
      moved = false;
      startX = clientX;
      startY = clientY;
      startW = cardEl.offsetWidth;
      startH = cardEl.offsetHeight;
      startPosX = sizeObj.x || 0;
      startPosY = sizeObj.y || 0;
      getContext().pushUndo();
      document.documentElement.classList.add('synapse-resizing');
      if(originalEvent){
        originalEvent.preventDefault?.();
        originalEvent.stopPropagation?.();
      }
      document.addEventListener('pointermove', move, true);
      document.addEventListener('pointerup', finish, true);
      document.addEventListener('pointercancel', finish, true);
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', finish, true);
      if(originalEvent?.pointerId !== undefined && handle.setPointerCapture){
        try{ handle.setPointerCapture(originalEvent.pointerId); }catch(err){}
      }
    }

    function touchMove(e){
      const t=e.touches && e.touches[0];
      if(t) move({clientX:t.clientX, clientY:t.clientY, preventDefault:()=>e.preventDefault(), stopPropagation:()=>e.stopPropagation()});
    }
    function touchFinish(){ finish(); }

    const beginPointer = (e)=>{
      if(e.button !== undefined && e.button !== 0) return;
      start(e.clientX, e.clientY, e.pointerType || 'mouse', e);
    };
    const beginMouse = (e)=>{
      if(e.button !== 0) return;
      start(e.clientX, e.clientY, 'mouse', e);
    };
    const beginTouch = (e)=>{
      const t=e.touches && e.touches[0];
      if(!t) return;
      start(t.clientX, t.clientY, 'touch', e);
      document.addEventListener('touchmove', touchMove, {capture:true, passive:false});
      document.addEventListener('touchend', touchFinish, true);
    };

    handle.addEventListener('pointerdown', beginPointer, {capture:true, passive:false});
    handle.addEventListener('mousedown', beginMouse, {capture:true, passive:false});
    handle.addEventListener('touchstart', beginTouch, {capture:true, passive:false});

    // Protección adicional: si algún elemento interno o una capa intercepta
    // el evento, la propia tarjeta detecta que el puntero está sobre el asa.
    cardEl.addEventListener('pointerdown', (e)=>{
      const target = e.target instanceof Element ? e.target.closest('.resize-handle') : null;
      if(target === handle){
        beginPointer(e);
      }
    }, true);

    cardEl.appendChild(handle);
  }


  return {
    getPathFocusIds,
    applyConnectionFocus,
    selectCard,
    clearSelection,
    handleLinkClick,
    startLinkFrom,
    startDrag,
    addResizeHandle
  };
}
