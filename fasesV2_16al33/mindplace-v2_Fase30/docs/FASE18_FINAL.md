# FASE 18 — Tablero móvil · FINAL

Implementación de los puntos 221–236.

## Completado

- 221: modo de tablero específicamente optimizado para móvil.
- 222: tarjetas con dimensiones y controles táctiles adaptados.
- 223: zoom móvil con controles accesibles y pinch existente consolidado.
- 224: centrado/enfoque automático sobre elementos.
- 225: navegación entre tarjetas conectadas.
- 226: navegación por ramas.
- 227: modo de enfoque sobre tarjeta seleccionada.
- 228: modo de enfoque sobre rama completa.
- 229: minimapa adaptado y expandible.
- 230: herramientas separadas del área inferior del tablero.
- 231: selección táctil optimizada.
- 232: edición táctil conservada y botones con superficies amplias.
- 233: barra contextual junto al área superior del tablero para la tarjeta seleccionada.
- 234: acciones frecuentes sin abrir panel completo.
- 235: conexión accesible desde el contexto móvil.
- 236: paneo, pinch y overscroll optimizados para grandes tableros.

## Compatibilidad

La interfaz de escritorio no se sustituye. Los cambios específicos de esta fase se activan en pantallas de hasta 900px.

## Pruebas

`tests/phase18-mobile-board.test.mjs` cubre los puntos 221–236. `scripts/phase18-audit.mjs` comprueba la presencia de la arquitectura móvil y sus puentes con el tablero legacy.
