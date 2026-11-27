# FASE 22 — Modo investigación móvil

## Estado

**COMPLETADA ✅**

La Fase 22 (puntos 275–286) introduce un modo de investigación móvil centrado en capturar información con pocos pasos y volver rápidamente al punto del caso donde se estaba trabajando.

## Implementación

- **275:** modo de investigación móvil integrado en la navegación inferior y panel específico de captura rápida.
- **276:** acceso rápido a Nueva evidencia.
- **277:** acceso rápido a Nueva nota.
- **278:** acceso rápido a Nueva persona.
- **279:** acceso rápido a Nueva conexión.
- **280:** acceso rápido para Adjuntar fotografía reutilizando el gestor de archivos/cámara de Fase 21.
- **281:** acceso rápido a Buscar.
- **282:** acceso a Escanear/adjuntar documento mediante el selector del navegador; el modo cámara se utiliza cuando el navegador ofrece captura directa.
- **283:** acciones de captura en un solo panel, evitando navegación por formularios completos para las acciones frecuentes.
- **284:** punto de retorno persistido durante la sesión para regresar al caso y selección anteriores.
- **285:** se conserva la posición del tablero mediante el estado de navegación ya existente (`scrollLeft`, `scrollTop`, zoom y elemento objetivo).
- **286:** vista móvil centrada en captura rápida, con estado de procesamiento y botón de retorno contextual.

## Arquitectura

`js/mobile/mobile-research.js` actúa como orquestador y no duplica el almacenamiento ni los editores. Las acciones delegan en `app.js`, los editores existentes y el gestor de adjuntos de Fase 21.

El punto de retorno se guarda en `sessionStorage` con caducidad de 12 horas y se invalida después de restaurarlo correctamente.

## Artefactos

```text
js/mobile/mobile-research.js
css/19-phase22-mobile-research.css
scripts/phase22-audit.mjs
tests/phase22-mobile-research.test.mjs
docs/FASE22_FINAL.md
src/views/Phase22View.vue
```

## Validación

```text
npm run test:phase22
npm run test:all
npm run typecheck
npm run build
```

La auditoría específica verifica los puntos 275–286, la integración con Vue y la conservación del contexto del tablero.
