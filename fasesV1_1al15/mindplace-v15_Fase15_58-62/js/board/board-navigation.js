export function createBoardNavigation({ getContext }) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function nodesById() {
    const { state } = getContext();
    const map = new Map((state?.nodes || []).map(node => [node.id, node]));
    if (state?.marker) map.set('__case__', { ...state.marker, id: '__case__', type: 'case' });
    return map;
  }

  function rectFor(node) {
    const { minSizes } = getContext();
    const size = minSizes?.[node?.type] || minSizes?.note || { w: 180, h: 120 };
    return {
      x: Number(node?.x) || 0,
      y: Number(node?.y) || 0,
      w: Number(node?.width) || size.w,
      h: Number(node?.height) || size.h
    };
  }

  function buildAdjacency() {
    const { state } = getContext();
    const adj = new Map();
    const ensure = id => { if (!adj.has(id)) adj.set(id, []); };
    ensure('__case__');
    (state?.nodes || []).forEach(n => ensure(n.id));
    (state?.edges || []).forEach(edge => {
      if (!edge?.a || !edge?.b || edge.a === edge.b) return;
      ensure(edge.a); ensure(edge.b);
      adj.get(edge.a).push(edge.b);
      adj.get(edge.b).push(edge.a);
    });
    return adj;
  }

  function collectBranch(startId) {
    const adj = buildAdjacency();
    if (!startId || !adj.has(startId)) return [];
    const seen = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
      const current = queue.shift();
      for (const next of adj.get(current) || []) {
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    return [...seen];
  }

  function contentBounds(ids) {
    const map = nodesById();
    const rects = ids.map(id => map.get(id)).filter(Boolean).map(rectFor);
    if (!rects.length) return null;
    const left = Math.min(...rects.map(r => r.x));
    const top = Math.min(...rects.map(r => r.y));
    const right = Math.max(...rects.map(r => r.x + r.w));
    const bottom = Math.max(...rects.map(r => r.y + r.h));
    return { left, top, right, bottom, width: right - left, height: bottom - top, cx: (left + right) / 2, cy: (top + bottom) / 2 };
  }

  function rememberNavigation(targetId = null) {
    const { state, boardEl, zoomLevel } = getContext();
    state.settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    state.settings.navigation = {
      scrollLeft: Number(boardEl?.scrollLeft) || 0,
      scrollTop: Number(boardEl?.scrollTop) || 0,
      zoom: Number(zoomLevel) || 1,
      targetId: targetId || null,
      savedAt: Date.now()
    };
  }

  function centerPoint(x, y, { targetId = null, keepZoom = true, fit = false } = {}) {
    const { boardEl, zoomWrap, setZoomLevel, applyZoom, zoomLevel, save, drawStrings, scheduleMiniMap } = getContext();
    const viewport = boardEl.getBoundingClientRect();
    let nextZoom = keepZoom ? zoomLevel : 1;
    if (fit) {
      nextZoom = clamp(nextZoom, 0.34, 1.15);
      const boardW = Math.max(1, zoomWrap?.offsetWidth || 4200);
      const boardH = Math.max(1, zoomWrap?.offsetHeight || 3000);
      const fitX = viewport.width / boardW;
      const fitY = viewport.height / boardH;
      nextZoom = clamp(Math.max(0.34, Math.min(1.15, Math.max(fitX, fitY))), 0.34, 1.15);
    }
    setZoomLevel(nextZoom);
    applyZoom();
    boardEl.scrollLeft = Math.max(0, x - viewport.width / (2 * nextZoom));
    boardEl.scrollTop = Math.max(0, y - viewport.height / (2 * nextZoom));
    rememberNavigation(targetId);
    save();
    drawStrings();
    scheduleMiniMap();
  }

  function centerCase() {
    const { state } = getContext();
    const r = rectFor(state.marker || { x: 60, y: 100, width: 240, height: 140 });
    centerPoint(r.x + r.w / 2, r.y + r.h / 2, { targetId: '__case__' });
  }

  function centerSelected() {
    const { selectedCardId, selectCard } = getContext();
    if (!selectedCardId) return centerCase();
    const map = nodesById();
    const node = map.get(selectedCardId);
    if (!node) return centerCase();
    selectCard(selectedCardId);
    const r = rectFor(node);
    centerPoint(r.x + r.w / 2, r.y + r.h / 2, { targetId: selectedCardId });
  }

  function centerBranch() {
    const { selectedCardId, selectCard } = getContext();
    const start = selectedCardId || '__case__';
    const ids = collectBranch(start);
    const bounds = contentBounds(ids);
    if (!bounds) return centerCase();
    selectCard(start);
    centerPoint(bounds.cx, bounds.cy, { targetId: start });
  }

  function centerAll() {
    const { state } = getContext();
    const ids = ['__case__', ...(state?.nodes || []).map(n => n.id)];
    const bounds = contentBounds(ids);
    if (!bounds) return centerCase();
    centerPoint(bounds.cx, bounds.cy, { targetId: null, fit: false });
  }

  function getConnectedOrder(startId) {
    const adj = buildAdjacency();
    if (!startId || !adj.has(startId)) return [];
    const result = [];
    const visited = new Set([startId]);
    const queue = [{ id: startId, depth: 0 }];
    while (queue.length) {
      const current = queue.shift();
      for (const id of adj.get(current.id) || []) {
        if (visited.has(id)) continue;
        visited.add(id);
        result.push({ id, depth: current.depth + 1 });
        queue.push({ id, depth: current.depth + 1 });
      }
    }
    return result;
  }

  function moveConnected(direction = 1) {
    const { selectedCardId, selectCard } = getContext();
    const start = selectedCardId || '__case__';
    const order = getConnectedOrder(start).map(x => x.id);
    if (!order.length) return;
    const map = nodesById();
    order.sort((a, b) => {
      const ra = rectFor(map.get(a) || {}), rb = rectFor(map.get(b) || {});
      if (Math.abs(ra.y - rb.y) > 2) return ra.y - rb.y;
      return ra.x - rb.x;
    });
    const currentIndex = order.indexOf(start);
    const idx = direction > 0 ? 0 : order.length - 1;
    const nextId = order[currentIndex >= 0 ? (currentIndex + direction + order.length) % order.length : idx];
    selectCard(nextId);
    const node = map.get(nextId);
    if (node) {
      const r = rectFor(node);
      centerPoint(r.x + r.w / 2, r.y + r.h / 2, { targetId: nextId });
    }
  }

  function restoreLastNavigation() {
    const { state, boardEl, setZoomLevel, applyZoom, drawStrings, scheduleMiniMap } = getContext();
    const view = state?.settings?.navigation;
    if (!view || !Number.isFinite(view.scrollLeft) || !Number.isFinite(view.scrollTop)) return false;
    if (Number.isFinite(view.zoom)) setZoomLevel(view.zoom);
    applyZoom();
    boardEl.scrollLeft = Math.max(0, Number(view.scrollLeft) || 0);
    boardEl.scrollTop = Math.max(0, Number(view.scrollTop) || 0);
    drawStrings();
    scheduleMiniMap();
    return true;
  }

  function autoOrganize({ branchOnly = false } = {}) {
    const { state, minSizes, pushUndo, save, render, selectCard } = getContext();
    pushUndo();
    if (!state.marker) state.marker = { x: 120, y: 120, width: 240, height: 140 };
    const adj = buildAdjacency();
    const targetIds = branchOnly ? collectBranch(getContext().selectedCardId || '__case__') : ['__case__', ...(state.nodes || []).map(n => n.id)];
    const allowed = new Set(targetIds);
    const depths = new Map([['__case__', 0]]);
    const queue = ['__case__'];
    while (queue.length) {
      const cur = queue.shift();
      for (const next of adj.get(cur) || []) {
        if (depths.has(next) || !allowed.has(next)) continue;
        depths.set(next, (depths.get(cur) || 0) + 1);
        queue.push(next);
      }
    }
    const root = rectFor(state.marker);
    const rootX = 1250, rootY = 900;
    state.marker.x = rootX - root.w / 2;
    state.marker.y = rootY - root.h / 2;

    const levels = new Map();
    for (const node of state.nodes || []) {
      if (!allowed.has(node.id)) continue;
      const depth = depths.get(node.id);
      if (depth == null) continue;
      if (!levels.has(depth)) levels.set(depth, []);
      levels.get(depth).push(node);
    }

    const orderedLevels = [...levels.keys()].sort((a,b)=>a-b);
    orderedLevels.forEach(depth => {
      const group = levels.get(depth).sort((a,b)=>(a.y-b.y)|| (a.x-b.x));
      const gap = 90;
      let y = rootY - ((group.length - 1) * 170) / 2;
      const x = rootX + 380 + (depth - 1) * 330;
      group.forEach(node => {
        const size = minSizes[node.type] || minSizes.note;
        const h = node.height || size.h;
        node.x = x;
        node.y = y;
        y += h + gap;
      });
    });

    const orphans = (state.nodes || []).filter(n => !allowed.has(n.id) || !depths.has(n.id));
    orphans.forEach((node, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      node.x = 260 + col * 300;
      node.y = 2300 + row * 220;
    });

    if (!branchOnly) state.settings = { ...(state.settings || {}), lastOrganization: { at: Date.now(), mode: 'complete' } };
    save();
    render();
    setTimeout(() => centerAll(), 30);
    if (branchOnly && getContext().selectedCardId) selectCard(getContext().selectedCardId);
  }

  function arrangeBranches() {
    const { state, minSizes, pushUndo, save, render } = getContext();
    pushUndo();
    if (!state.marker) state.marker = { x: 120, y: 120, width: 240, height: 140 };
    const adj = buildAdjacency();
    const roots = (adj.get('__case__') || []).filter(Boolean);
    const spacingY = 360;
    roots.forEach((rootId, branchIndex) => {
      const branch = collectBranch(rootId).filter(id => id !== '__case__');
      const depths = new Map([[rootId, 0]]);
      const q = [rootId];
      while (q.length) {
        const cur = q.shift();
        for (const next of adj.get(cur) || []) {
          if (next === '__case__' || depths.has(next) || !branch.includes(next)) continue;
          depths.set(next, depths.get(cur) + 1); q.push(next);
        }
      }
      const x0 = 560 + branchIndex * 460;
      const maxDepth = Math.max(...depths.values(), 0);
      for (let depth=0; depth<=maxDepth; depth++) {
        const group = branch.filter(id => depths.get(id) === depth).map(id => state.nodes.find(n=>n.id===id)).filter(Boolean);
        const totalH = group.reduce((sum,n)=>sum+(n.height || (minSizes[n.type] || minSizes.note).h),0) + Math.max(0,group.length-1)*70;
        let y = 520 + branchIndex * spacingY - totalH/2;
        group.sort((a,b)=>(a.y-b.y)||(a.x-b.x)).forEach(n=>{
          const size=minSizes[n.type]||minSizes.note;
          const h=n.height||size.h;
          n.x=x0+depth*300;
          n.y=y;
          y+=h+70;
        });
      }
    });
    state.settings = { ...(state.settings || {}), lastOrganization: { at: Date.now(), mode: 'branches' } };
    save(); render(); setTimeout(centerAll, 30);
  }

  function align(kind = 'left') {
    const { selectedCardId, state, pushUndo, save, render, selectCard } = getContext();
    const ids = collectBranch(selectedCardId || '__case__');
    const nodes = ids.filter(id => id !== '__case__').map(id => state.nodes.find(n => n.id === id)).filter(Boolean);
    if (nodes.length < 2) return;
    pushUndo();
    if (kind === 'top') { const y=Math.min(...nodes.map(n=>n.y)); nodes.forEach(n=>{ if(!n.locked) n.y=y; }); }
    else if (kind === 'center') { const x=Math.round(nodes.reduce((s,n)=>s+n.x,0)/nodes.length); nodes.forEach(n=>{ if(!n.locked) n.x=x; }); }
    else { const x=Math.min(...nodes.map(n=>n.x)); nodes.forEach(n=>{ if(!n.locked) n.x=x; }); }
    save(); render(); selectCard(selectedCardId || '__case__');
  }

  function distribute(axis = 'vertical') {
    const { selectedCardId, state, pushUndo, save, render, selectCard } = getContext();
    const ids = collectBranch(selectedCardId || '__case__').filter(id => id !== '__case__');
    const nodes = ids.map(id => state.nodes.find(n=>n.id===id)).filter(Boolean);
    if (nodes.length < 3) return;
    pushUndo();
    if (axis === 'horizontal') {
      nodes.sort((a,b)=>a.x-b.x);
      const first=nodes[0].x, last=nodes[nodes.length-1].x, step=(last-first)/(nodes.length-1);
      nodes.forEach((n,i)=>{ if(!n.locked) n.x=Math.round(first+i*step); });
    } else {
      nodes.sort((a,b)=>a.y-b.y);
      const first=nodes[0].y, last=nodes[nodes.length-1].y, step=(last-first)/(nodes.length-1);
      nodes.forEach((n,i)=>{ if(!n.locked) n.y=Math.round(first+i*step); });
    }
    save(); render(); selectCard(selectedCardId || '__case__');
  }

  function getStateSummary() {
    const { state } = getContext();
    const nodes = Array.isArray(state?.nodes) ? state.nodes : [];
    return {
      normal: nodes.filter(n => (n.status || 'normal') === 'normal').length,
      pending: nodes.filter(n => n.status === 'pending').length,
      validated: nodes.filter(n => n.status === 'validated').length,
      discarded: nodes.filter(n => n.status === 'discarded').length,
      locked: nodes.filter(n => !!n.locked).length
    };
  }

  return {
    collectBranch,
    centerCase,
    centerSelected,
    centerBranch,
    centerAll,
    moveConnected,
    restoreLastNavigation,
    rememberNavigation,
    autoOrganize,
    arrangeBranches,
    align,
    distribute,
    getStateSummary
  };
}
