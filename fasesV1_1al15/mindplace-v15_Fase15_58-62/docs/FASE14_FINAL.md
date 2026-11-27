# Fase 14 — Pruebas y regresión

## Estado

**FASE 14 — ✅ COMPLETADA Y VALIDADA**

Se incorporó una infraestructura de pruebas repetible para los puntos 158–173.

## Suite creada

- `tests/phase14-core.test.mjs`: 15 pruebas de núcleo con Node.js, cubriendo creación/edición, eliminación/restauración, tarjetas, conexiones, categorías/favoritos, estados, búsqueda, filtros, separación historial/Undo-Redo, snapshots de importación/exportación, backups, validación/límites, temas, responsive a nivel de modelo y regresión de ordenación.
- `package.json`: comandos `npm test`, `npm run test:browser` y `npm run test:all`.

## Validación realizada

La suite de núcleo se ejecutó en esta versión y terminó **15/15 pruebas correctas**.

La prueba de navegador se ejecutó en Windows desde PowerShell y terminó correctamente.

```text
PASS browser smoke: interfaz, tema, responsive, ayuda y creación de caso
```

O apuntando a un servidor existente:

```bash
set MINDPLACE_TEST_URL=http://127.0.0.1:4173/index_mejoras.html
npm run test:browser
```

## Regresión

Los tests utilizan los módulos existentes de modelos, validadores, búsqueda, filtros, almacenamiento, estado y ordenación, por lo que cualquier cambio estructural futuro puede verificarse ejecutando `npm test`.

## Siguiente fase

La siguiente etapa es **Fase 15 — Auditoría final**.


### Actualización: prueba de navegador sin Python

La prueba de interfaz de Fase 14 se ha migrado de Python/Playwright a un ejecutor Node.js que utiliza Chrome/Chromium mediante CDP. Esto elimina la dependencia de Python en Windows.

Archivos relevantes:

- `scripts/phase14-browser.mjs` — servidor local temporal + lanzamiento de Chrome/Chromium + pruebas de interfaz.
- `package.json` — `test:browser` y `test:all` ejecutados completamente con Node.js.

La prueba cubre carga de la interfaz, overlays principales, tema, ayuda mediante atajo, responsive y creación de caso desde la interfaz, además de capturar excepciones del navegador.

La suite de núcleo se mantiene en 15/15 pruebas superadas. En el entorno de desarrollo actual, Chrome/Chromium está sometido a una política que bloquea la navegación a `localhost`/`127.0.0.1`; por ello la prueba de navegador queda preparada para ejecución local en el equipo del usuario, donde debe ejecutarse desde la raíz del proyecto con `npm run test:browser` o `npm run test:all`.

## Incidencia encontrada durante la prueba real de navegador

La ejecución de `npm run test:browser` en Windows/Chrome detectó que el atajo `?` no llegaba a abrir la ayuda. La causa era real: `app.js` referenciaba `isEditableTarget()` sin definirla.

### Corrección

Se añadió `isEditableTarget(target)` en `js/app.js` para reconocer controles editables y contenido `contenteditable`. Esto permite que los atajos se bloqueen correctamente mientras el usuario escribe, sin romper el atajo `?` fuera de campos editables.

También se corrigió el test para validar el tema mediante la clase CSS que MindPlace aplica realmente al `body`.

### Estado de pruebas tras la corrección

- Suite de núcleo: **15/15 ✅**.
- Smoke test de navegador: corregido el bug detectado; requiere una nueva ejecución local para marcar toda la Fase 14 como validada al 100 %.

## Corrección posterior al primer smoke test de navegador
Se corrigió un `404` provocado por la ausencia de favicon. La aplicación ahora declara `favicon.svg` y el servidor de prueba reconoce SVG/ICO.


## Organización de las pruebas

```text
tests/
└── phase14-core.test.mjs

scripts/
└── phase14-browser.mjs

pruebas_powershell/
└── README.md
```

`pruebas_powershell/` solo contiene evidencias y notas manuales. No es necesaria para ejecutar MindPlace.

El smoke test crea su perfil temporal de Chrome en la carpeta temporal del sistema y lo elimina al terminar. No se deben conservar carpetas `.phase14-browser-profile-*` en la raíz del proyecto.

## Validación final realizada por el usuario

25/08/2026 — Windows PowerShell, Node.js v24.18.0:

- `npm.cmd run test:browser` → PASS
- `npm.cmd run test:all` → 15/15 pruebas de núcleo PASS + smoke browser PASS
