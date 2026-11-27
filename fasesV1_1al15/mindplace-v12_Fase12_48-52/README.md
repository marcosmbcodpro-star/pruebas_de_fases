# MindPlace

Aplicación web para organizar casos/proyectos mediante tarjetas, relaciones, archivos adjuntos, búsqueda, filtros y navegación visual sobre un tablero.

## Arquitectura actual

```text
MindPlace
├── index_mejoras.html       # Entrada principal de la aplicación
├── css/                     # Estilos separados por responsabilidad
├── js/
│   ├── app.js               # Arranque e integración general
│   ├── core/                # Estado, persistencia, adjuntos, seguridad, diagnóstico e historial
│   ├── models/              # Modelos y validadores de datos
│   ├── board/               # Renderizado, navegación, conexiones e interacción del tablero
│   ├── cards/               # Contenido y UI de tarjetas
│   ├── cases/               # Ciclo de vida, búsqueda, filtros, estructura y archivo de casos
│   ├── ui/                  # Interfaz común
│   └── demo/                # Datos de prueba, incluida la demo Peluquería
├── css/                     # Arquitectura visual modular
└── docs/                    # Documentación y notas de las fases
```

### Datos y almacenamiento

Los datos estructurados y los archivos adjuntos están separados. IndexedDB es el almacenamiento principal para datos y archivos, con validación, límites, migración y mecanismos de recuperación.

### Seguridad y accesibilidad

La aplicación valida datos importados, nombres y archivos, controla límites, sanitiza contenido generado por el usuario y revisa referencias externas. También incorpora navegación por teclado, foco visible, `aria-*`, `inert`, safe areas y soporte para `prefers-reduced-motion`.

### Responsive y táctil

La interfaz está preparada para escritorio, tablet y móvil, incluyendo orientación vertical/horizontal, interacción táctil, arrastre, zoom, pinch-zoom, pulsación larga y doble toque.

## Resumen de fases

- **Fase 1 — Estabilidad y protección de datos:** migración, versionado, backups, restauración y recuperación ante corrupción.
- **Fase 2 — Rendimiento web:** renderizado, conexiones, minimapa, arrastre, zoom, memoria y rendimiento en casos grandes.
- **Fase 3 — Arquitectura y código:** separación de responsabilidades, modelos, validadores, estado y organización física de archivos.
- **Fase 4 — CSS:** estilos modulares, variables, temas, componentes y consistencia visual.
- **Fase 5 — Motor del tablero:** navegación, centrado, organización, alineación, distribución, ramas, bloqueo y estados de tarjetas.
- **Fase 6 — Relaciones:** dirección, tipos, etiquetas, diferenciación visual, selección y validación de conexiones.
- **Fase 7 — Búsqueda, filtros y estructura:** búsqueda por caso/global, filtros combinables, árbol de estructura y navegación.
- **Fase 8 — Datos y archivos:** IndexedDB, adjuntos, metadatos, vistas previas, integridad, importación/exportación y backups.
- **Fase 9 — Responsive y táctil:** móvil/tablet/escritorio, gestos, orientación, safe areas y adaptación de overlays.
- **Fase 10 — Accesibilidad y seguridad:** contraste, teclado, ARIA, foco, sanitización, validación, límites, URLs y CSP.
- **Fase 11 — Diagnóstico y mantenimiento:** panel de diagnóstico, métricas, recuperación, errores, referencias rotas, adjuntos faltantes, listeners y renderizados anómalos.

## Estado

**Fases 1–11 completadas.**

La siguiente etapa prevista en la hoja de ruta es la **Fase 12 — Gestión profesional de casos**.

## Ejecución

Para desarrollo local se recomienda abrir el proyecto mediante un servidor local (por ejemplo, Live Server) y cargar `index_mejoras.html`.

## Nota

Este README sustituye al antiguo `README_30_1.txt`, que documentaba únicamente la reorganización de la mejora 30.1. Los archivos de `docs/` conservan la documentación específica de cada fase.
