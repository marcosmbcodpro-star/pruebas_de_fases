# pruebas_powershell

Esta carpeta contiene únicamente evidencias y notas de las pruebas manuales realizadas desde PowerShell en Windows.

No contiene código necesario para que MindPlace funcione. Las pruebas automatizadas oficiales permanecen en `tests/` y `scripts/`.

## Fase 14

Validación realizada el 25/08/2026 desde PowerShell con Node.js v24.18.0:

- `npm.cmd run test:browser` → **PASS**
- `npm.cmd run test:all` → **15/15 tests de núcleo PASS + smoke browser PASS**

La prueba real de navegador verificó interfaz, tema, responsive, ayuda y creación de caso.
