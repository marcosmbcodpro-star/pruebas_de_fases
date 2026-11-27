# FASE 24 — Versionado de casos

## Objetivo
Crear versiones persistentes de cada caso, separadas de Undo/Redo y del historial de actividad.

## Implementación
- `js/core/case-versions.js`: gestor persistente de versiones.
- Persistencia mediante `window.storage` → IndexedDB/fallback existente.
- Versiones manuales y puntos automáticos.
- Número correlativo, fecha, etiqueta, descripción, motivo, origen y protección.
- Detección de duplicados por huella de la instantánea.
- Recuperación con guardado previo obligatorio y creación de un punto automático del estado actual antes del reemplazo.
- Eliminación bloqueada para versiones protegidas.
- Poda conservadora del historial sin eliminar versiones protegidas.
- Vista Vue de documentación en `/fase-24`.

## Separación conceptual
- Undo/Redo: estado temporal de edición.
- Actividad: registro de acciones importantes.
- Versiones: instantáneas persistentes restaurables del caso.

## Validación
- `npm run test:phase24`
- auditoría específica de Fase 24.
- regresión completa con `npm test`.
