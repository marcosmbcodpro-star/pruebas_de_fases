// MindPlace - Card contextual UI and auxiliary menus

export function createCardUiControls({
  boardEl,
  getStore,
  addNodeFrom,
  startLinkFrom,
  getConclusionOwner,
  pushUndo,
  scheduleSave,
  render,
  drawStrings
}) {
  function addCaseLinkFrom(sourceId, caseId){
    if(!caseId) return;
    addNodeFrom('case', sourceId, { caseId });
  }

  function closeAllPlusMenus(){
    document.querySelectorAll('.plus-menu').forEach(m=>{
      if(m.__reposition){
        window.removeEventListener('resize', m.__reposition);
        boardEl.removeEventListener('scroll', m.__reposition);
      }
      m.remove();
    });
    document.querySelectorAll('[data-plus-open="1"]').forEach(c=> c.removeAttribute('data-plus-open'));
  }

  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.plus-menu') && !e.target.closest('.plus-btn')){
      closeAllPlusMenus();
    }
  });

  // Tamaños mínimos = el tamaño con el que cada tipo se crea hoy por defecto
  const MIN_SIZES = {
    note:       { w: 210, h: 150 },
    question:   { w: 250, h: 230 },
    hypothesis: { w: 220, h: 200 },
    conclusion: { w: 240, h: 220 },
    tag:        { w: 220, h: 190 },
    case:       { w: 262, h: 140 },
    photo:      { w: 190, h: 236 },
    evidence:   { w: 250, h: 260 },
    person:     { w: 194, h: 150 },
    document:   { w: 250, h: 300 }
  };

  function addPlusButton(cardEl, sourceId){
    const inFarPreview = !!cardEl.closest?.('#farPreview');
    const plus = document.createElement('button');
    plus.className = 'plus-btn';
    plus.textContent = '+';
    plus.title = 'Añadir elemento conectado';
    plus.addEventListener('pointerdown', e=>e.stopPropagation());
    plus.addEventListener('click', (e)=>{
      e.stopPropagation();
      const wasOpen = cardEl.dataset.plusOpen === '1';
      closeAllPlusMenus();
      if(wasOpen) return; // click de nuevo sobre el mismo + cierra el menú
      cardEl.dataset.plusOpen = '1';

      const menu = document.createElement('div');
      menu.className = 'plus-menu viewport-safe';

      // El menú se monta en <body> y usa coordenadas de pantalla.
      // Así, con cualquier nivel de zoom, siempre puede recolocarse dentro
      // de la ventana y no se corta por los bordes del tablero.
      document.body.appendChild(menu);

      const positionPlusMenu = ()=>{
        const r = cardEl.getBoundingClientRect();
        const gap = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuW = Math.min(260, Math.max(120, menu.offsetWidth || 170));
        const menuH = Math.min(vh - 16, menu.offsetHeight || 220);

        let left = r.right - menuW;
        if(left < 8) left = 8;
        if(left + menuW > vw - 8) left = vw - menuW - 8;

        let top = r.bottom + gap;
        if(top + menuH > vh - 8){
          top = r.top - menuH - gap;
        }
        if(top < 8) top = 8;
        if(top + menuH > vh - 8) top = vh - menuH - 8;

        menu.style.left = Math.round(left) + 'px';
        menu.style.top = Math.round(top) + 'px';
      };
      menu.__reposition = positionPlusMenu;
      positionPlusMenu();
      requestAnimationFrame(positionPlusMenu);
      window.addEventListener('resize', positionPlusMenu, { passive:true });
      boardEl.addEventListener('scroll', positionPlusMenu, { passive:true });

      const owner = getConclusionOwner(sourceId);
      const hasConclusion = !!(owner && owner.conclusion);
      const PLUS_OPTIONS = [
        ['note',       'opt-note',       '📝 Nota/Hipótesis', 'Nota o hipótesis para analizar y desarrollar'],
        ['question',   'opt-question',   '❓ Pregunta',       'Duda o interrogante todavía sin resolver'],
        ['evidence',   'opt-evidence',   '📎 Evidencia',      'Información o elemento que aporta pruebas'],
        ...(hasConclusion ? [] : [['conclusion', 'opt-conclusion', '✅ Conclusión', 'Texto explicativo que pertenece a esta tarjeta']]),
        ['case',       'opt-case',       '▣ Caso',            'Enlaza con un caso existente']
      ];
      PLUS_OPTIONS.forEach(([type, cls, label, hint])=>{
        const btn = document.createElement('button');
        btn.className = cls;
        btn.textContent = label;
        btn.title = hint;
        btn.addEventListener('pointerdown', e=>e.stopPropagation());
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();

          if(type === 'case'){
            const existing = menu.querySelector('.case-picker');
            const evidence = menu.querySelector('.evidence-picker');
            if(evidence) evidence.remove();
            if(existing){ existing.remove(); return; }

            const picker = document.createElement('div');
            picker.className = 'case-picker';
            const pickerTitle = document.createElement('div');
            pickerTitle.className = 'case-picker-title';
            pickerTitle.textContent = 'Elegir caso existente';
            picker.appendChild(pickerTitle);

            const cases = [...getStore().index].sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0));
            if(cases.length === 0){
              const empty = document.createElement('div');
              empty.className = 'case-empty';
              empty.textContent = 'No hay casos creados todavía.';
              picker.appendChild(empty);
            } else {
              cases.forEach(c=>{
                const caseBtn = document.createElement('button');
                caseBtn.type = 'button';
                caseBtn.className = 'case-choice';
                caseBtn.textContent = c.title || 'CASO SIN TÍTULO';
                caseBtn.title = c.description || caseBtn.textContent;
                caseBtn.addEventListener('pointerdown', ev=>ev.stopPropagation());
                caseBtn.addEventListener('click', (ev)=>{
                  ev.stopPropagation();
                  addCaseLinkFrom(sourceId, c.id);
                  closeAllPlusMenus();
                });
                picker.appendChild(caseBtn);
              });
            }
            menu.appendChild(picker);
            return;
          }

          if(type === 'conclusion'){
            addNodeFrom('conclusion', sourceId);
            closeAllPlusMenus();
            return;
          }

          if(type === 'evidence'){
            const existing = menu.querySelector('.evidence-picker');
            const cases = menu.querySelector('.case-picker');
            if(cases) cases.remove();
            if(existing){ existing.remove(); return; }

            const picker = document.createElement('div');
            picker.className = 'evidence-picker';
            const pickerTitle = document.createElement('div');
            pickerTitle.className = 'evidence-picker-title';
            pickerTitle.textContent = 'Tipo de evidencia';
            picker.appendChild(pickerTitle);

            const evidenceOptions = [
              ['photo', '📷 Foto'],
              ['document', '📄 Documento'],
              ['person', '👤 Persona']
            ];

            evidenceOptions.forEach(([evidenceType, evidenceLabel])=>{
              const evidenceBtn = document.createElement('button');
              evidenceBtn.type = 'button';
              evidenceBtn.className = 'evidence-choice';
              evidenceBtn.textContent = evidenceLabel;
              evidenceBtn.addEventListener('pointerdown', ev=>ev.stopPropagation());
              evidenceBtn.addEventListener('click', ev=>{
                ev.stopPropagation();
                addNodeFrom(evidenceType, sourceId);
                closeAllPlusMenus();
              });
              picker.appendChild(evidenceBtn);
            });

            menu.appendChild(picker);
            return;
          }

          addNodeFrom(type, sourceId);
          closeAllPlusMenus();
        });
        menu.appendChild(btn);
      });
      const linkBtn = document.createElement('button');
      linkBtn.className = 'opt-link';
      linkBtn.textContent = '🔗 Conectar';
      linkBtn.title = 'Une esta etiqueta con otra ya existente mediante un hilo';
      linkBtn.addEventListener('pointerdown', e=>e.stopPropagation());
      linkBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        startLinkFrom(sourceId, cardEl);
        closeAllPlusMenus();
      });
      menu.appendChild(linkBtn);

      // El menú ya está montado en <body> y se posiciona con coordenadas de pantalla
      // calculadas desde getBoundingClientRect(). No volver a moverlo a #zoomWrap,
      // porque eso mezcla coordenadas de viewport con coordenadas del tablero.
    });
    cardEl.appendChild(plus);
  }

  function addConclusionStatusIcon(container, conclusion){
    if(!conclusion || typeof conclusion !== 'object') return null;
    const icon = document.createElement('div');
    icon.className = 'conclusion-status-icon';
    icon.textContent = '✓';
    icon.title = 'Esta etiqueta tiene una conclusión';
    icon.setAttribute('aria-label','Esta etiqueta tiene una conclusión');
    container.appendChild(icon);
    return icon;
  }

  const caseSummaryOverlay = document.getElementById('caseSummaryOverlay');
  const caseSummaryClose = document.getElementById('caseSummaryClose');
  const caseSummaryTitle = document.getElementById('caseSummaryTitle');
  const caseSummaryStats = document.getElementById('caseSummaryStats');
  const caseSummaryNotice = document.getElementById('caseSummaryNotice');
  const caseSummaryPending = document.getElementById('caseSummaryPending');

  const NODE_STATES = {
    normal:    { label:'Normal',     icon:'○', className:'status-normal',    title:'Estado normal' },
    pending:   { label:'Pendiente',  icon:'⏳', className:'status-pending',   title:'Pendiente: necesita trabajo, comprobación o desarrollo' },
    validated: { label:'Validado',   icon:'✓', className:'status-validated', title:'Validado: información comprobada por el usuario' },
    discarded: { label:'Descartado', icon:'✕', className:'status-discarded', title:'Descartado: ya no se considera válido o útil' }
  };

  function normalizeNodeState(node){
    if(!NODE_STATES[node.status]) node.status = 'normal';
    return node.status;
  }

  function closeAllStatusMenus(){
    document.querySelectorAll('.status-menu').forEach(menu=>{
      if(menu.__cleanup) menu.__cleanup();
      else menu.remove();
    });
  }

  function addCardStateButton(cardEl, node){
    normalizeNodeState(node);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-state-btn ' + NODE_STATES[node.status].className;
    btn.textContent = NODE_STATES[node.status].icon;
    btn.title = 'Estado: ' + NODE_STATES[node.status].label;
    btn.setAttribute('aria-label', 'Cambiar estado: ' + NODE_STATES[node.status].label);

    btn.addEventListener('pointerdown', e=>e.stopPropagation());
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      closeAllStatusMenus();

      const menu = document.createElement('div');
      menu.className = 'status-menu';
      document.body.appendChild(menu);

      const options = [
        ['normal','○ Normal','state-normal'],
        ['pending','⏳ Pendiente','state-pending'],
        ['validated','✓ Validado','state-validated'],
        ['discarded','✕ Descartado','state-discarded']
      ];

      options.forEach(([key,label,cls])=>{
        const option = document.createElement('button');
        option.type = 'button';
        option.className = cls;
        option.textContent = label;
        option.addEventListener('pointerdown', ev=>ev.stopPropagation());
        option.addEventListener('click', ev=>{
          ev.stopPropagation();
          if(node.status !== key) pushUndo();
          node.status = key;
          scheduleSave();
          closeAllStatusMenus();
          render();
          setTimeout(()=>{
            const fresh = document.querySelector(`[data-id="${CSS.escape(node.id)}"] .card-state-btn`);
            if(fresh) fresh.focus({preventScroll:true});
          }, 0);
        });
        menu.appendChild(option);
      });

      const position = ()=>{
        const r = btn.getBoundingClientRect();
        const mw = menu.offsetWidth || 148;
        const mh = menu.offsetHeight || 150;
        const gap = 7;
        let left = r.left;
        let top = r.bottom + gap;
        if(left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
        if(left < 8) left = 8;
        if(top + mh > window.innerHeight - 8) top = r.top - mh - gap;
        if(top < 8) top = 8;
        menu.style.left = Math.round(left) + 'px';
        menu.style.top = Math.round(top) + 'px';
      };

      const onResize = ()=>position();
      const onScroll = ()=>position();
      const onOutside = ev=>{
        if(ev.target === btn || menu.contains(ev.target)) return;
        closeAllStatusMenus();
      };

      menu.__cleanup = ()=>{
        window.removeEventListener('resize', onResize);
        boardEl.removeEventListener('scroll', onScroll);
        document.removeEventListener('pointerdown', onOutside, true);
        menu.remove();
      };

      position();
      requestAnimationFrame(position);
      window.addEventListener('resize', onResize, {passive:true});
      boardEl.addEventListener('scroll', onScroll, {passive:true});
      document.addEventListener('pointerdown', onOutside, true);
    });

    cardEl.appendChild(btn);
  }

  function addCardFavoriteButton(cardEl, node){
    if(!node || node.id === '__case__') return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-favorite-btn' + (node.favorite ? ' is-favorite' : '');
    btn.textContent = node.favorite ? '★' : '☆';
    btn.title = node.favorite ? 'Quitar de favoritas' : 'Marcar como favorita';
    btn.setAttribute('aria-label', node.favorite ? 'Quitar de favoritas' : 'Marcar como favorita');
    btn.setAttribute('aria-pressed', node.favorite ? 'true' : 'false');

    btn.addEventListener('pointerdown', e=>e.stopPropagation());
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      pushUndo();
      node.favorite = !node.favorite;
      scheduleSave();
      render();
      drawStrings();
      requestAnimationFrame(()=>{
        const fresh = document.querySelector(`[data-id="${CSS.escape(node.id)}"] .card-favorite-btn`);
        if(fresh) fresh.focus({preventScroll:true});
      });
    });

    cardEl.appendChild(btn);
  }

  return {
    MIN_SIZES,
    addCaseLinkFrom,
    closeAllPlusMenus,
    addPlusButton,
    addConclusionStatusIcon,
    normalizeNodeState,
    closeAllStatusMenus,
    addCardStateButton,
    addCardFavoriteButton
  };
}
