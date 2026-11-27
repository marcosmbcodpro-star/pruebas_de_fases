# MindPlace — Fase 25 corregida

Esta entrega contiene únicamente los archivos modificados para cerrar la Fase 25.

## Correcciones realizadas

- Restauración selectiva de tarjetas por campo mediante `changedFields`.
- La restauración de una tarjeta ya no sobrescribe estado, categoría ni adjuntos cuando esos cambios no han sido seleccionados.
- Restauración segura de adjuntos eliminados/modificados: requiere disponibilidad del binario de referencia.
- Restauración de adjuntos añadidos: elimina solo la referencia actual y no requiere comprobar el binario.
- Añadidas pruebas de regresión para ambos casos.

## Validación

`npm run test:phase25` → 9 pruebas correctas.

`node scripts/phase25-audit.mjs` → `FASE 25 AUDIT: PASS`.

También se ha comprobado la sintaxis del módulo corregido con `node --check`.

## Aplicación

Sobrescribir en el proyecto existente estos tres archivos, conservando el resto del proyecto y su `node_modules`:

- `js/core/case-version-diff.js`
- `tests/phase25-version-compare.test.mjs`
- `docs/FASE25_FINAL.md`
