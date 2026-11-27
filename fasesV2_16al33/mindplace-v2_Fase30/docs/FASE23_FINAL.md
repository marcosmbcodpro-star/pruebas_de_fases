# FASE 23 — Guardado y recuperación avanzada

## Estado
**COMPLETADA** — requisitos 287–296 implementados.

## Implementación
- Indicador permanente de estado: Guardado, Guardando, Cambios pendientes y Error.
- Autosave inteligente con debounce de 650 ms.
- Confirmación post-escritura mediante lectura y comparación del estado persistido.
- Reintentos existentes conservados.
- Borrador temporal en `sessionStorage` para sesiones de edición interrumpidas.
- Captura síncrona del borrador en `visibilitychange`, `pagehide` y `beforeunload`.
- Recuperación temporal disponible durante la misma sesión del navegador.
- Diagnóstico centralizado del último guardado.
- Sincronización del estado de guardado con la interfaz y eventos `mindplace:save-status`.
- Compatible con IndexedDB y con los mecanismos de `last-good`/recuperación existentes.

## Validación
- `tests/phase23-save-recovery.test.mjs`
- Auditoría específica de Fase 23.
- Regresión completa de fases anteriores.
