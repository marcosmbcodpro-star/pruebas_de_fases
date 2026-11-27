# Reparación Fase 12 — Creación de casos

## Problemas corregidos

### 1. `SECURITY_LIMITS is not defined`

`js/cases/case-lifecycle.js` utilizaba `SECURITY_LIMITS` para comprobar el límite máximo de casos, pero el módulo no importaba esa constante.

Se añadió:

```js
import { SECURITY_LIMITS } from '../core/security.js';
```

### 2. Foco dentro de un modal `aria-hidden`

El diálogo `#newCaseOverlay` podía ocultarse mientras `#ncName` conservaba el foco, provocando el aviso de accesibilidad del navegador.

Se corrigió `js/cases/case-editor.js` para:

- activar `aria-hidden="false"` al abrir el modal;
- desactivar `inert` al abrirlo;
- guardar el elemento que tenía el foco antes de abrirlo;
- retirar el foco del diálogo antes de ocultarlo;
- activar `inert` y `aria-hidden="true"` antes de dejarlo oculto;
- devolver el foco al elemento que abrió el diálogo.

Además, `index_mejoras.html` inicializa el modal cerrado con `inert`.

## Comprobación

- Todos los archivos JavaScript pasan `node --check`.
- Se ejecutó una prueba aislada de `createCase` y se verificó que:
  - se añade una entrada al índice;
  - se crea el caso en `store.cases`;
  - se ejecuta el guardado;
  - se abre el caso recién creado.
