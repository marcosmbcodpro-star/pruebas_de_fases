# FASE 17 — Arquitectura específica para experiencia móvil

## Estado

**FASE 17 — ✅ COMPLETADA TÉCNICAMENTE**

Puntos cubiertos: **209–220**.

## Implementación

### 209–210. Interfaz y navegación móvil específica
Se creó `src/components/MobileExperience.vue` como capa móvil independiente. No se limita a reducir la interfaz de escritorio: introduce una navegación propia, paneles y acciones rápidas.

### 211. Navegación inferior
La navegación móvil contiene cinco zonas principales: **Casos**, **Tablero**, **Añadir**, **Buscar** y **Más**.

### 212. Navegación entre casos
El panel Casos permite volver al archivo, pasar al caso anterior/siguiente y crear un caso nuevo usando los controles existentes del sistema legacy.

### 213–215. Paneles y bottom sheets
Las funciones secundarias se presentan mediante `mobile-sheet` deslizables desde la parte inferior, con fondo modal, cierre táctil y adaptación a la altura disponible.

### 216. Modales móviles
La capa usa hojas inferiores y controles de tamaño táctil adecuado en lugar de reproducir automáticamente los paneles laterales del escritorio.

### 217–218. Acciones rápidas
Añadir abre directamente acciones para **Nueva evidencia**, **Nueva nota**, **Nueva persona**, **Nueva conexión** y **Fotografía**. Estas acciones utilizan un puente controlado hacia la aplicación existente para evitar duplicar la lógica de negocio.

### 219. Navegación coherente
Se centraliza el estado del panel móvil en `uiStore.mobilePanel`, manteniendo separadas las responsabilidades de estado global, interfaz y caso establecidas en la Fase 16.

### 220. Escritorio, tablet y móvil
La capa móvil está oculta por defecto y se activa hasta 900 px de ancho. El escritorio conserva la interfaz existente; móvil usa la capa específica sin obligar a compartir exactamente la misma composición.

## Seguridad

El puente móvil acepta únicamente mensajes `mindplace:mobile-command` del mismo origen y solo ejecuta comandos conocidos. No se usa `eval`, no se relaja la CSP y no se añade `unsafe-inline`.

## Compatibilidad

`index_mejoras.html` y la lógica legacy continúan siendo el motor funcional del tablero. La nueva interfaz móvil se apoya en esa lógica mediante comandos controlados, por lo que no sustituye ni duplica las operaciones de negocio consolidadas.

## Pruebas

```text
npm run test:phase17
npm run typecheck
npm run build
```

La prueba específica de fase comprueba la existencia de la navegación móvil, paneles inferiores, safe areas, acciones rápidas, puente de comandos y ocultación de la capa móvil fuera del breakpoint.
