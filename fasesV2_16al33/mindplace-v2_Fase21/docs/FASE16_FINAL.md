# FASE 16 — Modernización tecnológica

**Estado: COMPLETADA.**

La Fase 16 deja preparada la base tecnológica moderna de MindPlace sin romper la aplicación existente. La migración se ha hecho de forma progresiva: la aplicación legacy sigue funcionando, pero ahora existe una frontera clara para ir reemplazando sus módulos por Vue 3 + TypeScript sin una reescritura peligrosa de una sola vez.

## Arquitectura consolidada

```text
MindPlace
├── index.html / index_mejoras.html
├── src/
│   ├── main.ts / App.vue
│   ├── router/                 # Vue Router
│   ├── stores/                 # Pinia: global / UI / caso
│   ├── domain/                 # modelos y estado tipados
│   ├── services/               # persistencia, validación, transferencia, historial
│   ├── core/                   # migración y puente legacy
│   ├── components/             # componentes Vue
│   ├── views/                  # vistas Vue
│   └── types/                  # contratos de integración
├── js/                         # implementación existente, mantenida durante la transición
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 191–208 cerrados

| Nº | Resultado | Estado |
|---:|---|:---:|
| 191 | TypeScript introducido progresivamente y con `strict` activo | ✅ |
| 192 | Vite configurado para desarrollo, preview y compilación | ✅ |
| 193 | Vue 3 integrado como shell principal | ✅ |
| 194 | Interfaz preparada para migración progresiva por componentes | ✅ |
| 195 | `Case`, `Node`, `Edge`, `Attachment`, `History`, preferencias y recovery tipados | ✅ |
| 196 | Contrato tipado de persistencia sobre IndexedDB | ✅ |
| 197 | Importación, exportación y validación con contratos TypeScript | ✅ |
| 198 | Servicio independiente de Undo/Redo e historial tipado | ✅ |
| 199 | Pinia centralizado | ✅ |
| 200 | Separación real entre estado global, UI y modelo de caso | ✅ |
| 201 | Vue Router configurado | ✅ |
| 202 | Capa de migración para ir sustituyendo módulos legacy uno a uno | ✅ |
| 203 | IndexedDB existente conservado | ✅ |
| 204 | Compatibilidad funcional mediante `LegacyWorkspace` + `index_mejoras.html` | ✅ |
| 205 | Tests estructurales de arquitectura añadidos y compatibles con la suite anterior | ✅ |
| 206 | No se elimina código legacy sin validación del reemplazo | ✅ |
| 207 | Barreras de regresión preservadas y auditoría de Fase 16 añadida | ✅ |
| 208 | Vue 3 + TypeScript + Vite + Pinia + Router consolidados | ✅ |

## Corrección del error CSP

El proyecto **no utiliza `unsafe-inline` en `script-src`**. El error mostrado:

`Executing inline script violates ... script-src 'self'`

se produce cuando un servidor de desarrollo externo, como Live Server, inyecta su script de recarga inline. MindPlace ya no necesita esa inyección: la ruta oficial de desarrollo es Vite mediante `npm run dev`.

Como protección adicional se ha incluido en la CSP el hash SHA-256 exacto que aparece en el error reportado, de modo que ese script concreto puede ejecutarse sin abrir la política a cualquier inline script. No se ha añadido `unsafe-inline` a `script-src`.

## Cómo ejecutar la Fase 16

```powershell
npm install
npm run dev
```

Abrir `http://localhost:5173/`. Para la comprobación del shell de migración usar `/fase-16`.

**No se recomienda abrir `index.html` o `index_mejoras.html` mediante Live Server como servidor principal de desarrollo.** Vite es ahora el servidor de desarrollo y compilador oficial.

## Persistencia y compatibilidad

La nueva capa usa el mismo esquema lógico de IndexedDB (`mindplace-db`, store `kv`) y mantiene `tablero-store-v1` como clave principal para evitar una migración destructiva. La aplicación existente conserva sus módulos JS, historial, adjuntos, backups y validaciones mientras cada parte se migra a TypeScript.

## Criterio para retirar legacy

Un módulo solo debe eliminarse cuando: (1) exista reemplazo TypeScript/Vue equivalente, (2) la suite de regresión cubra su comportamiento y (3) se valide persistencia, importación/exportación y recuperación. La Fase 16 no introduce backend ni cambia el modelo local a servidor.

## Siguiente paso recomendado

La Fase 17 puede comenzar ya sobre esta base. La implementación móvil debe construirse encima de las vistas y stores nuevos, sin volver a mezclar estado global con el DOM legacy.
