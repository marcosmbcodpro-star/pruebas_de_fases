# Fase 29 — Productividad y comandos

## Estado
COMPLETADA

## Puntos 352–362
- 352. Paleta de comandos global.
- 353. Atajo Ctrl+K / Cmd+K.
- 354. Acceso equivalente y responsive en móvil.
- 355. Ejecución de acciones desde la paleta.
- 356. Búsqueda contextual dentro de la paleta.
- 357. Filtrado de comandos según la vista actual.
- 358. Creación rápida de tarjetas.
- 359. Creación rápida de conexiones.
- 360. Centrado del elemento seleccionado.
- 361. Cambio de caso mediante el archivo de casos.
- 362. Exportación, copias y acciones administrativas.

## Arquitectura
La lógica de comandos está centralizada en `src/services/command-palette.ts` y la interfaz en `src/components/CommandPalette.vue`. El shell Vue abre la paleta globalmente y el bridge legacy ejecuta acciones reales sobre `js/app.js` mediante comandos de mismo origen.

## Validación
- Suite global: 97/97 PASS.
- TypeScript / vue-tsc: PASS.
- Auditoría Fase 25: PASS.
- Auditoría Fase 26: PASS.
- Auditoría Fase 27: PASS.
- Auditoría Fase 28: PASS.
- Auditoría Fase 29: PASS.
- `node --check js/app.js`: PASS.

`vite build` no se certifica en este entorno Linux porque el `node_modules` incluido procede de Windows y carece de `@rollup/rollup-linux-x64-gnu`. En Windows, regenerar dependencias con `npm.cmd install` y ejecutar `npm.cmd run build`.
