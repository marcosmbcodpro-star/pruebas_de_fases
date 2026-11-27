export const DEMO_ID = 'peluqueria-demo';
export const DEMO_VERSION = 'v11-iluminacion-al-arrastrar';

function makeDemoNode(id, type, x, y, text = '', extra = {}) {
  return Object.assign({
    id, type, x, y, text,
    dateText: '14/08/2026',
    favorite: false,
    category: '',
    status: ''
  }, extra);
}

const caseDescription = 'Ejemplo completo: cómo plantear y validar el proyecto de montar una peluquería usando preguntas, notas/hipótesis, fotos, documentos, personas y conclusiones.';

const finalCaseConclusion = {
  text: 'La idea es viable como proyecto, pero solo debería pasar a la inversión definitiva después de validar demanda, local, costes, precios y captación de clientes.',
  detail: 'La conclusión global resume las conclusiones de las preguntas del tablero. Antes de abrir, hay que confirmar con datos reales que el local, la inversión inicial, el precio medio y el número de clientes diarios permiten mantener el negocio con margen.',
  resolved: false,
  expanded: true,
  dateText: '14/08/2026'
};

export function buildPeluqueriaDemo() {
  const nodes = [
    makeDemoNode('p02', 'question', 260, 100, '¿Qué tipo de peluquería quiero montar?', {
      qTitle: '¿Qué tipo de peluquería quiero montar?',
      text: 'Definir el concepto, el público, la especialización y la experiencia que quiero ofrecer antes de tomar decisiones de inversión.',
      tags: ['Posicionamiento', 'Concepto'],
      priority: 'Alta',
      conclusion: {
        text: 'Conviene empezar con una peluquería pequeña y especializada en una propuesta clara, en lugar de intentar ofrecerlo todo desde el principio.',
        detail: 'La propuesta debe ser entendible en pocos segundos y permitir que el cliente sepa por qué elegir esta peluquería.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),
    makeDemoNode('p03', 'question', 260, 380, '¿Quién sería mi cliente principal?', {
      qTitle: '¿Quién sería mi cliente principal?',
      text: 'Necesito saber a quién quiero atraer para decidir servicios, precios, horarios, ubicación y comunicación.',
      tags: ['Cliente', 'Necesidades'],
      priority: 'Alta',
      conclusion: {
        text: 'El cliente objetivo inicial serían personas de 25 a 45 años que valoran trato cercano, rapidez y reserva sencilla.',
        detail: 'Esta conclusión debe contrastarse con entrevistas y observación real de clientes de la zona.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),
    makeDemoNode('p04', 'question', 260, 660, '¿Hay suficiente demanda y competencia en la zona?', {
      qTitle: '¿Hay suficiente demanda y competencia en la zona?',
      text: 'Comparar peluquerías cercanas, precios, ocupación visible, horarios, reseñas y servicios para saber si existe una oportunidad real.',
      tags: ['Mercado', 'Zona'],
      priority: 'Alta',
      conclusion: {
        text: 'Existe oportunidad si se encuentra una zona con demanda suficiente y una propuesta que no sea un simple duplicado de la competencia.',
        detail: 'La decisión final depende de datos de visitas, precios, ocupación y características del local.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),
    makeDemoNode('p05', 'question', 260, 940, '¿Cuánto dinero necesito para abrir?', {
      qTitle: '¿Cuánto dinero necesito para abrir?',
      text: 'Separar inversión inicial, gastos mensuales y colchón de seguridad antes de comprometerse con un local.',
      tags: ['Presupuesto', 'Inversión'],
      priority: 'Alta',
      conclusion: {
        text: 'La inversión debe calcularse con presupuestos reales y con un colchón suficiente para soportar los primeros meses.',
        detail: 'No basta con sumar mobiliario y reforma; también deben contemplarse licencias, stock, suministros y caja operativa.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),
    makeDemoNode('p06', 'question', 260, 1220, '¿Qué servicios ofrecer y qué precio/coste tendría cada uno?', {
      qTitle: '¿Qué servicios ofrecer y qué precio/coste tendría cada uno?',
      text: 'Definir una carta inicial de servicios y calcular coste, tiempo y precio para comprobar cuáles son realmente rentables.',
      tags: ['Servicios', 'Precio', 'Coste'],
      priority: 'Alta',
      conclusion: {
        text: 'La carta inicial debe centrarse en servicios con demanda demostrable y margen suficiente, evitando complicarla demasiado.',
        detail: 'Cada servicio debe valorarse por precio de venta, coste de producto, tiempo de trabajo y demanda esperada.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),
    makeDemoNode('p07', 'question', 260, 1500, '¿Cómo conseguiré los primeros clientes?', {
      qTitle: '¿Cómo conseguiré los primeros clientes?',
      text: 'Definir una prueba de captación antes de gastar mucho en publicidad: recomendaciones, redes, reserva previa y oferta de lanzamiento.',
      tags: ['Marketing', 'Primeros clientes'],
      conclusion: {
        text: 'La captación inicial debería probarse con acciones pequeñas y medibles antes de aumentar el gasto en publicidad.',
        detail: 'Hay que comprobar qué canal trae clientes reales y qué coste tiene conseguir cada uno.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),
    makeDemoNode('p08', 'question', 260, 1780, '¿Cuántos clientes al día necesito para que sea rentable?', {
      qTitle: '¿Cuántos clientes al día necesito para que sea rentable?',
      text: 'Convertir costes, tiempo de trabajo y ticket medio en un objetivo diario que permita saber cuándo el negocio cubre sus gastos.',
      tags: ['Punto de equilibrio', 'Ventas'],
      priority: 'Alta',
      conclusion: {
        text: 'El objetivo diario debe salir de los costes reales y del ticket medio validado, no de una estimación optimista.',
        detail: 'Con ese dato se puede comprobar si el volumen necesario es razonable para el local, los horarios y el número de profesionales.',
        resolved: false,
        expanded: true,
        dateText: '14/08/2026'
      }
    }),

    makeDemoNode('p11', 'note', 600, 100, 'Hipótesis: una propuesta especializada y fácil de explicar puede diferenciar mejor a la peluquería.', {
      category: 'Posicionamiento',
      important: true,
      noteColor: '#668fc7'
    }),
    makeDemoNode('p12', 'person', 840, 100, 'Javier — profesional del sector', {
      personName: 'Javier',
      category: 'Referencia sectorial',
      author: 'Entrevista'
    }),

    makeDemoNode('p13', 'person', 600, 380, 'Laura — clienta potencial', {
      personName: 'Laura',
      category: 'Cliente objetivo',
      author: 'Entrevista'
    }),
    makeDemoNode('p14', 'photo', 840, 380, 'Observación de clientes en peluquerías de la zona', {
      category: 'Cliente',
      caption: 'Foto de observación de horarios y ocupación visible.',
      dateText: '14/08/2026'
    }),

    makeDemoNode('p15', 'photo', 600, 660, 'Fachadas y escaparates de peluquerías cercanas', {
      category: 'Competencia',
      caption: 'Comparativa visual de ubicación, visibilidad y propuesta.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p16', 'document', 840, 660, '', {
      docTitle: 'Comparativa de precios y servicios',
      author: 'Proyecto Peluquería',
      category: 'Mercado',
      text: 'Documento de trabajo con precios, servicios, horarios, reseñas y ocupación observada en varios competidores.',
      dateText: '14/08/2026'
    }),

    makeDemoNode('p17', 'document', 600, 940, '', {
      docTitle: 'Presupuesto inicial de apertura',
      author: 'Proyecto Peluquería',
      category: 'Finanzas',
      text: 'Mobiliario, herramientas, reforma, licencias, stock inicial, suministros y colchón de caja.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p18', 'document', 840, 940, '', {
      docTitle: 'Tres escenarios de inversión',
      author: 'Proyecto Peluquería',
      category: 'Finanzas',
      text: 'Escenario conservador, objetivo y optimista para comprobar cuánto dinero hace falta antes de abrir.',
      dateText: '14/08/2026'
    }),

    makeDemoNode('p19', 'document', 600, 1220, '', {
      docTitle: 'Lista de servicios y precios',
      author: 'Proyecto Peluquería',
      category: 'Operativa',
      text: 'Borrador de corte, peinado, color, tratamientos y extras. Cada servicio se acompaña de tiempo y coste estimado.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p20', 'note', 840, 1220, 'Nota/Hipótesis: los servicios de color pueden tener mayor ticket, pero también más tiempo y coste de producto.', {
      category: 'Rentabilidad',
      important: true,
      noteColor: '#e39a4a'
    }),

    makeDemoNode('p21', 'document', 600, 1500, '', {
      docTitle: 'Plan de lanzamiento',
      author: 'Proyecto Peluquería',
      category: 'Marketing',
      text: 'Promoción inicial, redes sociales, reservas, recomendaciones y seguimiento del origen de cada cliente.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p22', 'photo', 840, 1500, 'Ejemplo visual de campaña de apertura', {
      category: 'Marketing',
      caption: 'Referencia visual para estudiar cómo presentar la oferta inicial.',
      dateText: '14/08/2026'
    }),

    makeDemoNode('p23', 'document', 600, 1780, '', {
      docTitle: 'Hoja de cálculo del punto de equilibrio',
      author: 'Proyecto Peluquería',
      category: 'Ventas',
      text: 'Cálculo de clientes/día necesarios según ticket medio, costes fijos, costes variables y horas disponibles.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p24', 'note', 840, 1780, 'Nota/Hipótesis: si el ticket medio es demasiado bajo, el número de clientes necesario podría ser difícil de alcanzar.', {
      category: 'Punto de equilibrio',
      important: true,
      noteColor: '#76ad69'
    }),

    makeDemoNode('p25', 'document', 1080, 380, '', {
      docTitle: 'Entrevistas a clientes potenciales',
      author: 'Proyecto Peluquería',
      category: 'Cliente',
      text: 'Resumen de 12 conversaciones sobre frecuencia de visita, precio aceptable, servicios y motivos para cambiar de peluquería.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p26', 'photo', 1080, 660, 'Prueba visual de ocupación y competencia', {
      category: 'Mercado',
      caption: 'Fotos tomadas en distintos horarios para comparar afluencia.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p27', 'document', 1080, 940, '', {
      docTitle: 'Presupuestos de equipamiento',
      author: 'Proyecto Peluquería',
      category: 'Costes',
      text: 'Tres presupuestos orientativos para mobiliario, herramientas y equipamiento básico.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p28', 'document', 1080, 1220, '', {
      docTitle: 'Prueba de servicios y tiempos',
      author: 'Proyecto Peluquería',
      category: 'Validación',
      text: 'Prueba piloto para medir duración de servicios, coste de producto, satisfacción y posibilidad de repetir el servicio.',
      dateText: '14/08/2026'
    }),
    makeDemoNode('p29', 'person', 1320, 940, 'Marta — posible proveedora', {
      personName: 'Marta',
      category: 'Proveedor',
      author: 'Contacto inicial'
    }),
    makeDemoNode('p30', 'document', 1080, 1500, '', {
      docTitle: 'Resultados de una encuesta de captación',
      author: 'Proyecto Peluquería',
      category: 'Marketing',
      text: 'Resultados de una prueba sencilla en redes para comprobar qué mensaje y oferta generan más interés.',
      dateText: '14/08/2026'
    }),

    makeDemoNode('p31', 'note', 1320, 380, 'Resultado de la entrevista: el cliente valora especialmente rapidez, confianza y poder reservar sin llamar.', {
      category: 'Respuesta del cliente',
      noteColor: '#668fc7'
    }),
    makeDemoNode('p32', 'note', 1320, 660, 'Resultado de la observación: la visibilidad del local y la ocupación en ciertas franjas parecen influir mucho en la percepción de éxito.', {
      category: 'Respuesta del mercado',
      noteColor: '#76ad69'
    }),
    makeDemoNode('p33', 'note', 1320, 1220, 'Resultado de la prueba: los servicios con más tiempo de trabajo necesitan un precio mayor o una organización diferente.', {
      category: 'Respuesta de rentabilidad',
      noteColor: '#e39a4a'
    }),
    makeDemoNode('p34', 'note', 1320, 1500, 'Resultado de captación: la oferta funciona mejor cuando comunica un beneficio concreto y permite reservar fácilmente.', {
      category: 'Respuesta de marketing',
      noteColor: '#8b6bb1'
    })
  ];

  const edges = [
    ['__case__', 'p02'], ['__case__', 'p03'], ['__case__', 'p04'], ['__case__', 'p05'],
    ['__case__', 'p06'], ['__case__', 'p07'], ['__case__', 'p08'],
    ['p02', 'p11'], ['p11', 'p12'],
    ['p03', 'p13'], ['p13', 'p14'], ['p14', 'p25'], ['p25', 'p31'],
    ['p04', 'p15'], ['p15', 'p16'], ['p16', 'p26'], ['p26', 'p32'],
    ['p05', 'p17'], ['p17', 'p18'], ['p18', 'p27'], ['p27', 'p29'],
    ['p06', 'p19'], ['p19', 'p20'], ['p20', 'p28'], ['p28', 'p33'],
    ['p07', 'p21'], ['p21', 'p22'], ['p22', 'p30'], ['p30', 'p34'],
    ['p08', 'p23'], ['p23', 'p24']
  ].map(([a, b]) => ({ a, b }));

  const marker = {
    x: 40,
    y: 900,
    conclusion: JSON.parse(JSON.stringify(finalCaseConclusion))
  };

  const caseData = {
    id: DEMO_ID,
    title: 'Peluquería',
    description: caseDescription,
    status: 'abierto',
    category: '',
    nodes,
    edges,
    groups: [],
    marker,
    history: [{
      id: 'peluqueria-h0',
      title: 'Estado inicial',
      createdAt: Date.now(),
      snapshot: {
        title: 'Peluquería',
        description: caseDescription,
        status: 'abierto',
        marker: JSON.parse(JSON.stringify(marker)),
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges))
      }
    }]
  };

  caseData.demoVersion = DEMO_VERSION;
  return caseData;
}

export function seedPeluqueriaDemo(store, deps = {}) {
  if (!store || !Array.isArray(store.index) || !store.cases || typeof store.cases !== 'object') return false;

  const saveStore = deps.saveStore || (() => Promise.resolve());
  const renderMenu = deps.renderMenu || (() => {});
  const render = deps.render || (() => {});
  const getCurrentCaseId = deps.getCurrentCaseId || (() => null);
  const setState = deps.setState || (() => {});

  const existing = store.cases[DEMO_ID];
  const entry = store.index.find(c => c.id === DEMO_ID);

  if (store.demoDeleted && store.demoDeleted[DEMO_ID]) {
    delete store.demoDeleted[DEMO_ID];
  }

  if (existing) {
    let normalizedExisting = false;
    if (existing.id !== DEMO_ID) {
      existing.id = DEMO_ID;
      normalizedExisting = true;
    }

    if (existing.demoVersion !== DEMO_VERSION) {
      const fresh = buildPeluqueriaDemo();
      store.cases[DEMO_ID] = fresh;
      if (entry) {
        entry.title = fresh.title;
        entry.description = fresh.description;
        entry.status = fresh.status;
        entry.updatedAt = Date.now();
        delete entry.trashedAt;
      } else {
        store.index.push({
          id: DEMO_ID,
          title: fresh.title,
          description: fresh.description,
          status: fresh.status,
          category: fresh.category || '',
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      saveStore().then(() => {
        if (getCurrentCaseId() === DEMO_ID) {
          setState(store.cases[DEMO_ID]);
          render();
        }
        renderMenu();
      });
      return true;
    }

    if (entry) {
      let changed = normalizedExisting;
      if (typeof entry.category !== 'string') { entry.category = ''; changed = true; }
      if (typeof entry.pinned !== 'boolean') { entry.pinned = false; changed = true; }
      if (entry.createdAt == null) { entry.createdAt = entry.updatedAt || Date.now(); changed = true; }
      if (entry.trashedAt) { delete entry.trashedAt; changed = true; }
      if (changed) entry.updatedAt = Date.now();
      if (changed || (store.demoDeleted && store.demoDeleted[DEMO_ID])) {
        saveStore().then(() => renderMenu());
      }
    } else {
      store.index.push({
        id: DEMO_ID,
        title: existing.title || 'Peluquería',
        description: existing.description || caseDescription,
        status: existing.status || 'abierto',
        category: existing.category || '',
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      saveStore().then(() => renderMenu());
    }
    return true;
  }

  const caseData = buildPeluqueriaDemo();
  store.index.push({
    id: DEMO_ID,
    title: 'Peluquería',
    description: caseDescription,
    status: 'abierto',
    category: '',
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  store.cases[DEMO_ID] = caseData;
  saveStore().then(() => renderMenu());
  return true;
}
