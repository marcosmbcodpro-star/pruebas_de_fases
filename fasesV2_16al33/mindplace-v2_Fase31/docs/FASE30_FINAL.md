# Fase 30 — PWA y aplicación web instalable

## Alcance
Implementación de los puntos 363–372 como PWA 100 % web.

## Incluido
- Manifest `public/manifest.webmanifest`.
- Iconos PNG de 192 y 512 px.
- Service worker `public/sw.js` con caché separada para shell y recursos runtime.
- Registro automático del service worker.
- Detección del evento de instalación y botón de instalación cuando el navegador lo permite.
- Detección de `display-mode: standalone`.
- Aviso de nuevas versiones cuando existe un service worker en `waiting`; la activación mediante `skipWaiting` solo se solicita cuando el usuario pulsa Actualizar.
- Ruta `/fase-30` con diagnóstico de instalación/PWA.
- Integración del estado PWA en toda la aplicación.
- IndexedDB permanece fuera de la estrategia de reemplazo del shell: las actualizaciones de la PWA no eliminan los datos locales.

## Límite de esta fase
La Fase 30 prepara el shell instalable y la actualización. El funcionamiento completo y la cola de sincronización sin conexión pertenecen a la Fase 31.
