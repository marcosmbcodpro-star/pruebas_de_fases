MINDPLACE — FASE 3 FINAL REPARADA

Fecha de reparación: 21/08/2026

Se ha reparado la versión recibida de Fase 3 sin cambiar HTML ni CSS.

PROBLEMAS CORREGIDOS
- Eliminada la declaración duplicada de newCaseOverlay y de los controles del editor de casos que provocaba:
  Uncaught SyntaxError: Identifier 'newCaseOverlay' has already been declared
- Corregidas dependencias inicializadas demasiado tarde dentro de la modularización:
  saveStore, save, closeAllStatusMenus, startLinkFrom y drawStrings ahora se reciben mediante wrappers diferidos cuando todavía no están inicializados.
- Corregido el arranque de la demo de Peluquería: la carga del almacenamiento termina antes de sembrar la demo, evitando que una operación asíncrona pueda sobrescribirla.

VALIDACIONES REALIZADAS
- node --check sobre todos los archivos JavaScript: OK.
- Prueba de arranque real de los módulos en Chromium mediante un entorno aislado: OK.
- El menú arranca sin excepciones JavaScript.
- La demo "Peluquería" aparece automáticamente.
- La demo abre correctamente el tablero y renderiza 32 tarjetas.
- El botón "+ NUEVO CASO" abre el modal correctamente.
- La creación de un caso funciona y aumenta el número de casos de 2 a 3 en la prueba aislada.
- El regreso al menú desde el caso funciona correctamente.
- Validación de los modelos Case, Node, Edge, Attachment, History y Preferences: OK.

PARA PROBAR EN WINDOWS
1. Extrae esta carpeta completa.
2. Abre CMD dentro de la carpeta.
3. Ejecuta:
   npx serve .
4. Abre:
   http://localhost:3000/index_mejoras.html
5. Si el navegador conserva una versión anterior, haz Ctrl+F5.

IMPORTANTE
- No uses la carpeta/archivo de la versión anterior para probar esta reparación.
- La Fase 3 mantiene la arquitectura modular existente y los módulos ya extraídos.
