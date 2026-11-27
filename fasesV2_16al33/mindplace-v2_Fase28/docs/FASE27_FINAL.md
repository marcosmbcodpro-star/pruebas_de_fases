# FASE 27 — Calidad y consistencia del caso

Implementación de los puntos 327–338.

- Motor de diagnóstico reutilizable por caso.
- Detección de tarjetas sin relaciones cuando su tipo requiere contexto.
- Detección de conclusiones sin evidencias asociadas.
- Detección de evidencias sin contexto externo.
- Detección de relaciones potencialmente contradictorias.
- Detección de conexiones con referencias rotas.
- Detección de posibles tarjetas duplicadas.
- Detección de posibles personas duplicadas.
- Detección de archivos adjuntos sin tarjeta asociada.
- Vista de diagnóstico con niveles error / advertencia / información.
- Filtros por nivel y tipo de problema.
- Resumen por caso y resumen global.
- Acceso desde un diagnóstico a la vista de grafo, centrando el elemento relevante.

Pruebas: `tests/phase27-quality.test.mjs`.
Auditoría: `scripts/phase27-audit.mjs`.
