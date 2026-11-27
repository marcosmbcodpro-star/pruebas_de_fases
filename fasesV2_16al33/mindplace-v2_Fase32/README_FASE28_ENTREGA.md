# MindPlace — Entrega Fase 28

La Fase 28 (puntos 339–351) está implementada sobre la versión completa de la Fase 27.

## Incluye

- Operadores AND, OR y NOT.
- Búsqueda por tipo de tarjeta.
- Búsqueda por estado.
- Búsqueda por categoría.
- Búsqueda por etiqueta.
- Búsqueda por fecha con comparadores `>=`, `<=`, `>`, `<` y `=`.
- Búsqueda por relaciones mediante `related:`.
- Combinación de criterios.
- Resultados de tarjetas, relaciones y coincidencias del caso.
- Ordenación por relevancia.
- Búsquedas guardadas persistentes en `localStorage`.
- Vista responsive optimizada para móvil.
- Acceso a la búsqueda desde el escritorio y desde la navegación móvil.

## Ejemplos

```text
persona AND tag:urgente

type:evidence OR type:document

tag:urgente NOT status:discarded

date:>=2026-08-01

related:supports
```

## Validación realizada

- `npm test` → 95/95 PASS.
- `npm run test:phase28` → 6/6 PASS.
- Auditoría Fase 28 → PASS.
- `npm run typecheck` → PASS.
- Auditorías Fase 26 y Fase 27 → PASS.

## Nota de entorno

La compilación Vite no se fuerza durante esta entrega porque el `node_modules` incluido en el proyecto puede depender de binarios opcionales específicos del sistema operativo. En Windows se recomienda ejecutar:

```powershell
npm.cmd install
npm.cmd run build
```
