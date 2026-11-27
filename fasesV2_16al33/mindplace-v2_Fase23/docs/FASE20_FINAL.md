# FASE 20 — Edición y formularios móviles

Puntos 249–260 completados.

- 249: formularios y controles de edición reciben tratamiento específico para teclado virtual.
- 250: el controlador usa `visualViewport` y calcula el espacio ocupado por el teclado para mantener visible el campo activo.
- 251: el campo activo se centra de forma diferida mediante `scrollIntoView` tras cambios de viewport/orientación.
- 252: textareas se autoajustan y los formularios móviles tienen tamaños táctiles mínimos.
- 253: el formulario de caso se divide en dos pasos en móvil sin cambiar el flujo de escritorio.
- 254: cada tarjeta/caso dispone de edición rápida móvil para enfocar su primer campo editable.
- 255: la relación seleccionada mantiene edición rápida de etiqueta y el teclado táctil adecuado.
- 256: la barra de edición móvil permite crear una nota conectada rápidamente y las tarjetas conservan el acceso `+` existente.
- 257: pegado desde otras aplicaciones se normaliza a texto plano y conserva saltos de línea.
- 258: se mejora selección y edición táctil con `user-select`, tamaños de fuente y `touch-action` apropiados.
- 259: el controlador consolida autosave al editar y expone guardado manual desde la barra móvil.
- 260: se conservan borradores temporales en `sessionStorage` y se recuperan tras cambios de orientación/viewport o renderizados intermedios.

## Pruebas

- `npm test`
- `npm run test:phase20`
- `npm run audit:phase20`
- comprobación de sintaxis de los módulos JS modificados.

## Compatibilidad

La implementación se monta como una capa independiente sobre el workspace legacy. IndexedDB y el sistema existente de guardado siguen siendo la persistencia principal; `sessionStorage` solo conserva ediciones temporales de la sesión para evitar pérdidas durante transiciones móviles.
