export function createTouchGestureManager({ getContext }) {
  let pointers = new Map();
  let mode = 'idle';
  let pinchStartDistance = 1;
  let pinchStartZoom = 1;
  let pinchStartMidX = 0;
  let pinchStartMidY = 0;
  let pinchStartScrollLeft = 0;
  let pinchStartScrollTop = 0;
  let lastMidX = 0;
  let lastMidY = 0;
  let singleStartX = 0;
  let singleStartY = 0;
  let singleStartAt = 0;
  let singleTarget = null;
  let longPressTimer = 0;
  let longPressId = null;
  let longPressStartX = 0;
  let longPressStartY = 0;

  const distance = (a,b) => Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
  const midpoint = (a,b) => ({ x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 });

  function enabled(){
    return getContext().advancedGesturesEnabled?.() !== false;
  }

  function haptic(ms = 8){
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && typeof nav.vibrate === 'function') nav.vibrate(ms);
    } catch {}
  }

  function setMode(next){
    mode = next;
    const boardEl = getContext().boardEl;
    const body = document.body;
    ['gesture-pinch','gesture-pan','gesture-longpress','gesture-swipe'].forEach(cls => body.classList.toggle(cls, next !== 'idle' && cls === `gesture-${next}`));
    if (boardEl) boardEl.dataset.gestureMode = next;
  }

  function blockedTarget(target){
    if (!(target instanceof Element)) return false;
    return !!target.closest('.card input,.card textarea,.card select,.card button,.plus-menu,.edge-inspector,#historyPanel,#caseSummaryBox,#caseExportBox,#caseImportBox,#newCaseBox,#confirmBox,#aiPaymentBox,#trashBox,#themeMenu,#boardNavMenu,#miniMap');
  }

  function cancelLongPress(){
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
    longPressId = null;
  }

  function beginLongPress(pointerId, target, x, y){
    if (!enabled() || blockedTarget(target)) return;
    const card = target instanceof Element ? target.closest('.card') : null;
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    cancelLongPress();
    longPressId = pointerId;
    longPressStartX = x;
    longPressStartY = y;
    longPressTimer = window.setTimeout(() => {
      longPressTimer = 0;
      if (!pointers.has(pointerId) || pointers.size !== 1) return;
      const ctx = getContext();
      ctx.selectCard?.(id);
      ctx.centerSelected?.();
      card.classList.add('long-pressed');
      setMode('longpress');
      haptic(12);
      window.setTimeout(() => { card.classList.remove('long-pressed'); setMode('idle'); }, 280);
    }, 540);
  }

  function beginPinch(){
    if (!enabled() || pointers.size !== 2) return false;
    const items=[...pointers.values()];
    if (items.some(p => blockedTarget(p.target))) return false;
    const ctx=getContext();
    const [a,b]=items;
    const mid=midpoint(a,b);
    pinchStartDistance=Math.max(1,distance(a,b));
    pinchStartZoom=ctx.getZoomLevel();
    pinchStartMidX=mid.x; pinchStartMidY=mid.y;
    lastMidX=mid.x; lastMidY=mid.y;
    pinchStartScrollLeft=ctx.boardEl.scrollLeft;
    pinchStartScrollTop=ctx.boardEl.scrollTop;
    mode='pinch';
    setMode('pinch');
    cancelLongPress();
    ctx.boardPanning=false;
    haptic(4);
    return true;
  }

  function updatePinch(){
    if (mode !== 'pinch' || pointers.size < 2) return;
    const ctx=getContext();
    const [a,b]=[...pointers.values()];
    const dist=Math.max(1,distance(a,b));
    const mid=midpoint(a,b);
    const ratio=dist/pinchStartDistance;
    const next=Math.min(ctx.ZOOM_MAX, Math.max(ctx.ZOOM_MIN, pinchStartZoom*ratio));
    const rect=ctx.zoomWrap.getBoundingClientRect();
    const anchorX=(pinchStartMidX-rect.left)/Math.max(pinchStartZoom,0.0001);
    const anchorY=(pinchStartMidY-rect.top)/Math.max(pinchStartZoom,0.0001);
    ctx.setZoomLevel(next);
    ctx.zoomWrap.style.transformOrigin=`${anchorX}px ${anchorY}px`;
    ctx.applyZoom();
    const deltaMidX=mid.x-lastMidX;
    const deltaMidY=mid.y-lastMidY;
    ctx.boardEl.scrollLeft -= deltaMidX;
    ctx.boardEl.scrollTop -= deltaMidY;
    lastMidX=mid.x; lastMidY=mid.y;
    ctx.drawStrings();
    ctx.applyParallax?.();
    ctx.scheduleMiniMap?.();
  }

  function endPinch(){
    if(mode !== 'pinch') return;
    const ctx=getContext();
    setMode('idle');
    ctx.boardEl.style.cursor='';
    ctx.saveNavigation?.();
  }

  function beginSwipe(pointerId, x, y, target){
    singleStartX=x; singleStartY=y; singleStartAt=performance.now(); singleTarget=target;
    longPressId=pointerId;
    beginLongPress(pointerId,target,x,y);
  }

  function finishSwipe(pointerId, x, y){
    cancelLongPress();
    if (!enabled() || pointers.size !== 0 || pointerId !== longPressId) return false;
    // Un arrastre de tarjeta, edición o control siempre tiene prioridad sobre swipe.
    if (singleTarget instanceof Element && singleTarget.closest('.card,.plus-menu,button,input,textarea,select,[contenteditable="true"],#miniMap')) return false;
    const dx=x-singleStartX, dy=y-singleStartY, dt=performance.now()-singleStartAt;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy)*1.25 || dt > 650) return false;
    const ctx=getContext();
    if (ctx.linkMode?.()) return false;
    setMode('swipe');
    haptic(8);
    ctx.moveConnected?.(dx < 0 ? 1 : -1);
    window.setTimeout(()=>setMode('idle'),180);
    return true;
  }

  function onPointerDown(e){
    if(e.pointerType !== 'touch') return;
    const ctx=getContext();
    const inside = e.target === ctx.boardEl || (e.target instanceof Element && e.target.closest('#board'));
    if(!inside) return;
    if(!enabled()) return;
    pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,target:e.target});
    if(pointers.size===1){
      singleTarget=e.target;
      beginSwipe(e.pointerId,e.clientX,e.clientY,e.target);
    }
    if(pointers.size===2){
      if(beginPinch()){ e.preventDefault(); e.stopPropagation(); }
    }
  }

  function onPointerMove(e){
    if(e.pointerType !== 'touch' || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY,target:e.target});
    if(longPressId===e.pointerId && Math.hypot(e.clientX-longPressStartX,e.clientY-longPressStartY)>12) cancelLongPress();
    if(mode==='pinch'){ e.preventDefault(); updatePinch(); e.stopPropagation(); return; }
  }

  function onPointerUp(e){
    if(e.pointerType !== 'touch' || !pointers.has(e.pointerId)) return;
    const before=pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(mode==='pinch' && pointers.size<2){ endPinch(); }
    const didSwipe=finishSwipe(e.pointerId,e.clientX,e.clientY);
    if(didSwipe){ e.preventDefault(); e.stopPropagation(); }
    if(pointers.size===0){ if(mode!=='longpress' && mode!=='swipe') setMode('idle'); }
    return before;
  }

  function onPointerCancel(e){
    if(e.pointerType !== 'touch') return;
    pointers.delete(e.pointerId);
    cancelLongPress();
    if(mode==='pinch') endPinch();
    if(pointers.size===0) setMode('idle');
  }

  function install(){
    const ctx=getContext();
    ctx.boardEl.addEventListener('pointerdown',onPointerDown,{capture:true,passive:false});
    ctx.boardEl.addEventListener('pointermove',onPointerMove,{capture:true,passive:false});
    ctx.boardEl.addEventListener('pointerup',onPointerUp,{capture:true,passive:false});
    ctx.boardEl.addEventListener('pointercancel',onPointerCancel,{capture:true,passive:false});
    return () => {
      cancelLongPress();
      ctx.boardEl.removeEventListener('pointerdown',onPointerDown,true);
      ctx.boardEl.removeEventListener('pointermove',onPointerMove,true);
      ctx.boardEl.removeEventListener('pointerup',onPointerUp,true);
      ctx.boardEl.removeEventListener('pointercancel',onPointerCancel,true);
      pointers.clear();
      setMode('idle');
    };
  }

  return { install, getMode: () => mode };
}
