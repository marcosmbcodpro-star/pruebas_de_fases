# FASE 26 — Grafo y análisis avanzado

Implementación de los puntos 315–326.

- Vista de grafo alternativa al tablero.
- Representación de tarjetas como nodos y conexiones como relaciones.
- Cambio entre tablero y grafo mediante navegación Vue Router y acceso directo desde el espacio de trabajo.
- Centrado de nodos y enfoque de ramas de hasta dos niveles.
- Filtros por tipo de relación, etiquetas y estado.
- Detección de ramas relevantes mediante recorrido de vecindad.
- Detección de nodos altamente conectados (hubs).
- Detección de elementos aislados.
- Detección de agrupaciones mediante componentes conectados.
- Persistencia del último caso abierto para que la vista de grafo continúe sobre el mismo caso.

Pruebas: `tests/phase26-graph.test.mjs`.
Auditoría: `scripts/phase26-audit.mjs`.
