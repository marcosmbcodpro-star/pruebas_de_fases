# FASE 33 — Colaboración futura

## Implementación

395. Compartición de casos por email con invitaciones pendientes.
396. Permisos por caso: propietario, lectura y edición.
397. Modo lectura reforzado en backend: las escrituras no autorizadas devuelven 403.
398. Modo edición reutiliza el control de versiones y conflictos de la Fase 32.
399. Colaboración simultánea preparada mediante presencia temporal y refresco periódico.
400. Usuarios conectados visibles por presencia (heartbeat de 30 s).
401. Auditoría de acciones de colaboración y actualizaciones de caso.
402. Conflictos colaborativos se resuelven con el mecanismo optimistic locking ya existente.
403. Historial de colaboración separado de Undo/Redo y del historial de versiones.

## Backend

- `server/src/collaboration/` contiene DTO, módulo, controlador y servicio.
- Persistencia local en `server/data/case-owners.json`, `case-shares.json`, `case-invitations.json`, `case-presence.json` y `case-collaboration-events.json`.
- Los casos compartidos aparecen en la lista remota del usuario y el mismo caso puede seguir utilizándose localmente/offline.

## Cliente

- `src/services/collaboration.ts` centraliza las llamadas protegidas.
- `src/views/Phase33View.vue` permite gestionar casos, colaboradores, permisos, invitaciones, presencia y actividad.
- Ruta `/fase-33`.

## Pruebas

- `tests/phase33-collaboration.test.mjs` — validación estructural del cliente/arquitectura.
- `server/test/phase33-http.test.js` — pruebas HTTP reales de compartir, permisos, presencia y auditoría.
- `scripts/phase33-audit.mjs` — auditoría estructural.

**FASE 33 — ✅ COMPLETADA**
