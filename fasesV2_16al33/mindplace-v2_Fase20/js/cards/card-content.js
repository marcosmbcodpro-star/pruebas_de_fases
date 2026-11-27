export function createCardContentBuilders({
  getState,
  getStore,
  todayEs,
  scheduleSave,
  pushUndo,
  save,
  render,
  labelFor,
  documentDisplayId,
  statusLabel,
  DOC_EMBED_LIMIT,
  attachmentRepository,
  getCurrentCaseId = () => '',
  createAttachment,
  MAX_ATTACHMENT_SIZE,
  setEditSessionEl
}) {
function formatSize(bytes){ if(!Number.isFinite(Number(bytes))||bytes<0) return '0 B'; const n=Number(bytes); if(n<1024) return n+' B'; if(n<1024*1024) return Math.round(n/1024)+' KB'; return (n/(1024*1024)).toFixed(1)+' MB'; }

function buildDocumentField(iconSvg, labelText, value, placeholder, onInput){
  const row = document.createElement('div');
  row.className = 'd-field';
  const icon = document.createElement('span');
  icon.innerHTML = iconSvg;
  row.appendChild(icon.firstElementChild);
  const b = document.createElement('b');
  b.textContent = labelText + ':';
  row.appendChild(b);
  const val = document.createElement('span');
  val.className = 'd-field-val';
  val.contentEditable = true;
  val.dataset.placeholder = placeholder;
  val.textContent = value || '';
  val.addEventListener('input', ()=>{ onInput(val.innerText); scheduleSave(); });
  val.addEventListener('pointerdown', e=>e.stopPropagation());
  row.appendChild(val);
  return row;
}

function buildDocumentContent(content, node){
  if(!node.dateText) node.dateText = todayEs();

  const clip = document.createElement('div');
  clip.className = 'd-clip';
  clip.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5.5L6.5 12a4 4 0 0 0 5.7 5.7l7-7a2.6 2.6 0 0 0-3.7-3.7l-6.3 6.3"/></svg>';
  content.appendChild(clip);

  const head = document.createElement('div');
  head.className = 'd-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'd-head-left';
  headLeft.innerHTML = '<svg class="d-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'DOCUMENTO';
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const idBadge = document.createElement('span');
  idBadge.className = 'd-id';
  idBadge.textContent = 'ID: ' + documentDisplayId(node);
  head.appendChild(idBadge);

  content.appendChild(head);

  content.appendChild(Object.assign(document.createElement('div'), { className:'d-divider top' }));

  content.appendChild(buildDocumentField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
    'Título', node.docTitle, 'Título del documento',
    (v)=>{ node.docTitle = v; }
  ));
  content.appendChild(buildDocumentField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>',
    'Fecha', node.dateText, 'dd/mm/aaaa',
    (v)=>{ node.dateText = v; }
  ));
  content.appendChild(buildDocumentField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>',
    'Autor', node.author, 'Autor o departamento',
    (v)=>{ node.author = v; }
  ));
  content.appendChild(buildDocumentField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    'Categoría', node.category, 'Categoría',
    (v)=>{ node.category = v; }
  ));

  content.appendChild(Object.assign(document.createElement('div'), { className:'d-divider' }));

  const desc = document.createElement('div');
  desc.className = 'd-desc';
  const descHead = document.createElement('div');
  descHead.className = 'd-desc-head';
  descHead.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M7 13h4"/><path d="M7 17h7"/></svg>';
  const descLabel = document.createElement('b');
  descLabel.textContent = 'Descripción:';
  descHead.appendChild(descLabel);
  desc.appendChild(descHead);
  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Añade una nota sobre este documento…';
  text.textContent = node.text || '';
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  desc.appendChild(text);
  content.appendChild(desc);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'photo-file-input';
  fileInput.setAttribute('aria-label','Adjuntar documento');
  fileInput.addEventListener('pointerdown', e=>e.stopPropagation());
  fileInput.addEventListener('click', e=>e.stopPropagation());
  fileInput.addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(file.size > MAX_ATTACHMENT_SIZE){ alert(`El archivo supera el límite de ${Math.round(MAX_ATTACHMENT_SIZE/1024/1024)} MB.`); return; }
    pushUndo();
    try{
      const previousIds = Array.isArray(node.attachments) ? node.attachments.map(a=>a.id).filter(Boolean) : [];
      for(const id of previousIds) await attachmentRepository.deleteOne(id);
      const metadata = await attachmentRepository.putFile(file, createAttachment({sourceId:node.id,caseId:getCurrentCaseId() || '',type:'document',name:file.name,mimeType:file.type||'application/octet-stream',size:file.size}));
      node.attachments=[metadata];
      delete node.fileData; delete node.fileName; delete node.fileSize; delete node.fileType;
      await save(); render();
    }catch(error){ console.error('No se pudo guardar el adjunto.',error); alert(error?.message||'No se pudo guardar el archivo.'); }
    finally { e.target.value=''; }
  });

  const attach = document.createElement('div');
  attach.className = 'd-attach';
  attach.title = node.fileName ? 'Pulsa para adjuntar otro archivo' : 'Pulsa para adjuntar un archivo';
  const attachIcon = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5.5L6.5 12a4 4 0 0 0 5.7 5.7l7-7a2.6 2.6 0 0 0-3.7-3.7l-6.3 6.3"/></svg>';
  const documentAttachment = Array.isArray(node.attachments) ? node.attachments[0] : null;
  const legacyFileName = node.fileName || '';
  if(documentAttachment || legacyFileName){
    const meta = documentAttachment || {name:legacyFileName,mimeType:node.fileType||'application/octet-stream',size:node.fileSize||0};
    const iconHolder=document.createElement('span'); iconHolder.innerHTML=attachIcon; attach.appendChild(iconHolder.firstElementChild);
    const label=document.createElement('span');
    label.textContent=`${documentAttachment ? '1 archivo adjunto — ' : 'Archivo heredado — '}${meta.name || 'Adjunto'} · ${formatSize(meta.size)}`;
    attach.appendChild(label);
    if(documentAttachment){
      attachmentRepository.getUrl(documentAttachment.id).then(url=>{
        if(!url) return;
        const dl=document.createElement('a'); dl.className='d-download'; dl.href=url; dl.download=meta.name; dl.textContent='Descargar'; dl.target='_blank';
        dl.addEventListener('pointerdown',e=>e.stopPropagation()); dl.addEventListener('click',e=>e.stopPropagation()); attach.appendChild(dl);
        const preview=document.createElement('a'); preview.className='d-download'; preview.href=url; preview.target='_blank'; preview.rel='noopener'; preview.textContent='Vista previa';
        preview.addEventListener('pointerdown',e=>e.stopPropagation()); preview.addEventListener('click',e=>e.stopPropagation()); attach.appendChild(preview);
      }).catch(()=>{});
    } else if(node.fileData){
      const dl=document.createElement('a'); dl.className='d-download'; dl.href=node.fileData; dl.download=meta.name; dl.textContent='Descargar'; dl.addEventListener('pointerdown',e=>e.stopPropagation()); dl.addEventListener('click',e=>e.stopPropagation()); attach.appendChild(dl);
    }
    const removeBtn=document.createElement('button'); removeBtn.type='button'; removeBtn.className='d-download'; removeBtn.textContent='Quitar';
    removeBtn.addEventListener('pointerdown',e=>e.stopPropagation());
    removeBtn.addEventListener('click',async e=>{ e.stopPropagation(); pushUndo(); try{ if(documentAttachment) await attachmentRepository.deleteOne(documentAttachment.id); }catch(_){} node.attachments=[]; delete node.fileData; delete node.fileName; delete node.fileSize; delete node.fileType; await save(); render(); });
    attach.appendChild(removeBtn);
  } else {
    attach.innerHTML = attachIcon + '<span>Adjuntar documento</span>';
  }
  attach.addEventListener('pointerdown', e=>e.stopPropagation());
  attach.addEventListener('click', (e)=>{
    e.stopPropagation();
    fileInput.click();
  });
  attach.appendChild(fileInput);
  content.appendChild(attach);

  if(node.verified){
    const stamp = document.createElement('div');
    stamp.className = 'd-stamp';
    stamp.textContent = 'VERIFICADO';
    stamp.title = 'Clic para quitar el sello';
    stamp.addEventListener('pointerdown', e=>e.stopPropagation());
    stamp.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.verified = false;
      scheduleSave();
      render();
    });
    content.appendChild(stamp);
  } else {
    const stampAdd = document.createElement('button');
    stampAdd.className = 'd-stamp-add';
    stampAdd.type = 'button';
    stampAdd.textContent = '+ verificado';
    stampAdd.addEventListener('pointerdown', e=>e.stopPropagation());
    stampAdd.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.verified = true;
      scheduleSave();
      render();
    });
    content.appendChild(stampAdd);
  }
}

function evidenceDisplayId(node){
  const es = getState().nodes.filter(n=>n.type==='evidence');
  const idx = es.indexOf(node) + 1;
  return 'E-' + String(idx || es.length).padStart(4, '0');
}

function buildEvidenceField(iconSvg, labelText, value, placeholder, onInput){
  const row = document.createElement('div');
  row.className = 'e-field';
  const icon = document.createElement('span');
  icon.innerHTML = iconSvg;
  row.appendChild(icon.firstElementChild);
  const b = document.createElement('b');
  b.textContent = labelText + ':';
  row.appendChild(b);
  const val = document.createElement('span');
  val.className = 'e-field-val';
  val.contentEditable = true;
  val.dataset.placeholder = placeholder;
  val.textContent = value || '';
  val.addEventListener('input', ()=>{ onInput(val.innerText); scheduleSave(); });
  val.addEventListener('pointerdown', e=>e.stopPropagation());
  row.appendChild(val);
  return row;
}

function buildEvidenceContent(content, node){
  if(!node.dateText) node.dateText = todayEs();

  const clip = document.createElement('div');
  clip.className = 'e-clip';
  clip.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5.5L6.5 12a4 4 0 0 0 5.7 5.7l7-7a2.6 2.6 0 0 0-3.7-3.7l-6.3 6.3"/></svg>';
  content.appendChild(clip);

  const head = document.createElement('div');
  head.className = 'e-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'e-head-left';
  headLeft.innerHTML = '<svg class="e-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/><path d="M9 9h1"/></svg>';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelFor(node.type);
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const idBadge = document.createElement('span');
  idBadge.className = 'e-id';
  idBadge.textContent = 'ID: ' + evidenceDisplayId(node);
  head.appendChild(idBadge);

  content.appendChild(head);

  content.appendChild(Object.assign(document.createElement('div'), { className:'e-divider top' }));

  content.appendChild(buildEvidenceField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10" r="1.3"/><path d="M21 16l-5-5-4 4-3-3-4 4"/></svg>',
    'Documento', node.docName, 'Nombre del documento',
    (v)=>{ node.docName = v; }
  ));
  content.appendChild(buildEvidenceField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>',
    'Fecha', node.dateText, 'dd/mm/aaaa',
    (v)=>{ node.dateText = v; }
  ));
  content.appendChild(buildEvidenceField(
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    'Origen', node.origin, 'Procedencia',
    (v)=>{ node.origin = v; }
  ));

  const desc = document.createElement('div');
  desc.className = 'e-desc';
  const descLabel = document.createElement('b');
  descLabel.textContent = 'Descripción:';
  desc.appendChild(descLabel);
  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Describe la evidencia…';
  text.textContent = node.text;
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  desc.appendChild(text);
  content.appendChild(desc);

  content.appendChild(Object.assign(document.createElement('div'), { className:'e-divider' }));

  if(node.verified){
    const stamp = document.createElement('div');
    stamp.className = 'e-stamp';
    stamp.textContent = 'VERIFICADA';
    stamp.title = 'Clic para quitar el sello';
    stamp.addEventListener('pointerdown', e=>e.stopPropagation());
    stamp.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.verified = false;
      scheduleSave();
      render();
    });
    content.appendChild(stamp);
  }

  const footer = document.createElement('div');
  footer.className = 'e-footer';

  const category = document.createElement('span');
  category.className = 'e-category';
  category.contentEditable = true;
  category.dataset.placeholder = 'Categoría';
  category.innerHTML = '';
  category.textContent = node.category || '';
  category.addEventListener('input', ()=>{ node.category = category.innerText; scheduleSave(); });
  category.addEventListener('pointerdown', e=>e.stopPropagation());
  footer.appendChild(category);
  content.appendChild(footer);

  if(!node.verified){
    const stampAdd = document.createElement('button');
    stampAdd.className = 'e-stamp-add';
    stampAdd.type = 'button';
    stampAdd.textContent = '+ verificada';
    stampAdd.addEventListener('pointerdown', e=>e.stopPropagation());
    stampAdd.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.verified = true;
      scheduleSave();
      render();
    });
    content.appendChild(stampAdd);
  }
}

function tagDisplayId(node){
  const ts = getState().nodes.filter(n=>n.type==='tag');
  const idx = ts.indexOf(node) + 1;
  return 'P-' + String(idx || ts.length).padStart(4, '0');
}


function ensureTagConclusion(node){
  if(!node.conclusion || typeof node.conclusion !== 'object'){
    node.conclusion = {
      text: '',
      detail: '',
      resolved: false,
      expanded: true,
      dateText: todayEs(),
      author: ''
    };
  }
  if(typeof node.conclusion.text !== 'string') node.conclusion.text = '';
  if(typeof node.conclusion.detail !== 'string') node.conclusion.detail = '';
  if(typeof node.conclusion.resolved !== 'boolean') node.conclusion.resolved = false;
  if(typeof node.conclusion.expanded !== 'boolean') node.conclusion.expanded = true;
  if(!node.conclusion.dateText) node.conclusion.dateText = todayEs();
  if(typeof node.conclusion.author !== 'string') node.conclusion.author = '';
  return node.conclusion;
}

function addConclusionToTag(tagNode){
  if(!tagNode || tagNode.type !== 'tag') return false;
  if(tagNode.conclusion){
    tagNode.conclusion.expanded = true;
    save();
    render();
    return false;
  }
  pushUndo();
  ensureTagConclusion(tagNode);
  tagNode.conclusion.expanded = true;
  save();
  render();
  return true;
}

function buildTagConclusion(content, node){
  const conclusion = ensureTagConclusion(node);

  const wrap = document.createElement('div');
  wrap.className = 'tag-conclusion';

  const head = document.createElement('div');
  head.className = 'tag-conclusion-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'tag-conclusion-head-left';
  const icon = document.createElement('span');
  icon.className = 'tag-conclusion-icon';
  icon.textContent = '✓';
  headLeft.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'tag-conclusion-label';
  label.textContent = 'Conclusión';
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tag-conclusion-toggle';
  toggle.title = conclusion.expanded ? 'Ocultar conclusión' : 'Mostrar conclusión';
  toggle.textContent = conclusion.expanded ? '⌃' : '⌄';
  toggle.addEventListener('pointerdown', e=>e.stopPropagation());
  toggle.addEventListener('click', e=>{
    e.stopPropagation();
    pushUndo();
    conclusion.expanded = !conclusion.expanded;
    scheduleSave();
    render();
  });
  head.appendChild(toggle);
  wrap.appendChild(head);

  const body = document.createElement('div');
  body.className = 'tag-conclusion-body' + (conclusion.expanded ? '' : ' is-collapsed');

  const text = document.createElement('div');
  text.className = 'tag-conclusion-text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Escribe la conclusión de esta pista…';
  text.textContent = conclusion.text || '';
  text.addEventListener('input', ()=>{ conclusion.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(text);

  const detail = document.createElement('div');
  detail.className = 'tag-conclusion-detail';
  detail.contentEditable = true;
  detail.dataset.placeholder = 'Explicación o justificación (opcional)…';
  detail.textContent = conclusion.detail || '';
  detail.addEventListener('input', ()=>{ conclusion.detail = detail.innerText; scheduleSave(); });
  detail.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(detail);

  const footer = document.createElement('div');
  footer.className = 'tag-conclusion-footer';

  const date = document.createElement('span');
  date.textContent = conclusion.dateText;
  footer.appendChild(date);

  if(conclusion.resolved){
    const resolved = document.createElement('button');
    resolved.type = 'button';
    resolved.className = 'tag-conclusion-resolved';
    resolved.textContent = 'RESUELTO';
    resolved.title = 'Clic para quitar el estado resuelto';
    resolved.addEventListener('pointerdown', e=>e.stopPropagation());
    resolved.addEventListener('click', e=>{
      e.stopPropagation();
      pushUndo();
      conclusion.resolved = false;
      scheduleSave();
      render();
    });
    footer.appendChild(resolved);
  } else {
    const resolvedAdd = document.createElement('button');
    resolvedAdd.type = 'button';
    resolvedAdd.className = 'tag-conclusion-resolved-add';
    resolvedAdd.textContent = '+ resuelto';
    resolvedAdd.title = 'Marcar esta conclusión como resuelta';
    resolvedAdd.addEventListener('pointerdown', e=>e.stopPropagation());
    resolvedAdd.addEventListener('click', e=>{
      e.stopPropagation();
      pushUndo();
      conclusion.resolved = true;
      scheduleSave();
      render();
    });
    footer.appendChild(resolvedAdd);
  }

  body.appendChild(footer);
  wrap.appendChild(body);
  content.appendChild(wrap);
}

function buildTagContent(content, node){
  if(!node.dateText) node.dateText = todayEs();

  const head = document.createElement('div');
  head.className = 't-head';

  const headLeft = document.createElement('div');
  headLeft.className = 't-head-left';
  headLeft.innerHTML = '<svg class="t-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.2-5.2 2.2 2.2-5.2z"/></svg>';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelFor(node.type);
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const idBadge = document.createElement('span');
  idBadge.className = 't-id';
  idBadge.textContent = 'ID: ' + tagDisplayId(node);
  head.appendChild(idBadge);

  content.appendChild(head);

  const dividerTop = document.createElement('div');
  dividerTop.className = 't-divider top';
  content.appendChild(dividerTop);

  const body = document.createElement('div');
  body.className = 't-body';
  body.innerHTML = '<svg class="t-body-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/></svg>';

  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Describe la pista…';
  text.textContent = node.text;
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(text);

  if(node.important){
    const stamp = document.createElement('div');
    stamp.className = 't-stamp';
    stamp.textContent = 'IMPORTANTE';
    stamp.title = 'Clic para quitar el sello';
    stamp.addEventListener('pointerdown', e=>e.stopPropagation());
    stamp.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.important = false;
      scheduleSave();
      render();
    });
    body.appendChild(stamp);
  } else {
    const stampAdd = document.createElement('button');
    stampAdd.className = 't-stamp-add';
    stampAdd.type = 'button';
    stampAdd.textContent = '+ importante';
    stampAdd.addEventListener('pointerdown', e=>e.stopPropagation());
    stampAdd.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.important = true;
      scheduleSave();
      render();
    });
    body.appendChild(stampAdd);
  }

  content.appendChild(body);

  content.appendChild(Object.assign(document.createElement('div'), { className:'t-divider' }));

  const footer = document.createElement('div');
  footer.className = 't-footer';

  const category = document.createElement('span');
  category.className = 't-category';
  category.contentEditable = true;
  category.dataset.placeholder = 'Categoría';
  category.textContent = node.category || '';
  category.addEventListener('input', ()=>{ node.category = category.innerText; scheduleSave(); });
  category.addEventListener('pointerdown', e=>e.stopPropagation());
  footer.appendChild(category);

  const date = document.createElement('span');
  date.className = 't-date';
  date.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';
  const dateText = document.createElement('span');
  dateText.textContent = node.dateText;
  date.appendChild(dateText);
  footer.appendChild(date);

  content.appendChild(footer);

}

function conclusionDisplayId(node){
  const cs = getState().nodes.filter(n=>n.type==='conclusion');
  const idx = cs.indexOf(node) + 1;
  return 'C-' + String(idx || cs.length).padStart(4, '0');
}

const C_TAG_PALETTE = [
  'rgba(111,143,189,.35)',
  'rgba(140,130,90,.4)',
  'rgba(214,164,80,.45)'
];

function buildConclusionContent(content, node){
  if(!node.tags) node.tags = [];
  if(!node.dateText) node.dateText = todayEs();

  const head = document.createElement('div');
  head.className = 'c-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'c-head-left';
  headLeft.innerHTML = '<svg class="c-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelFor(node.type);
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const idBadge = document.createElement('span');
  idBadge.className = 'c-id';
  idBadge.textContent = 'ID: ' + conclusionDisplayId(node);
  head.appendChild(idBadge);

  content.appendChild(head);

  const dividerTop = document.createElement('div');
  dividerTop.className = 'c-divider top';
  content.appendChild(dividerTop);

  const body = document.createElement('div');
  body.className = 'c-body';

  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Escribe la conclusión…';
  text.textContent = node.text;
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(text);

  const detail = document.createElement('div');
  detail.className = 'c-detail';
  detail.contentEditable = true;
  detail.dataset.placeholder = 'Detalle o justificación (opcional)…';
  detail.textContent = node.detail || '';
  detail.addEventListener('input', ()=>{ node.detail = detail.textContent; scheduleSave(); });
  detail.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(detail);

  if(node.resolved){
    const stamp = document.createElement('div');
    stamp.className = 'c-stamp';
    stamp.textContent = 'RESUELTO';
    stamp.title = 'Clic para quitar el sello';
    stamp.addEventListener('pointerdown', e=>e.stopPropagation());
    stamp.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.resolved = false;
      scheduleSave();
      render();
    });
    body.appendChild(stamp);
  } else {
    const stampAdd = document.createElement('button');
    stampAdd.className = 'c-stamp-add';
    stampAdd.type = 'button';
    stampAdd.textContent = '+ resuelto';
    stampAdd.addEventListener('pointerdown', e=>e.stopPropagation());
    stampAdd.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.resolved = true;
      scheduleSave();
      render();
    });
    body.appendChild(stampAdd);
  }

  content.appendChild(body);

  content.appendChild(Object.assign(document.createElement('div'), { className:'c-divider' }));

  const tagsRow = document.createElement('div');
  tagsRow.className = 'c-tags-row';
  const tagsLabel = document.createElement('div');
  tagsLabel.className = 'c-tags-label';
  tagsLabel.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V6a1 1 0 0 1 1-1h6l11 11-7 7L3 12z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg><span>Etiquetas</span>';
  tagsRow.appendChild(tagsLabel);

  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'c-tags';
  node.tags.forEach((tagValue, i)=>{
    tagsWrap.appendChild(buildConclusionTag(node, i));
  });

  const addTagBtn = document.createElement('button');
  addTagBtn.className = 'c-tag-add';
  addTagBtn.type = 'button';
  addTagBtn.textContent = '+ etiqueta';
  addTagBtn.addEventListener('pointerdown', e=>e.stopPropagation());
  addTagBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.tags.push('');
    scheduleSave();
    render();
    setTimeout(()=>{
      const els = document.querySelectorAll(`[data-id="${node.id}"] .c-tag-text`);
      const last = els[node.tags.length - 1];
      if(last){ setEditSessionEl(last); last.focus(); }
    }, 30);
  });
  tagsWrap.appendChild(addTagBtn);

  tagsRow.appendChild(tagsWrap);
  content.appendChild(tagsRow);

  const footer = document.createElement('div');
  footer.className = 'c-footer';

  const createdMeta = document.createElement('span');
  createdMeta.className = 'c-meta';
  createdMeta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg><b>Creado</b>';
  const createdVal = document.createElement('span');
  createdVal.className = 'c-value';
  createdVal.textContent = node.dateText;
  createdMeta.appendChild(createdVal);
  footer.appendChild(createdMeta);

  const sep = document.createElement('span');
  sep.className = 'c-sep';
  sep.textContent = '|';
  footer.appendChild(sep);

  const authorMeta = document.createElement('span');
  authorMeta.className = 'c-meta';
  authorMeta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><b>Autor</b>';
  const authorVal = document.createElement('span');
  authorVal.className = 'c-value';
  authorVal.contentEditable = true;
  authorVal.dataset.placeholder = 'Nombre';
  authorVal.textContent = node.author || '';
  authorVal.addEventListener('input', ()=>{ node.author = authorVal.innerText; scheduleSave(); });
  authorVal.addEventListener('pointerdown', e=>e.stopPropagation());
  authorMeta.appendChild(authorVal);
  footer.appendChild(authorMeta);

  content.appendChild(footer);
}

function buildConclusionTag(node, index){
  const tag = document.createElement('span');
  tag.className = 'c-tag';
  tag.style.background = C_TAG_PALETTE[index % C_TAG_PALETTE.length];

  const text = document.createElement('span');
  text.className = 'c-tag-text';
  text.contentEditable = true;
  text.dataset.placeholder = 'etiqueta';
  text.textContent = node.tags[index] || '';
  text.addEventListener('input', ()=>{ node.tags[index] = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  tag.appendChild(text);

  const del = document.createElement('span');
  del.className = 'c-tag-del';
  del.textContent = '✕';
  del.addEventListener('pointerdown', e=>e.stopPropagation());
  del.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.tags.splice(index, 1);
    scheduleSave();
    render();
  });
  tag.appendChild(del);

  return tag;
}

function buildCaseContent(content, node){
  const caseEntry = getStore().index.find(c=>c.id === node.caseId);
  const caseData = getStore().cases[node.caseId] || caseEntry;

  // El caso añadido desde el + mantiene la misma composición visual
  // de la ficha principal: CASO + nombre + descripción + estado.
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'CASO';
  content.appendChild(label);

  const title = document.createElement('div');
  title.className = 'marker-title';
  title.textContent = caseData?.title || 'Caso no encontrado';
  content.appendChild(title);

  const desc = document.createElement('div');
  desc.className = 'marker-desc';
  desc.textContent = caseData?.description || '';
  content.appendChild(desc);

  const badge = document.createElement('span');
  badge.className = 'status-badge status-' + (caseData?.status || 'abierto');
  badge.textContent = statusLabel(caseData?.status);
  content.appendChild(badge);

  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'case-go-btn';
  goBtn.textContent = 'IR AL CASO →';
  goBtn.title = 'Abrir este caso';
  goBtn.addEventListener('pointerdown', e=>e.stopPropagation());
  goBtn.addEventListener('click', e=>{
    e.stopPropagation();
    if(node.caseId && getStore().cases[node.caseId]){
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('case', node.caseId);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    }
  });
  content.appendChild(goBtn);
}

function hypothesisDisplayId(node){
  const hs = getState().nodes.filter(n=>n.type==='hypothesis');
  const idx = hs.indexOf(node) + 1;
  return 'H-' + String(idx || hs.length).padStart(4, '0');
}

const H_TAG_PALETTE = [
  'rgba(111,143,189,.35)',
  'rgba(111,147,132,.4)',
  'rgba(201,161,90,.45)'
];

function buildHypothesisContent(content, node){
  if(!node.tags) node.tags = [];
  if(!node.dateText) node.dateText = todayEs();

  const head = document.createElement('div');
  head.className = 'h-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'h-head-left';
  headLeft.innerHTML = '<svg class="h-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.7V16h5.4v-.4c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3z"/></svg>';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelFor(node.type);
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const idBadge = document.createElement('span');
  idBadge.className = 'h-id';
  idBadge.textContent = 'ID: ' + hypothesisDisplayId(node);
  head.appendChild(idBadge);

  content.appendChild(head);

  const dividerTop = document.createElement('div');
  dividerTop.className = 'h-divider top';
  content.appendChild(dividerTop);

  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Escribe la hipótesis…';
  text.textContent = node.text;
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(text);

  content.appendChild(Object.assign(document.createElement('div'), { className:'h-divider' }));

  const tagsRow = document.createElement('div');
  tagsRow.className = 'h-tags-row';
  const tagsLabel = document.createElement('div');
  tagsLabel.className = 'h-tags-label';
  tagsLabel.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V6a1 1 0 0 1 1-1h6l11 11-7 7L3 12z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg><span>Etiquetas</span>';
  tagsRow.appendChild(tagsLabel);

  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'h-tags';
  node.tags.forEach((tagValue, i)=>{
    tagsWrap.appendChild(buildHypothesisTag(node, i));
  });

  const addTagBtn = document.createElement('button');
  addTagBtn.className = 'h-tag-add';
  addTagBtn.type = 'button';
  addTagBtn.textContent = '+ etiqueta';
  addTagBtn.addEventListener('pointerdown', e=>e.stopPropagation());
  addTagBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.tags.push('');
    scheduleSave();
    render();
    setTimeout(()=>{
      const els = document.querySelectorAll(`[data-id="${node.id}"] .h-tag-text`);
      const last = els[node.tags.length - 1];
      if(last){ setEditSessionEl(last); last.focus(); }
    }, 30);
  });
  tagsWrap.appendChild(addTagBtn);

  tagsRow.appendChild(tagsWrap);
  content.appendChild(tagsRow);

  const footer = document.createElement('div');
  footer.className = 'h-footer';

  const createdMeta = document.createElement('span');
  createdMeta.className = 'h-meta';
  createdMeta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg><b>Creado</b>';
  const createdVal = document.createElement('span');
  createdVal.className = 'h-value';
  createdVal.textContent = node.dateText;
  createdMeta.appendChild(createdVal);
  footer.appendChild(createdMeta);

  const sep = document.createElement('span');
  sep.className = 'h-sep';
  sep.textContent = '|';
  footer.appendChild(sep);

  const authorMeta = document.createElement('span');
  authorMeta.className = 'h-meta';
  authorMeta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><b>Autor</b>';
  const authorVal = document.createElement('span');
  authorVal.className = 'h-value';
  authorVal.contentEditable = true;
  authorVal.dataset.placeholder = 'Nombre';
  authorVal.textContent = node.author || '';
  authorVal.addEventListener('input', ()=>{ node.author = authorVal.innerText; scheduleSave(); });
  authorVal.addEventListener('pointerdown', e=>e.stopPropagation());
  authorMeta.appendChild(authorVal);
  footer.appendChild(authorMeta);

  content.appendChild(footer);
}

function buildHypothesisTag(node, index){
  const tag = document.createElement('span');
  tag.className = 'h-tag';
  tag.style.background = H_TAG_PALETTE[index % H_TAG_PALETTE.length];

  const text = document.createElement('span');
  text.className = 'h-tag-text';
  text.contentEditable = true;
  text.dataset.placeholder = 'etiqueta';
  text.textContent = node.tags[index] || '';
  text.addEventListener('input', ()=>{ node.tags[index] = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  tag.appendChild(text);

  const del = document.createElement('span');
  del.className = 'h-tag-del';
  del.textContent = '✕';
  del.addEventListener('pointerdown', e=>e.stopPropagation());
  del.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.tags.splice(index, 1);
    scheduleSave();
    render();
  });
  tag.appendChild(del);

  return tag;
}

function noteDisplayId(node){
  const notes = getState().nodes.filter(n=>n.type==='note');
  const idx = notes.indexOf(node) + 1;
  return 'N-' + String(idx || notes.length).padStart(4, '0');
}

function questionDisplayId(node){
  const qs = getState().nodes.filter(n=>n.type==='question');
  const idx = qs.indexOf(node) + 1;
  return 'Q-' + String(idx || qs.length).padStart(4, '0');
}

function buildQuestionContent(content, node){
  if(!node.tags) node.tags = [];

  const head = document.createElement('div');
  head.className = 'q-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'q-head-left';
  const icon = document.createElement('span');
  icon.className = 'q-icon';
  icon.textContent = '?';
  headLeft.appendChild(icon);
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelFor(node.type);
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const idBadge = document.createElement('span');
  idBadge.className = 'q-id';
  idBadge.textContent = 'ID: ' + questionDisplayId(node);
  head.appendChild(idBadge);

  content.appendChild(head);

  const title = document.createElement('div');
  title.className = 'q-title';
  title.contentEditable = true;
  title.dataset.placeholder = 'Escribe la pregunta…';
  title.textContent = node.qTitle || '';
  title.addEventListener('input', ()=>{ node.qTitle = title.textContent; scheduleSave(); });
  title.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(title);

  content.appendChild(Object.assign(document.createElement('div'), { className:'q-divider' }));

  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Añade contexto o detalles…';
  text.textContent = node.text;
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(text);

  content.appendChild(Object.assign(document.createElement('div'), { className:'q-divider' }));

  const tagsRow = document.createElement('div');
  tagsRow.className = 'q-tags-row';
  const tagsLabel = document.createElement('div');
  tagsLabel.className = 'q-tags-label';
  tagsLabel.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V6a1 1 0 0 1 1-1h6l11 11-7 7L3 12z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg><span>Etiquetas</span>';
  tagsRow.appendChild(tagsLabel);

  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'q-tags';

  node.tags.forEach((tagValue, i)=>{
    tagsWrap.appendChild(buildQuestionTag(node, i, false));
  });

  if(node.priority){
    tagsWrap.appendChild(buildQuestionPriorityChip(node));
  }

  const addTagBtn = document.createElement('button');
  addTagBtn.className = 'q-tag-add';
  addTagBtn.type = 'button';
  addTagBtn.textContent = '+ etiqueta';
  addTagBtn.addEventListener('pointerdown', e=>e.stopPropagation());
  addTagBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.tags.push('');
    scheduleSave();
    render();
    setTimeout(()=>{
      const els = document.querySelectorAll(`[data-id="${node.id}"] .q-tag-text`);
      const last = els[node.tags.length - 1];
      if(last){ setEditSessionEl(last); last.focus(); }
    }, 30);
  });
  tagsWrap.appendChild(addTagBtn);

  if(!node.priority){
    const addPriorityBtn = document.createElement('button');
    addPriorityBtn.className = 'q-tag-add';
    addPriorityBtn.type = 'button';
    addPriorityBtn.textContent = '+ prioridad';
    addPriorityBtn.addEventListener('pointerdown', e=>e.stopPropagation());
    addPriorityBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushUndo();
      node.priority = 'Prioridad Alta';
      scheduleSave();
      render();
    });
    tagsWrap.appendChild(addPriorityBtn);
  }

  tagsRow.appendChild(tagsWrap);
  content.appendChild(tagsRow);

  if(!node.questionResolution) node.questionResolution='open';
  const resolutionRow=document.createElement('div');
  resolutionRow.className='q-resolution-row';
  const resolutionLabel=document.createElement('span');
  resolutionLabel.className='q-resolution-label';
  resolutionLabel.textContent='Resolución';
  resolutionRow.appendChild(resolutionLabel);
  const resolutionSelect=document.createElement('select');
  resolutionSelect.className='q-resolution-select';
  [['open','Abierta'],['answered','Respondida'],['inconclusive','Inconclusa']].forEach(([value,labelText])=>{
    const opt=document.createElement('option'); opt.value=value; opt.textContent=labelText; resolutionSelect.appendChild(opt);
  });
  resolutionSelect.value=node.questionResolution;
  resolutionSelect.addEventListener('pointerdown',e=>e.stopPropagation());
  resolutionSelect.addEventListener('change',()=>{ pushUndo(); node.questionResolution=resolutionSelect.value; scheduleSave(); render(); });
  resolutionRow.appendChild(resolutionSelect);
  content.appendChild(resolutionRow);

  if(!node.dateText) node.dateText = todayEs();

  const footer = document.createElement('div');
  footer.className = 'q-footer';

  const createdMeta = document.createElement('span');
  createdMeta.className = 'q-meta';
  createdMeta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg><b>Creado</b>';
  const createdVal = document.createElement('span');
  createdVal.className = 'q-value';
  createdVal.textContent = node.dateText;
  createdMeta.appendChild(createdVal);
  footer.appendChild(createdMeta);

  const sep = document.createElement('span');
  sep.className = 'q-sep';
  sep.textContent = '|';
  footer.appendChild(sep);

  const authorMeta = document.createElement('span');
  authorMeta.className = 'q-meta';
  authorMeta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><b>Autor</b>';
  const authorVal = document.createElement('span');
  authorVal.className = 'q-value';
  authorVal.contentEditable = true;
  authorVal.dataset.placeholder = 'Nombre';
  authorVal.textContent = node.author || '';
  authorVal.addEventListener('input', ()=>{ node.author = authorVal.innerText; scheduleSave(); });
  authorVal.addEventListener('pointerdown', e=>e.stopPropagation());
  authorMeta.appendChild(authorVal);
  footer.appendChild(authorMeta);

  content.appendChild(footer);
}

function buildQuestionTag(node, index){
  const tag = document.createElement('span');
  tag.className = 'q-tag';

  const text = document.createElement('span');
  text.className = 'q-tag-text';
  text.contentEditable = true;
  text.dataset.placeholder = 'etiqueta';
  text.textContent = node.tags[index] || '';
  text.addEventListener('input', ()=>{ node.tags[index] = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  tag.appendChild(text);

  const del = document.createElement('span');
  del.className = 'q-tag-del';
  del.textContent = '✕';
  del.addEventListener('pointerdown', e=>e.stopPropagation());
  del.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.tags.splice(index, 1);
    scheduleSave();
    render();
  });
  tag.appendChild(del);

  return tag;
}

function buildQuestionPriorityChip(node){
  const tag = document.createElement('span');
  tag.className = 'q-tag priority';
  tag.innerHTML = '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="none"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.3l7.1-.7z"/></svg>';

  const text = document.createElement('span');
  text.className = 'q-tag-text';
  text.contentEditable = true;
  text.textContent = node.priority || '';
  text.addEventListener('input', ()=>{ node.priority = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  tag.appendChild(text);

  const del = document.createElement('span');
  del.className = 'q-tag-del';
  del.textContent = '✕';
  del.addEventListener('pointerdown', e=>e.stopPropagation());
  del.addEventListener('click', (e)=>{
    e.stopPropagation();
    pushUndo();
    node.priority = '';
    scheduleSave();
    render();
  });
  tag.appendChild(del);

  return tag;
}

function buildNoteContent(content, node){
  const NOTE_COLORS = [
    { name:'Rojo', value:'#d95c5c' },
    { name:'Naranja', value:'#e39a4a' },
    { name:'Amarillo', value:'#e3c84a' },
    { name:'Verde', value:'#76ad69' },
    { name:'Azul', value:'#668fc7' },
    { name:'Morado', value:'#8d6bb3' },
    { name:'Blanco', value:'#d1cbbc' }
  ];

  if(!node.noteColor) node.noteColor = '#d1cbbc';

  const cardEl = content.closest('.card.note');
  if(cardEl) cardEl.style.setProperty('--note-bg', node.noteColor);
  if(cardEl) cardEl.style.background = node.noteColor;

  const head = document.createElement('div');
  head.className = 'note-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'note-head-left';
  headLeft.innerHTML = '<svg class="note-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.7V16h5.4v-.4c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3z"/></svg>';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelFor(node.type);
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const headMeta = document.createElement('div');
  headMeta.className = 'note-head-meta';

  const idBadge = document.createElement('span');
  idBadge.className = 'note-id';
  idBadge.textContent = 'ID: ' + noteDisplayId(node);
  headMeta.appendChild(idBadge);

  const colorWrap = document.createElement('div');
  colorWrap.className = 'note-color-wrap';

  const colorBtn = document.createElement('button');
  colorBtn.type = 'button';
  colorBtn.className = 'note-color-btn';
  colorBtn.title = 'Cambiar color de fondo';
  colorBtn.style.background = node.noteColor;
  colorBtn.addEventListener('pointerdown', e=>e.stopPropagation());
  colorBtn.addEventListener('click', e=>{
    e.stopPropagation();
    const existing = colorWrap.querySelector('.note-color-palette');
    if(existing){ existing.remove(); return; }

    const palette = document.createElement('div');
    palette.className = 'note-color-palette';
    NOTE_COLORS.forEach(color=>{
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'note-color-swatch' + (node.noteColor === color.value ? ' active' : '');
      swatch.style.background = color.value;
      swatch.title = color.name;
      swatch.setAttribute('aria-label', 'Color ' + color.name);
      swatch.addEventListener('pointerdown', ev=>ev.stopPropagation());
      swatch.addEventListener('click', ev=>{
        ev.stopPropagation();
        pushUndo();
        node.noteColor = color.value;
        scheduleSave();
        render();
      });
      palette.appendChild(swatch);
    });
    colorWrap.appendChild(palette);
  });
  colorWrap.appendChild(colorBtn);
  headMeta.appendChild(colorWrap);
  head.appendChild(headMeta);

  content.appendChild(head);

  const dividerTop = document.createElement('div');
  dividerTop.className = 'note-divider top';
  content.appendChild(dividerTop);

  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Escribe la nota…';
  text.textContent = node.text;
  text.addEventListener('input', ()=>{ node.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(text);

  const dividerBottom = document.createElement('div');
  dividerBottom.className = 'note-divider';
  content.appendChild(dividerBottom);

  if(!node.questionResolution) node.questionResolution='open';
  const resolutionRow=document.createElement('div');
  resolutionRow.className='q-resolution-row';
  const resolutionLabel=document.createElement('span');
  resolutionLabel.className='q-resolution-label';
  resolutionLabel.textContent='Resolución';
  resolutionRow.appendChild(resolutionLabel);
  const resolutionSelect=document.createElement('select');
  resolutionSelect.className='q-resolution-select';
  [['open','Abierta'],['answered','Respondida'],['inconclusive','Inconclusa']].forEach(([value,labelText])=>{
    const opt=document.createElement('option'); opt.value=value; opt.textContent=labelText; resolutionSelect.appendChild(opt);
  });
  resolutionSelect.value=node.questionResolution;
  resolutionSelect.addEventListener('pointerdown',e=>e.stopPropagation());
  resolutionSelect.addEventListener('change',()=>{ pushUndo(); node.questionResolution=resolutionSelect.value; scheduleSave(); render(); });
  resolutionRow.appendChild(resolutionSelect);
  content.appendChild(resolutionRow);

  if(!node.dateText) node.dateText = todayEs();

  const footer = document.createElement('div');
  footer.className = 'note-footer';

  const tag = document.createElement('span');
  tag.className = 'note-tag';
  tag.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V6a1 1 0 0 1 1-1h6l11 11-7 7L3 12z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
  const tagText = document.createElement('span');
  tagText.className = 'note-tag-text';
  tagText.contentEditable = true;
  tagText.dataset.placeholder = 'Etiqueta';
  tagText.textContent = node.tag || '';
  tagText.addEventListener('input', ()=>{ node.tag = tagText.innerText; scheduleSave(); });
  tagText.addEventListener('pointerdown', e=>e.stopPropagation());
  tag.appendChild(tagText);
  footer.appendChild(tag);

  const sep = document.createElement('span');
  sep.className = 'note-sep';
  sep.textContent = '|';
  footer.appendChild(sep);

  const date = document.createElement('span');
  date.className = 'note-date';
  date.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';
  const dateText = document.createElement('span');
  dateText.className = 'note-date-text';
  dateText.textContent = node.dateText;
  date.appendChild(dateText);
  footer.appendChild(date);

  content.appendChild(footer);
}

function buildPersonAvatar(content, node){
  const avatar = document.createElement('div');
  avatar.className = 'person-avatar';
  avatar.title = node.photoData ? 'Pulsa para cambiar la foto' : 'Pulsa para subir una foto';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = 'photo-file-input';
  fileInput.setAttribute('aria-label','Adjuntar documento');
  fileInput.addEventListener('pointerdown', e=>e.stopPropagation());
  fileInput.addEventListener('click', e=>e.stopPropagation());
  fileInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    resizeImageFile(file, 260).then(dataUrl=>{
      pushUndo();
      node.photoData = dataUrl;
      save();
      render();
    }).catch(err=>{
      console.error('No se pudo procesar la imagen', err);
    });
  });

  if(node.photoData){
    avatar.style.backgroundImage = `url(${node.photoData})`;
    avatar.classList.add('has-photo');
  } else if(Array.isArray(node.attachments) && node.attachments[0]) {
    attachmentRepository.getUrl(node.attachments[0].id).then(url=>{ if(url){ avatar.style.backgroundImage=`url(${url})`; avatar.classList.add('has-photo'); } }).catch(()=>{});
  } else {
    avatar.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>';
  }

  avatar.addEventListener('pointerdown', e=>e.stopPropagation());
  avatar.addEventListener('click', (e)=>{
    e.stopPropagation();
    fileInput.click();
  });
  avatar.appendChild(fileInput);
  content.appendChild(avatar);
}

function buildPhotoContent(content, node){
  const photoBox = document.createElement('div');
  photoBox.className = 'photo-box';
  photoBox.title = node.photoData ? 'Pulsa para cambiar la foto' : 'Pulsa para subir una foto';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = 'photo-file-input';
  fileInput.setAttribute('aria-label','Adjuntar documento');
  fileInput.addEventListener('pointerdown', e=>e.stopPropagation());
  fileInput.addEventListener('click', e=>e.stopPropagation());
  fileInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(file.size > MAX_ATTACHMENT_SIZE){ alert(`La imagen supera el límite de ${Math.round(MAX_ATTACHMENT_SIZE/1024/1024)} MB.`); return; }
    resizeImageFile(file, 480).then(async dataUrl=>{
      pushUndo();
      try{
        const blob=attachmentRepository.dataUrlToBlob(dataUrl);
        const previousIds=Array.isArray(node.attachments)?node.attachments.map(a=>a.id).filter(Boolean):[];
        for(const id of previousIds) await attachmentRepository.deleteOne(id);
        const metadata=await attachmentRepository.putBlob(blob,createAttachment({sourceId:node.id,caseId:getCurrentCaseId() || '',type:'image',name:file.name,mimeType:blob.type||file.type||'image/jpeg',size:blob.size}));
        node.attachments=[metadata]; node.photoData=dataUrl;
        await save(); render();
      }catch(error){ console.error('No se pudo guardar la imagen',error); alert(error?.message||'No se pudo guardar la imagen.'); }
    }).catch(err=>{ console.error('No se pudo procesar la imagen',err); });
  });

  if(node.photoData){
    photoBox.style.backgroundImage = `url(${node.photoData})`;
    photoBox.classList.add('has-photo');
  } else if(Array.isArray(node.attachments) && node.attachments[0]) {
    attachmentRepository.getUrl(node.attachments[0].id).then(url=>{ if(url){ photoBox.style.backgroundImage=`url(${url})`; photoBox.classList.add('has-photo'); } }).catch(()=>{});
  } else {
    const uploadHint = document.createElement('div');
    uploadHint.className = 'photo-upload-hint';
    uploadHint.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M12 4l-4 4M12 4l4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><span>Subir foto</span>';
    photoBox.appendChild(uploadHint);
  }

  photoBox.addEventListener('pointerdown', e=>e.stopPropagation());
  photoBox.addEventListener('click', (e)=>{
    e.stopPropagation();
    fileInput.click();
  });

  photoBox.appendChild(fileInput);
  content.appendChild(photoBox);

  const caption = document.createElement('div');
  caption.className = 'photo-caption';
  caption.contentEditable = true;
  caption.dataset.placeholder = 'Doble clic para etiquetar';
  caption.textContent = node.text || '';
  caption.addEventListener('input', ()=>{ node.text = caption.innerText; scheduleSave(); });
  caption.addEventListener('pointerdown', e=>e.stopPropagation());
  content.appendChild(caption);
}

function resizeImageFile(file, maxSize){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('imagen inválida'));
      img.onload = () => {
        let { width, height } = img;
        if(width > height && width > maxSize){
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else if(height > maxSize){
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}


function ensureInlineConclusion(node){
  if(!node || typeof node !== 'object') return null;
  if(!node.conclusion || typeof node.conclusion !== 'object'){
    node.conclusion = {
      text: '',
      detail: '',
      resolved: false,
      expanded: true,
      dateText: todayEs()
    };
  }
  if(typeof node.conclusion.text !== 'string') node.conclusion.text = '';
  if(typeof node.conclusion.detail !== 'string') node.conclusion.detail = '';
  if(typeof node.conclusion.resolved !== 'boolean') node.conclusion.resolved = false;
  if(typeof node.conclusion.expanded !== 'boolean') node.conclusion.expanded = true;
  if(!node.conclusion.dateText) node.conclusion.dateText = todayEs();
  return node.conclusion;
}

function addConclusionToNode(node){
  if(!node) return false;
  pushUndo();
  const conclusion = ensureInlineConclusion(node);
  conclusion.expanded = true;
  save();
  render();
  return true;
}

function buildInlineConclusion(content, node){
  const conclusion = ensureInlineConclusion(node);

  const wrap = document.createElement('div');
  wrap.className = 'inline-conclusion' + (conclusion.resolved ? ' is-resolved' : '');

  const head = document.createElement('div');
  head.className = 'inline-conclusion-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'inline-conclusion-head-left';
  const icon = document.createElement('span');
  icon.className = 'inline-conclusion-icon';
  icon.textContent = '✓';
  headLeft.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'inline-conclusion-label';
  label.textContent = 'Conclusión';
  headLeft.appendChild(label);
  head.appendChild(headLeft);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'inline-conclusion-toggle';
  toggle.title = conclusion.expanded ? 'Ocultar conclusión' : 'Mostrar conclusión';
  toggle.textContent = conclusion.expanded ? '⌃' : '⌄';
  toggle.addEventListener('pointerdown', e=>e.stopPropagation());
  toggle.addEventListener('click', e=>{
    e.stopPropagation();
    pushUndo();
    conclusion.expanded = !conclusion.expanded;
    scheduleSave();
    render();
  });
  head.appendChild(toggle);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'inline-conclusion-remove';
  remove.textContent = '✕';
  remove.title = 'Quitar conclusión';
  remove.setAttribute('aria-label', 'Quitar conclusión');
  remove.addEventListener('pointerdown', e=>e.stopPropagation());
  remove.addEventListener('click', e=>{
    e.stopPropagation();
    pushUndo();
    delete node.conclusion;
    scheduleSave();
    render();
  });
  head.appendChild(remove);
  wrap.appendChild(head);

  const body = document.createElement('div');
  body.className = 'inline-conclusion-body' + (conclusion.expanded ? '' : ' is-collapsed');

  const text = document.createElement('div');
  text.className = 'inline-conclusion-text';
  text.contentEditable = true;
  text.dataset.placeholder = 'Escribe la conclusión…';
  text.textContent = conclusion.text || '';
  text.addEventListener('input', ()=>{ conclusion.text = text.innerText; scheduleSave(); });
  text.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(text);

  const detail = document.createElement('div');
  detail.className = 'inline-conclusion-detail';
  detail.contentEditable = true;
  detail.dataset.placeholder = 'Explicación o justificación (opcional)…';
  detail.textContent = conclusion.detail || '';
  detail.addEventListener('input', ()=>{ conclusion.detail = detail.innerText; scheduleSave(); });
  detail.addEventListener('pointerdown', e=>e.stopPropagation());
  body.appendChild(detail);

  const footer = document.createElement('div');
  footer.className = 'inline-conclusion-footer';

  const date = document.createElement('span');
  date.className = 'inline-conclusion-date';
  date.textContent = conclusion.dateText;
  footer.appendChild(date);

  if(conclusion.resolved){
    const resolved = document.createElement('button');
    resolved.type = 'button';
    resolved.className = 'inline-conclusion-resolved';
    resolved.textContent = 'RESUELTO';
    resolved.title = 'Clic para quitar el estado resuelto';
    resolved.addEventListener('pointerdown', e=>e.stopPropagation());
    resolved.addEventListener('click', e=>{
      e.stopPropagation();
      pushUndo();
      conclusion.resolved = false;
      scheduleSave();
      render();
    });
    footer.appendChild(resolved);
  } else {
    const resolvedAdd = document.createElement('button');
    resolvedAdd.type = 'button';
    resolvedAdd.className = 'inline-conclusion-resolved-add';
    resolvedAdd.textContent = '+ resuelto';
    resolvedAdd.title = 'Marcar esta conclusión como resuelta';
    resolvedAdd.addEventListener('pointerdown', e=>e.stopPropagation());
    resolvedAdd.addEventListener('click', e=>{
      e.stopPropagation();
      pushUndo();
      conclusion.resolved = true;
      scheduleSave();
      render();
    });
    footer.appendChild(resolvedAdd);
  }

  body.appendChild(footer);
  wrap.appendChild(body);
  content.appendChild(wrap);
}


  return {
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
  };
}
