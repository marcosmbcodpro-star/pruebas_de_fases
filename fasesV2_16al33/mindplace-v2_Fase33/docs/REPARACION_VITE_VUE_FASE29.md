# Reparación Vite + Vue — Fase 29

## Problema corregido

El proyecto podía arrancar `vite build` sin aplicar el plugin de Vue, provocando que `src/App.vue` se analizara como si fuera JavaScript y apareciera:

`Expression expected (Note that you need plugins to import files that are not JavaScript)`

## Corrección

- La configuración queda explícitamente en `vite.config.js`.
- `@vitejs/plugin-vue` se registra mediante `plugins: [vue()]`.
- Se elimina la duplicidad de `vite.config.ts` para evitar que se ejecute una configuración distinta.
- `@vitejs/plugin-vue` ya está declarado en `devDependencies`.

## En Windows

Desde la carpeta raíz del proyecto:

```powershell
npm install
npm run build
```

Si se conserva un `node_modules` antiguo de otra plataforma, es recomendable eliminar solamente `node_modules` y ejecutar `npm install` de nuevo.
