# FASE 25 — Comparación y análisis de versiones

Implementada sobre el versionado persistente de la Fase 24.

## Funciones

- **306** Comparador entre dos versiones persistentes.
- **307** Detección de tarjetas añadidas.
- **308** Detección de tarjetas eliminadas.
- **309** Detección de tarjetas modificadas con campos afectados.
- **310** Detección de conexiones añadidas, eliminadas y modificadas.
- **311** Detección separada de cambios de estado y categoría.
- **312** Detección de cambios en adjuntos por tarjeta.
- **313** Vista visual de diferencias con selección individual.
- **314** Restauración selectiva de cambios desde la versión de referencia.

## Seguridad de la restauración selectiva

La restauración se aplica después de confirmar y genera una entrada en Undo/Redo antes de modificar el caso. Las tarjetas se aplican antes que las conexiones para evitar endpoints rotos. Los adjuntos solo se recuperan como referencia cuando el binario correspondiente sigue existiendo en IndexedDB; si el archivo ya no existe, el cambio se omite.

La comparación es una capa independiente: no altera versiones persistentes, actividad ni Undo/Redo hasta que el usuario confirma la restauración.
