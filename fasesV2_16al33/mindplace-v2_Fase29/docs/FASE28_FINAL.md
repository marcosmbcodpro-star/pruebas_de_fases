# FASE 28 — Búsqueda avanzada

La Fase 28 evoluciona el buscador de MindPlace con una sintaxis de consulta y filtros combinables.

## Funciones
- Texto libre.
- AND / OR / NOT.
- `type:`, `status:`, `category:`, `tag:`, `date:`, `related:`.
- Fechas `>=`, `<=`, `>`, `<`, `=`.
- Filtros de interfaz combinables.
- Resultados de tarjetas, relaciones y caso.
- Ordenación por relevancia.
- Búsquedas guardadas en `localStorage`.
- Acceso de escritorio y acceso rápido móvil.

## Ejemplos
- `persona AND tag:urgente`
- `type:evidence OR type:document`
- `NOT status:discarded`
- `date:>=2026-08-01`
- `related:supports`

## Validación
- `npm run test:phase28`
- `npm run audit:phase28`
- `npm run typecheck`
