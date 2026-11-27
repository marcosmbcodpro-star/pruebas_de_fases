# Pruebas manuales de PowerShell

Esta carpeta contiene únicamente documentación/evidencias de ejecuciones manuales realizadas en Windows.

No contiene código necesario para que MindPlace funcione.

## Fase 14 validada en Windows

```powershell
npm.cmd run test:browser
npm.cmd run test:all
```

Resultado registrado:

- 15/15 pruebas de Fase 14: PASS.
- Smoke test de navegador: PASS.
- Interfaz, tema, responsive, ayuda y creación de caso: PASS.

## Fase 15

Tras las correcciones finales de auditoría, repetir en Windows:

```powershell
npm.cmd run test:all
```

La ejecución debe mostrar las pruebas de Fase 14, la prueba adicional 174, el smoke test de navegador y la auditoría estructural.
