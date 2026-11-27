export function miniColor(node) {
  switch (node?.type) {
    case 'question': return '#8f6ab5';
    case 'evidence': return '#9aa1a8';
    case 'conclusion': return '#8fae6e';
    case 'tag': return '#6f9384';
    case 'person': return '#8fa3b8';
    case 'photo': return '#c8bca7';
    case 'document': return '#b79c72';
    case 'case': return '#c9a15a';
    default: return '#d1cbbc';
  }
}

export function drawMiniMap({
  state,
  boardEl,
  zoomWrap,
  miniCanvas,
  miniCtx,
  miniMapEl,
  miniViewport,
  zoomLevel,
  currentCaseId
}) {
  if (!miniCanvas || !miniCtx || !miniMapEl) return;

  const w = miniCanvas.clientWidth;
  const h = miniCanvas.clientHeight;
  miniCtx.clearRect(0, 0, w, h);
  miniCtx.fillStyle = 'rgba(9,6,3,.72)';
  miniCtx.fillRect(0, 0, w, h);

  const boardW = zoomWrap?.offsetWidth || 4200;
  const boardH = zoomWrap?.offsetHeight || 3000;
  const sx = w / boardW;
  const sy = h / boardH;
  const scale = Math.min(sx, sy);
  const ox = (w - boardW * scale) / 2;
  const oy = (h - boardH * scale) / 2;

  const nodeById = new Map((state?.nodes || []).map(node => [node.id, node]));
  const caseNode = state?.marker ? {
    x: state.marker.x,
    y: state.marker.y,
    width: state.marker.width || 230,
    height: state.marker.height || 140
  } : null;

  miniCtx.lineWidth = 1;
  (state?.edges || []).forEach(edge => {
    const aNode = edge.a === '__case__' ? caseNode : nodeById.get(edge.a);
    const bNode = edge.b === '__case__' ? caseNode : nodeById.get(edge.b);
    if (!aNode || !bNode) return;
    miniCtx.strokeStyle = 'rgba(190,74,58,.55)';
    miniCtx.beginPath();
    miniCtx.moveTo(
      ox + (aNode.x + (aNode.width || 150) / 2) * scale,
      oy + (aNode.y + (aNode.height || 90) / 2) * scale
    );
    miniCtx.lineTo(
      ox + (bNode.x + (bNode.width || 150) / 2) * scale,
      oy + (bNode.y + (bNode.height || 90) / 2) * scale
    );
    miniCtx.stroke();
  });

  (state?.nodes || []).forEach(node => {
    const ww = Math.max(3, (node.width || 120) * scale * 0.55);
    const hh = Math.max(2, (node.height || 70) * scale * 0.55);
    miniCtx.fillStyle = miniColor(node);
    miniCtx.fillRect(ox + node.x * scale, oy + node.y * scale, ww, hh);
  });

  if (state?.marker) {
    const mw = Math.max(5, (state.marker.width || 230) * scale * 0.55);
    const mh = Math.max(4, (state.marker.height || 140) * scale * 0.55);
    miniCtx.fillStyle = '#c9a15a';
    miniCtx.fillRect(ox + state.marker.x * scale, oy + state.marker.y * scale, mw, mh);
  }

  if (!miniViewport) return;

  const bw = boardEl?.clientWidth || 0;
  const bh = boardEl?.clientHeight || 0;
  const left = (boardEl?.scrollLeft || 0) / (zoomLevel || 1);
  const top = (boardEl?.scrollTop || 0) / (zoomLevel || 1);
  const vw = bw / (zoomLevel || 1);
  const vh = bh / (zoomLevel || 1);

  miniViewport.style.left = (ox + left * scale) + 'px';
  miniViewport.style.top = (oy + top * scale) + 'px';
  miniViewport.style.width = Math.max(10, vw * scale) + 'px';
  miniViewport.style.height = Math.max(8, vh * scale) + 'px';

  if (typeof currentCaseId !== 'undefined') {
    miniMapEl.classList.toggle('hidden', currentCaseId === null);
  }
}

export function resizeMiniMapCanvas({
  state,
  boardEl,
  zoomWrap,
  miniCanvas,
  miniCtx,
  miniMapEl,
  miniViewport,
  zoomLevel,
  currentCaseId,
  drawMiniMapFn
}) {
  if (!miniCanvas || !miniCtx || !miniMapEl) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = miniCanvas.getBoundingClientRect();
  miniCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  miniCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (drawMiniMapFn) {
    drawMiniMapFn({
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
}
