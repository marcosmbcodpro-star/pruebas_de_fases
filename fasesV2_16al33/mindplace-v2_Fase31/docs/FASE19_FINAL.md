# FASE 19 — Gestos táctiles avanzados

Puntos 237–248 completados.

- 237: pinch zoom consolidado en un único gestor táctil.
- 238: paneo de dos dedos integrado con el pinch, conservando el centro bajo los dedos.
- 239: arrastre de tarjeta mantiene prioridad sobre el paneo de tablero.
- 240: pulsación larga sobre tarjeta selecciona y centra sin abrir acciones accidentales.
- 241: doble toque solo en espacio vacío para centrar; no interfiere con controles ni texto.
- 242: deslizamiento horizontal navega entre elementos conectados cuando no hay otro gesto activo.
- 243: arbitraje por objetivo y estado para separar selección, edición, arrastre y paneo.
- 244: `touch-action` y bloqueo selectivo evitan conflictos con gestos del navegador.
- 245: feedback visual para pinch, long press, swipe y doble toque.
- 246: umbrales cortos y controles alcanzables en pantallas pequeñas para uso con una mano.
- 247: vibración háptica progresiva y tolerante a navegadores que no la soportan.
- 248: preferencia `Gestos táctiles avanzados` para desactivarlos sin perder navegación básica.

## Prueba

Después de sustituir el proyecto: `npm install` y `npm run dev`.
Ruta de comprobación: `/fase-19`.

## Compatibilidad

La interfaz de escritorio y la aplicación legacy siguen disponibles. La capa nueva solo activa los gestos cuando se ejecuta en contexto móvil/táctil y la preferencia está habilitada.
