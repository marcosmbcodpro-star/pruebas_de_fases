export function renderBoard({state, selectedCardId, linkMode, caseSearchQuery, cardsEl, caseStructurePanel, hasCaseFilters, caseFilterNodeMatches, minSizes, callbacks}) {
  const {getRenderSignature, getLastRenderSignature, setLastRenderSignature, closeAllPlusMenus, closeAllStatusMenus, renderCaseMarker, buildPhotoContent, buildDocumentContent, buildNoteContent, buildQuestionContent, buildHypothesisContent, buildConclusionContent, buildTagContent, buildEvidenceContent, buildCaseContent, buildPersonAvatar, labelFor, addCardFavoriteButton, addCardLockButton, addCardStateButton, buildInlineConclusion, addConclusionStatusIcon, startDrag, selectCard, handleLinkClick, addPlusButton, addResizeHandle, setupFarPreview, addMobileQuickEditButtons, applyConnectionFocus, performCaseSearch, applyCaseFilters, renderStructureTree, scheduleSave, deleteNode} = callbacks;
  const signature = getRenderSignature();
  if (signature === getLastRenderSignature()) return false;
  setLastRenderSignature(signature);
  closeAllPlusMenus(); closeAllStatusMenus(); cardsEl.innerHTML = ''; renderCaseMarker();
  state.nodes.forEach(node => {
    const card=document.createElement('div');
    card.className=node.type==='case'?'card case case-marker':`card ${node.type}`;
    if(node.type==='tag'&&node.conclusion) card.classList.add('has-inline-conclusion');
    card.style.left=node.x+'px'; card.style.top=node.y+'px'; card.dataset.id=node.id;
    const pin=document.createElement('div'); pin.className='pin'; card.appendChild(pin);
    const del=document.createElement('button'); del.className='del'; del.textContent='✕';
    del.addEventListener('pointerdown',e=>e.stopPropagation()); del.onclick=e=>{e.stopPropagation();deleteNode(node.id);}; card.appendChild(del);
    const content=document.createElement('div'); content.className='card-content'; card.appendChild(content);
    const cleanDragOverlay=document.createElement('div'); cleanDragOverlay.className='clean-drag-overlay'; cleanDragOverlay.setAttribute('aria-hidden','true');
    cleanDragOverlay.addEventListener('pointerdown',e=>{if(!document.body.classList.contains('clean-mode'))return;if(e.button!==undefined&&e.button!==0)return;startDrag(e,node,card);}); card.appendChild(cleanDragOverlay);
    if(node.type==='photo') buildPhotoContent(content,node); else if(node.type==='document') buildDocumentContent(content,node); else if(node.type==='note') buildNoteContent(content,node); else if(node.type==='question') buildQuestionContent(content,node); else if(node.type==='hypothesis') buildHypothesisContent(content,node); else if(node.type==='conclusion') buildConclusionContent(content,node); else if(node.type==='tag') buildTagContent(content,node); else if(node.type==='evidence') buildEvidenceContent(content,node); else if(node.type==='case') buildCaseContent(content,node); else {
      if(node.type==='person') buildPersonAvatar(content,node);
      const label=document.createElement('span'); label.className='label'; label.textContent=labelFor(node.type); content.appendChild(label);
      const text=document.createElement('div'); text.className='text'; text.contentEditable=true; text.textContent=node.text;
      text.addEventListener('input',()=>{node.text=text.innerText;scheduleSave();}); text.addEventListener('pointerdown',e=>e.stopPropagation()); content.appendChild(text);
    }
    if(node.locked) card.classList.add('is-locked');
    addCardFavoriteButton(card,node); addCardLockButton(card,node); addCardStateButton(card,node);
    if(hasCaseFilters()) card.classList.add(caseFilterNodeMatches(node)?'filter-match':'filter-dim');
    if(node.type!=='conclusion'&&node.conclusion){buildInlineConclusion(content,node);card.classList.add('has-inline-conclusion');addConclusionStatusIcon(card,node.conclusion);}
    card.addEventListener('pointerdown',e=>startDrag(e,node,card));
    card.addEventListener('click',e=>{if(linkMode){e.stopPropagation();handleLinkClick(node.id,card);}else{e.stopPropagation();selectCard(node.id);}});
    addPlusButton(card,node.id); const mins=minSizes[node.type]||minSizes.note; addResizeHandle(card,node,mins.w,mins.h); if(node.id===selectedCardId)card.classList.add('selected');
    addMobileQuickEditButtons(card,node);
    card.style.animationDelay=(Math.random()*3).toFixed(2)+'s'; cardsEl.appendChild(card); setupFarPreview(card);
  });
  applyConnectionFocus(); if(caseSearchQuery)performCaseSearch(); applyCaseFilters();
  if(caseStructurePanel&&!caseStructurePanel.classList.contains('hidden'))renderStructureTree();
  return true;
}
