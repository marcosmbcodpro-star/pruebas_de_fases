# MindPlace — Solo Web

Aplicación web para organizar casos/proyectos mediante tarjetas, relaciones, archivos adjuntos, búsqueda, filtros y navegación visual sobre un tablero.

## Estado actual

**Fase actual: 12 — Gestión profesional de casos ✅ COMPLETADA**

La versión incluida en este paquete corresponde al cierre de la Fase 12 y queda preparada como base para iniciar la **Fase 13 — Experiencia y pulido final**.

## Arquitectura actual

```text
MindPlace
├── index_mejoras.html       # Entrada principal de la aplicación
├── css/                     # Estilos separados por responsabilidad
├── js/
│   ├── app.js               # Arranque e integración general
│   ├── core/                # Estado, persistencia, adjuntos, seguridad, diagnóstico e historial
│   ├── models/              # Modelos y validadores de datos
│   ├── board/               # Renderizado, navegación, conexiones e interacción del tablero
│   ├── cards/               # Contenido y UI de tarjetas
│   ├── cases/               # Ciclo de vida, búsqueda, filtros, estructura y archivo de casos
│   ├── ui/                  # Interfaz común
│   └── demo/                # Datos de prueba, incluida la demo Peluquería
├── docs/                    # Documentación y notas de las fases
└── README.md                # Estado, arquitectura y evolución del proyecto
```

## Datos y almacenamiento

Los datos estructurados y los archivos adjuntos están separados. IndexedDB es el almacenamiento principal para datos y archivos, con validación, límites, migración y mecanismos de recuperación.

## Seguridad y accesibilidad

La aplicación valida datos importados, nombres y archivos, controla límites, sanitiza contenido generado por el usuario y revisa referencias externas. También incorpora navegación por teclado, foco visible, atributos `aria-*`, `inert`, safe areas y soporte para `prefers-reduced-motion`.

Durante la Fase 12 se corrigió además el flujo de creación de casos para evitar el error `SECURITY_LIMITS is not defined` y se corrigió la gestión del foco del diálogo `#newCaseOverlay` para que no se oculte un elemento enfocado mediante `aria-hidden`.

## Responsive y táctil

La interfaz está preparada para escritorio, tablet y móvil, incluyendo orientación vertical/horizontal, interacción táctil, arrastre, zoom, pinch-zoom, pulsación larga y doble toque.

## Resumen de fases

- **Fase 1 — Estabilidad y protección de datos:** migración, versionado, backups, restauración y recuperación ante corrupción. ✅
- **Fase 2 — Rendimiento web:** renderizado, conexiones, minimapa, arrastre, zoom, memoria y rendimiento en casos grandes. ✅
- **Fase 3 — Arquitectura y código:** separación de responsabilidades, modelos, validadores, estado y organización física de archivos. ✅
- **Fase 4 — CSS:** estilos modulares, variables, temas, componentes y consistencia visual. ✅
- **Fase 5 — Motor del tablero:** navegación, centrado, organización, alineación, distribución, ramas, bloqueo y estados de tarjetas. ✅
- **Fase 6 — Relaciones:** dirección, tipos, etiquetas, diferenciación visual, selección y validación de conexiones. ✅
- **Fase 7 — Búsqueda, filtros y estructura:** búsqueda por caso/global, filtros combinables, árbol de estructura y navegación. ✅
- **Fase 8 — Datos y archivos:** IndexedDB, adjuntos, metadatos, vistas previas, integridad, importación/exportación y backups. ✅
- **Fase 9 — Responsive y táctil:** móvil/tablet/escritorio, gestos, orientación, safe areas y adaptación de overlays. ✅
- **Fase 10 — Accesibilidad y seguridad:** contraste, teclado, ARIA, foco, sanitización, validación, límites, URLs y CSP. ✅
- **Fase 11 — Diagnóstico y mantenimiento:** panel de diagnóstico, métricas, recuperación, errores, referencias rotas, adjuntos faltantes, listeners y renderizados anómalos. ✅
- **Fase 12 — Gestión profesional de casos:** dashboard, estado, información, clasificación, historial, trazabilidad y navegación entre proyectos. ✅ **FINALIZADA**
- **Fase 13 — Experiencia y pulido final:** pendiente.
- **Fase 14 — Pruebas y regresión:** pendiente.
- **Fase 15 — Auditoría final:** pendiente.

## Fase 12 — Gestión profesional de casos

### 136. Dashboard de casos/proyectos

El dashboard muestra proyectos activos, abiertos, en curso, resueltos, contenido total y elementos en papelera. Se actualiza al volver al archivo y después de operaciones relevantes.

### 137. Estado del proyecto

El estado es visible en las tarjetas del archivo y en la vista del caso mediante el indicador correspondiente. El dashboard resume los estados de los proyectos activos.

### 138. Información relevante del caso

Cada proyecto muestra título, descripción, estado, categoría, fecha de actualización y métricas de tarjetas, conexiones y adjuntos.

### 139. Clasificación y organización

Se mantiene la clasificación por categorías y se dispone de filtros por categoría, ordenación por fecha, nombre y estado y posibilidad de fijar proyectos.

La navegación entre proyectos utiliza una secuencia estable mientras el usuario recorre los casos, evitando que cambios en `updatedAt` alteren la posición de `Anterior` y `Siguiente`.

### 140. Historial de cambios importantes

Cada proyecto dispone de una actividad persistente separada del sistema de puntos de control. Se registran operaciones relevantes como creación, edición de metadatos, modificaciones de elementos, relaciones, importaciones, papelera y restauración.

### 141. Trazabilidad

La actividad queda vinculada al proyecto y conserva fecha, acción y resumen. Las operaciones relevantes realizadas desde el dashboard y desde el tablero generan eventos de actividad.

### 142. Historial del proyecto vs Undo/Redo

El modelo distingue ahora claramente:

```text
activity
└── Historial profesional persistente del proyecto

history
└── Puntos de control del caso / gestión persistente del historial

undoStack / redoStack
└── Undo / Redo de la sesión
```

También se incorporó migración compatible con datos anteriores que mezclaban actividad y puntos de control.

### 143. Navegación entre proyectos

Se añadieron y estabilizaron los botones de proyecto anterior/siguiente.

- Solo se navega por proyectos activos.
- Los proyectos en papelera quedan fuera de la secuencia.
- La secuencia se captura al entrar en un caso.
- Cambiar `updatedAt` durante la navegación no cambia la secuencia.
- Se evita la repetición de casos y los saltos de posición.
- Cambiar el criterio de ordenación reinicia correctamente la secuencia.
- Los botones se desactivan correctamente en los extremos.

## Correcciones relevantes realizadas en Fase 12

### Creación de casos

Se corrigió el error:

```text
ReferenceError: SECURITY_LIMITS is not defined
```

`case-lifecycle.js` utiliza ahora correctamente la configuración de límites de seguridad.

### Accesibilidad del modal de nuevo caso

Se corrigió el problema del navegador:

```text
Blocked aria-hidden on an element because its descendant retained focus
```

El modal `#newCaseOverlay` gestiona ahora correctamente `aria-hidden`, `inert` y el foco al abrirse y cerrarse.

### Navegación anterior/siguiente

Se corrigió la navegación para que la modificación de `updatedAt` al abrir o guardar un caso no reordene la secuencia durante la navegación. Esto elimina los casos repetidos y permite que `Anterior` vuelva exactamente al proyecto inmediatamente anterior.

## Validaciones del cierre de Fase 12

- Todos los archivos JavaScript pasan `node --check`.
- El modelo `Case` incluye `activity` y su validación/persistencia correspondiente.
- La migración es compatible con datos históricos.
- El flujo de creación de casos se ha validado técnicamente.
- La navegación anterior/siguiente se ha validado con una secuencia estable.
- Los proyectos en papelera quedan excluidos de la navegación activa.
- Dashboard, actividad, estado y navegación están integrados en el cierre de la fase.

### Limitación conocida de pruebas

La revisión técnica y las pruebas de código se han realizado sobre la versión disponible. No se declara una prueba manual completa en Chrome desde este entorno porque el navegador no pudo ejecutarse de forma estable durante la validación.

## Documentación de fases

Los cambios detallados se conservan en `docs/`. Entre la documentación disponible se incluyen:

- `FASE3_CAMBIOS*.txt`
- `README_FASE3_FINAL_REPARADA.txt`
- `README_FASE4_FINAL.txt`
- `README_FASE5_FINAL.txt`
- `FASE7_REPARACION.md`
- `FASE8_FINAL.txt`
- `FASE9_FINAL.txt`
- `FASE10_FINAL.txt`
- `FASE11_FINAL.txt`
- `REPARACION_FASE12_CREAR_CASO.md`
- `FASE12_FINAL.txt`
- `FASE12_AUDITORIA_CIERRE.md`

## Ejecución

Para desarrollo local se recomienda abrir el proyecto mediante un servidor local, por ejemplo Live Server, y cargar:

```text
index_mejoras.html
```

No se recomienda abrir la aplicación directamente mediante `file://` cuando se estén probando módulos, almacenamiento o funcionalidades que dependan de APIs del navegador.

## Continuación del proyecto

La siguiente etapa es:

**FASE 13 — ✨ Experiencia y pulido final**

A partir de esta versión, cada nueva fase deberá actualizar este `README.md` con sus cambios, correcciones, avances, estado y validaciones antes de darla por finalizada.
