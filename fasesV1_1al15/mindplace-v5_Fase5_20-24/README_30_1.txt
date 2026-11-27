MINDPLACE WEB — FASE 3 — MEJORA 30.1
Organización física de archivos por responsabilidad

Esta versión aplica la mejora 30.1 sin cambiar la lógica funcional de la aplicación.

ESTRUCTURA

index_mejoras.html
css/
  styles.css                 -> estilos globales
js/
  app.js                     -> punto de entrada y coordinación de la aplicación
  core/
    history-manager.js       -> historial / Undo-Redo
    persistence.js           -> persistencia, migraciones y recuperación
    state.js                 -> estado del tablero y normalización
    storage.js               -> almacenamiento y utilidades de datos
  models/
    models.js                -> modelos Case, Node, Edge, Attachment, History y Preferences
    validators.js            -> validación de modelos
  board/
    board-connections.js     -> conexiones del tablero
    board-interactions.js    -> interacción con el tablero
    board-render.js          -> renderizado del tablero
    board-signatures.js      -> firmas de render/minimapa
    board-visuals.js        -> minimapa y elementos visuales del tablero
  cases/
    case-archive.js          -> archivo, categorías y ordenación de casos
    case-editor.js           -> edición de datos del caso
    case-filters.js          -> filtros de casos
    case-lifecycle.js        -> ciclo de vida del caso
    case-search.js           -> búsqueda dentro de casos
    case-structure.js        -> estructura/árbol del caso
  cards/
    card-content.js          -> contenido de tarjetas
    card-ui.js               -> controles e interacción de tarjetas
  ui/
    ui.js                    -> utilidades generales de interfaz
  demo/
    demo-data.js             -> datos/demo de ejemplo

docs/
  documentación y notas históricas de la Fase 3

VERIFICACIONES REALIZADAS

- Los 22 módulos JavaScript pasan comprobación de sintaxis con Node.js.
- Todas las importaciones relativas internas resuelven a archivos existentes.
- El HTML apunta a ./css/styles.css y ./js/app.js.
- No quedan referencias antiguas a los archivos movidos en HTML/CSS/JS, salvo imports internos ya actualizados.
- No se ha introducido bundler, framework ni dependencia nueva: la aplicación mantiene su arquitectura de módulos ES.

NOTA DE USO

La aplicación utiliza ES Modules. Para probarla en navegador, es recomendable abrirla mediante un servidor HTTP local (por ejemplo, Live Server de VS Code o cualquier servidor estático local), igual que la versión anterior.


FASE 4 — ARQUITECTURA CSS COMPLETADA
La estructura CSS ha sido modularizada. Ver docs/README_FASE4_FINAL.txt.
