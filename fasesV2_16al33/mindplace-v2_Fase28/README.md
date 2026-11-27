# MindPlace — Solo Web

Aplicación web para organizar casos/proyectos mediante tarjetas, relaciones, archivos adjuntos, búsqueda, filtros y navegación visual sobre un tablero.

## Estado actual

**Fase actual: 27 — Calidad y consistencia del caso ✅ COMPLETADA**

La versión incluida en este paquete corresponde al cierre técnico de la Fase 15. Mantiene todas las validaciones de la Fase 14 y añade auditoría estructural, de seguridad, datos, accesibilidad, rendimiento y arquitectura.

## Arquitectura actual

```text
MindPlace
├── index.html               # Nueva entrada Vite/Vue
├── index_mejoras.html       # Entrada legacy compatible
├── src/                     # Nueva capa Vue + TypeScript
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
├── docs/                    # Documentación y notas de las fases
├── tests/                   # Pruebas automatizadas de núcleo
├── scripts/                 # Ejecutores/scripts de pruebas
├── pruebas_powershell/      # Evidencias de pruebas manuales de Windows (no necesarias para la app)
└── README.md                # Estado, arquitectura y evolución del proyecto
```

## Datos y almacenamiento

Los datos estructurados y los archivos adjuntos están separados. IndexedDB es el almacenamiento principal para datos y archivos, con validación, límites, migración y mecanismos de recuperación.

## Seguridad y accesibilidad

La aplicación valida datos importados, nombres y archivos, controla límites, sanitiza contenido generado por el usuario y revisa referencias externas. También incorpora navegación por teclado, foco visible, atributos `aria-*`, `inert`, safe areas y soporte para `prefers-reduced-motion`.

Durante la Fase 12 se corrigió además el flujo de creación de casos para evitar el error `SECURITY_LIMITS is not defined` y se corrigió la gestión del foco del diálogo `#newCaseOverlay` para que no se oculte un elemento enfocado mediante `aria-hidden`.

## Responsive y táctil

La interfaz está preparada para escritorio, tablet y móvil, incluyendo orientación vertical/horizontal, interacción táctil, arrastre, zoom, pinch-zoom, pulsación larga y doble toque.

## Resumen de fases

- **Fase 1 — Estabilidad y protección de datos:** migración, versionado, backups, restauración y recuperación ante corrupción. ✅
- **Fase 2 — Rendimiento web:** renderizado, conexiones, minimapa, arrastre, zoom, memoria y rendimiento en casos grandes. ✅
- **Fase 3 — Arquitectura y código:** separación de responsabilidades, modelos, validadores, estado y organización física de archivos. ✅
- **Fase 4 — CSS:** estilos modulares, variables, temas, componentes y consistencia visual. ✅
- **Fase 5 — Motor del tablero:** navegación, centrado, organización, alineación, distribución, ramas, bloqueo y estados de tarjetas. ✅
- **Fase 6 — Relaciones:** dirección, tipos, etiquetas, diferenciación visual, selección y validación de conexiones. ✅
- **Fase 7 — Búsqueda, filtros y estructura:** búsqueda por caso/global, filtros combinables, árbol de estructura y navegación. ✅
- **Fase 8 — Datos y archivos:** IndexedDB, adjuntos, metadatos, vistas previas, integridad, importación/exportación y backups. ✅
- **Fase 9 — Responsive y táctil:** móvil/tablet/escritorio, gestos, orientación, safe areas y adaptación de overlays. ✅
- **Fase 10 — Accesibilidad y seguridad:** contraste, teclado, ARIA, foco, sanitización, validación, límites, URLs y CSP. ✅
- **Fase 11 — Diagnóstico y mantenimiento:** panel de diagnóstico, métricas, recuperación, errores, referencias rotas, adjuntos faltantes, listeners y renderizados anómalos. ✅
- **Fase 12 — Gestión profesional de casos:** dashboard, estado, información, clasificación, historial, trazabilidad y navegación entre proyectos. ✅ **FINALIZADA**
- **Fase 13 — Experiencia y pulido final:** consistencia visual, estados, preferencias, onboarding, ayuda, atajos y modo presentación. ✅ **FINALIZADA**
- **Fase 14 — Pruebas y regresión:** suite automatizada de núcleo + smoke tests de navegador/responsive/temas/onboarding/ayuda. ✅ **FINALIZADA**
- **Fase 15 — Auditoría final:** auditoría técnica completa, correcciones finales de modelo, seguridad, accesibilidad, estructura y documentación. ✅ **COMPLETADA TÉCNICAMENTE**
- **Fase 16 — Modernización tecnológica:** Vue 3, TypeScript, Vite, Pinia, Vue Router, contratos tipados y límite de compatibilidad con la aplicación legacy. ✅ **COMPLETADA**
- **Fase 17 — Arquitectura específica para experiencia móvil:** navegación móvil propia, navegación entre casos, bottom navigation, bottom sheets, acciones rápidas y adaptación independiente de la interfaz de escritorio. ✅ **COMPLETADA**
- **Fase 24 — Versionado de casos:** versiones persistentes, puntos automáticos/manuales, historial, restauración y protección. ✅ **COMPLETADA**
- **Fase 25 — Comparación y análisis de versiones:** comparación de tarjetas, conexiones, estado/categoría, adjuntos y restauración selectiva segura. ✅ **COMPLETADA**
- **Fase 26 — Grafo y análisis avanzado:** vista de grafo, filtros, centrado, navegación por ramas, hubs, aislados y agrupaciones. ✅ **COMPLETADA**
- **Fase 27 — Calidad y consistencia del caso:** diagnóstico de tarjetas sin contexto, evidencias, conclusiones, contradicciones, referencias rotas, duplicados y archivos, con resumen y navegación al grafo. ✅ **COMPLETADA**


### Última corrección detectada en smoke test
El smoke test real de Chromium detectó una petición `favicon.ico` que devolvía `404` porque la aplicación no declaraba un icono. Se añadió `favicon.svg` y su referencia mediante `rel="icon"`; también se amplió el servidor de prueba para servir recursos SVG/ICO. El objetivo es que la ejecución en Windows no registre errores de recursos faltantes.

## Fase 27 — Calidad y consistencia del caso

Se añadió un motor de diagnóstico reutilizable en `src/services/case-diagnostics.ts` y la vista `/fase-27`. El diagnóstico comprueba relaciones, contexto, evidencias, conclusiones, contradicciones, referencias rotas, duplicados y archivos sin tarjeta asociada.

La interfaz permite seleccionar el caso, filtrar por nivel y tipo de problema, revisar el detalle y abrir el elemento relevante en la vista de grafo de la Fase 26 cuando existe un nodo asociado.

### Pruebas

```text
Fase 25                       7/7 PASS
Auditoría Fase 25            PASS
Fase 26                       5/5 PASS
Auditoría Fase 26            PASS
Fase 27                       5/5 PASS
Auditoría Fase 27            PASS
TypeScript / vue-tsc          PASS
```

La compilación `vite build` no se pudo ejecutar en este entorno Linux porque el `node_modules` aportado por el proyecto contiene binarios opcionales de Rollup para Windows, pero no el binario Linux. En Windows debe regenerarse con `npm.cmd install` y después `npm.cmd run build`.

## Fase 15 — Auditoría final

### Resultado general

La Fase 15 revisa los puntos 174–190 sobre la base de la Fase 14. La auditoría detectó y corrigió una inconsistencia real del modelo de estados de `Case`: la interfaz operaba con `abierto`, `curso` y `resuelto`, mientras el modelo formal conservaba estados históricos diferentes.

La corrección mantiene compatibilidad con datos antiguos mediante normalización de `pendiente`, `validado` y `descartado`.

### Correcciones finales

- `CASE_STATUS` formalizado con los estados operativos reales.
- Estados históricos normalizados durante validación/migración.
- Apertura de casos en nueva pestaña reforzada con `noopener,noreferrer`.
- CSP de scripts reforzada a `script-src 'self'`.
- Smoke test de navegador compatible con limpieza de perfil temporal.
- Auditoría estructural automatizada añadida.
- Se verificaron IDs HTML duplicados: ninguno.
- Se verificaron 26 módulos JS con `node --check`: todos correctos.
- Se confirmó que no existen perfiles temporales de navegador en la raíz del proyecto.

### Pruebas

```text
15/15 pruebas de Fase 14      PASS
1/1 prueba adicional Fase 15 PASS
Auditoría estructural         PASS
```

La prueba real de Chrome/Chromium fue validada en Windows durante la Fase 14. Debido a las correcciones aplicadas después de esa validación, la certificación final de navegador debe repetirse en el equipo Windows del proyecto con:

```powershell
npm.cmd run test:all
```

### Documentación

La auditoría completa queda registrada en `docs/FASE15_FINAL.md`.

**FASE 15 — ✅ COMPLETADA TÉCNICAMENTE**

## Fase 14 — Pruebas y regresión

### 158–159. Creación y edición de casos
Se añadió una suite automatizada que comprueba creación, normalización, validación y edición de `Case`.

### 160. Eliminación y restauración
Se comprueba que las estructuras de caso pueden eliminar/restaurar elementos sin invalidar el modelo.

### 161. Tarjetas
Se prueban tipos, texto y estados de `Node`.

### 162. Conexiones
Se prueban tipos, dirección y etiquetas de `Edge`.

### 163. Categorías y favoritos
Se prueba la normalización de categorías y la categoría sin clasificar.

### 164. Estados
Se valida cada estado disponible de las tarjetas.

### 165. Búsqueda
Se prueban acentos, múltiples términos y búsquedas negativas.

### 166. Filtros
Se prueban combinación de criterios, serialización y restauración.

### 167. Undo/Redo
Se valida la compatibilidad estructural y la separación entre `activity` e historial.

### 168. Importación y exportación
Se comprueba la clonación segura de snapshots sin mutación cruzada.

### 169. Backups y restauración
Se valida la estructura global del store y su clonación íntegra.

### 170. Validación y migración
Se prueban límites de seguridad y normalización de estructuras inválidas.

### 171. Temas
Se valida el modelo de preferencias y la selección del tema Futurista desde Chromium.

### 172. Responsive
Se añade un smoke test real con Chromium que cambia entre escritorio y móvil y comprueba que el shell principal sigue presente.

### 173. Regresión
La suite se ejecuta mediante:

```bash
npm test
npm run test:browser
npm run test:all
```

### Estructura de pruebas

```text
tests/
└── phase14-core.test.mjs       # 15 pruebas de núcleo

scripts/
└── phase14-browser.mjs         # smoke test real con Chrome/Chromium + CDP

pruebas_powershell/
└── README.md                   # evidencias y notas de las ejecuciones manuales
```

Los perfiles temporales de Chrome no se guardan dentro del proyecto: `phase14-browser.mjs` los crea en la carpeta temporal del sistema y los elimina al finalizar. `.gitignore` también evita que perfiles o logs temporales entren en la versión del proyecto.

**FASE 14 — ✅ COMPLETADA Y VALIDADA**

La suite de núcleo se ejecutó con **15/15 pruebas correctas**. Además, el 25/08/2026 se ejecutó en Windows desde PowerShell:

- `npm.cmd run test:browser` → **PASS**
- `npm.cmd run test:all` → **15/15 PASS + smoke browser PASS**

La prueba real de navegador verificó interfaz, tema, responsive, ayuda y creación de caso.

La siguiente etapa es la **FASE 15 — Auditoría final**.

## Fase 13 — Experiencia y pulido final

### 144. Consistencia visual de botones

Se consolidaron estados y transiciones comunes para botones y controles. Se añadió foco visible homogéneo y comportamiento coherente de `hover`, `active` y `disabled`.

### 145. Consistencia de modales y paneles

Se estableció una capa visual común para paneles y diálogos de preferencias/onboarding, respetando temas, responsive y foco accesible.

### 146. Estados de interacción

Se revisaron y reforzaron los estados `hover`, `active`, `selected`, `disabled`, `focused`, `dragging` y `locked`. El tablero mantiene transiciones reducidas durante el arrastre para evitar interferencias.

### 147. Tipografía, tamaños, pesos e interlineado

Se unificaron tamaños de controles y jerarquías de texto de las nuevas superficies de interfaz usando las familias tipográficas ya existentes.

### 148. Espaciado y alineación

Se añadieron variables de altura, radio, espaciado y foco para mantener una composición consistente entre toolbar, paneles, modales y tarjetas.

### 149. Animaciones informativas

Se incorporó la preferencia global **Menos movimiento**, que desactiva prácticamente todas las transiciones/animaciones no esenciales y respeta el trabajo con `prefers-reduced-motion` a nivel de experiencia.

### 150. Coherencia entre temas

Las nuevas superficies reutilizan variables del sistema de temas y se adaptan a Allan Wake 2, Detective, Detective 2 y Futurista sin introducir un sistema visual paralelo.

### 151. Configuración de usuario

Se creó un panel **⚙ AJUSTES** con preferencias persistentes para tema, menos movimiento e interfaz compacta.

### 152. Selección de temas

La configuración presenta de forma uniforme los cuatro temas actuales y marca claramente el tema activo.

### 153. Arquitectura para futuras personalizaciones

Las preferencias globales se almacenan en `store.preferences` y las nuevas capas visuales se apoyan en variables CSS y clases de estado. Queda preparada la extensión futura sin modificar el modelo de los casos.

### 154. Onboarding básico

Se añadió un onboarding inicial de tres bloques que explica casos/proyectos, tablero y navegación/presentación. Solo aparece la primera vez y puede repetirse desde Ajustes.

### 155. Ayuda integrada

La ayuda rápida se amplió con atajos y orientación adicional sobre navegación y presentación. También puede abrirse con `?`.

### 156. Atajos de teclado

Se consolidaron atajos principales: búsqueda, filtros, presentación, ayuda, Undo/Redo, Escape, navegación de presentación, centrar el tablero con `Inicio` y apertura de Ajustes con `Ctrl+,` / `Cmd+,`.

### 157. Modo presentación

La presentación se reforzó con barra de progreso, contador estable, navegación por teclado y control de pantalla completa cuando el navegador lo permite, manteniendo el modo actual y su salida segura.

### Validaciones del cierre de Fase 13

- Todos los archivos JavaScript modificados pasan `node --check`.
- La estructura global de preferencias es compatible con datos existentes y se normaliza durante la carga/migración.
- Las nuevas capas de UI se ocultan con `hidden`/`inert` y restauran el foco.
- El modo presentación mantiene navegación anterior/siguiente, Escape y contador.
- El README queda actualizado para reflejar Fase 13 como completada.

### Estado

**FASE 13 — ✅ COMPLETADA**

La siguiente etapa del proyecto es la **FASE 14 — 🧪 Pruebas y regresión**.

## Fase 12 — Gestión profesional de casos

### 136. Dashboard de casos/proyectos

El dashboard muestra proyectos activos, abiertos, en curso, resueltos, contenido total y elementos en papelera. Se actualiza al volver al archivo y después de operaciones relevantes.

### 137. Estado del proyecto

El estado es visible en las tarjetas del archivo y en la vista del caso mediante el indicador correspondiente. El dashboard resume los estados de los proyectos activos.

### 138. Información relevante del caso

Cada proyecto muestra título, descripción, estado, categoría, fecha de actualización y métricas de tarjetas, conexiones y adjuntos.

### 139. Clasificación y organización

Se mantiene la clasificación por categorías y se dispone de filtros por categoría, ordenación por fecha, nombre y estado y posibilidad de fijar proyectos.

La navegación entre proyectos utiliza una secuencia estable mientras el usuario recorre los casos, evitando que cambios en `updatedAt` alteren la posición de `Anterior` y `Siguiente`.

### 140. Historial de cambios importantes

Cada proyecto dispone de una actividad persistente separada del sistema de puntos de control. Se registran operaciones relevantes como creación, edición de metadatos, modificaciones de elementos, relaciones, importaciones, papelera y restauración.

### 141. Trazabilidad

La actividad queda vinculada al proyecto y conserva fecha, acción y resumen. Las operaciones relevantes realizadas desde el dashboard y desde el tablero generan eventos de actividad.

### 142. Historial del proyecto vs Undo/Redo

El modelo distingue ahora claramente:

```text
activity
└── Historial profesional persistente del proyecto

history
└── Puntos de control del caso / gestión persistente del historial

undoStack / redoStack
└── Undo / Redo de la sesión
```

También se incorporó migración compatible con datos anteriores que mezclaban actividad y puntos de control.

### 143. Navegación entre proyectos

Se añadieron y estabilizaron los botones de proyecto anterior/siguiente.

- Solo se navega por proyectos activos.
- Los proyectos en papelera quedan fuera de la secuencia.
- La secuencia se captura al entrar en un caso.
- Cambiar `updatedAt` durante la navegación no cambia la secuencia.
- Se evita la repetición de casos y los saltos de posición.
- Cambiar el criterio de ordenación reinicia correctamente la secuencia.
- Los botones se desactivan correctamente en los extremos.

## Correcciones relevantes realizadas en Fase 12

### Creación de casos

Se corrigió el error:

```text
ReferenceError: SECURITY_LIMITS is not defined
```

`case-lifecycle.js` utiliza ahora correctamente la configuración de límites de seguridad.

### Accesibilidad del modal de nuevo caso

Se corrigió el problema del navegador:

```text
Blocked aria-hidden on an element because its descendant retained focus
```

El modal `#newCaseOverlay` gestiona ahora correctamente `aria-hidden`, `inert` y el foco al abrirse y cerrarse.

### Navegación anterior/siguiente

Se corrigió la navegación para que la modificación de `updatedAt` al abrir o guardar un caso no reordene la secuencia durante la navegación. Esto elimina los casos repetidos y permite que `Anterior` vuelva exactamente al proyecto inmediatamente anterior.

## Validaciones del cierre de Fase 12

- Todos los archivos JavaScript pasan `node --check`.
- El modelo `Case` incluye `activity` y su validación/persistencia correspondiente.
- La migración es compatible con datos históricos.
- El flujo de creación de casos se ha validado técnicamente.
- La navegación anterior/siguiente se ha validado con una secuencia estable.
- Los proyectos en papelera quedan excluidos de la navegación activa.
- Dashboard, actividad, estado y navegación están integrados en el cierre de la fase.

### Limitación conocida de pruebas

La revisión técnica y las pruebas de código se han realizado sobre la versión disponible. No se declara una prueba manual completa en Chrome desde este entorno porque el navegador no pudo ejecutarse de forma estable durante la validación.

## Documentación de fases

Los cambios detallados se conservan en `docs/`. Entre la documentación disponible se incluyen:

- `FASE3_CAMBIOS*.txt`
- `README_FASE3_FINAL_REPARADA.txt`
- `README_FASE4_FINAL.txt`
- `README_FASE5_FINAL.txt`
- `FASE7_REPARACION.md`
- `FASE8_FINAL.txt`
- `FASE9_FINAL.txt`
- `FASE10_FINAL.txt`
- `FASE11_FINAL.txt`
- `REPARACION_FASE12_CREAR_CASO.md`
- `FASE12_FINAL.txt`
- `FASE12_AUDITORIA_CIERRE.md`

## Fase 14 — 🧪 Pruebas y regresión

La Fase 14 (158–173) está implementada y cuenta con una suite automatizada de pruebas de núcleo y una suite de interfaz de navegador.

### Suite de núcleo

Se ejecutan 15 pruebas automatizadas sobre Node.js y actualmente pasan **15/15**:

- creación y edición de casos;
- eliminación y restauración;
- tarjetas;
- conexiones;
- categorías y favoritos;
- estados;
- búsqueda;
- filtros;
- Undo/Redo e historial separados;
- importación/exportación;
- backups/restauración;
- validación y límites;
- preferencias/temas;
- responsive sin alterar el modelo;
- regresión del orden y navegación de casos.

### Suite de navegador

La prueba de interfaz se ejecuta ahora **sin Python**, mediante `scripts/phase14-browser.mjs`, que usa Chrome/Chromium a través de CDP y un servidor local temporal. Comprueba carga de la aplicación, overlays, temas, ayuda mediante teclado, responsive y creación de casos desde la interfaz.

### Ejecución

Desde la raíz del proyecto:

```powershell
npm test
```

Para la prueba de interfaz:

```powershell
npm run test:browser
```

Para ejecutar toda la Fase 14:

```powershell
npm run test:all
```

No es necesario instalar Python para la suite de Fase 14. La prueba de navegador busca Chrome/Chromium automáticamente en rutas habituales de Windows y Linux. Si Chrome está en una ubicación personalizada, se puede indicar mediante `MINDPLACE_CHROME_PATH`.

### Estado de validación

- **15/15 pruebas de núcleo: ✅**
- Ejecutor de navegador Node/CDP: **✅ preparado**
- Prueba real de Chrome desde este entorno: **⏸ bloqueada por la política del entorno contra localhost/127.0.0.1**, no por un error funcional de MindPlace.

La Fase 14 se considera preparada para cierre tras ejecutar `npm run test:all` en el equipo local y confirmar la prueba de navegador.

## Continuación del proyecto

La siguiente etapa es:

**FASE 15 — ✅ Auditoría final**

A partir de esta versión, cada nueva fase deberá actualizar este `README.md` con sus cambios, correcciones, avances, estado y validaciones antes de darla por finalizada.

### Actualización de validación Fase 14 — prueba real en Chrome

Durante la ejecución real de `npm run test:browser` en Windows/Chrome se detectó un error funcional en el atajo `?`: el manejador de teclado utilizaba `isEditableTarget()` pero la función no estaba definida en `app.js`. Se ha corregido incorporando un validador central para campos editables (`INPUT`, `TEXTAREA`, `SELECT` y contenido `contenteditable`).

También se reforzó la prueba del tema para comprobar la clase CSS realmente aplicada por MindPlace (`theme-futuristic`).

Resultado conocido de la ejecución del usuario:
- **Suite de núcleo: 15/15 ✅**
- **Prueba de navegador: detectó el bug del atajo `?` y quedó corregida en esta versión.**
- Pendiente volver a ejecutar `npm run test:browser` con este paquete para confirmar el smoke test completo.


## Organización final de pruebas — cierre Fase 14

Se eliminó la dependencia de Python para las pruebas de navegador. Toda la Fase 14 se ejecuta con Node.js y Chrome/Chromium.

La carpeta `pruebas_powershell/` está reservada exclusivamente para evidencias/notas de ejecución manual en Windows y no forma parte de la lógica de la aplicación.

Los perfiles temporales `phase14-browser-profile-*` ya no se crean dentro de la raíz del proyecto. El smoke test usa la carpeta temporal del sistema y la limpia al terminar, incluso cuando la prueba finaliza con error.


## Fase 16 — Modernización tecnológica

Estado: **COMPLETADA**. Ver `docs/FASE16_FINAL.md`. La base moderna utiliza Vue 3 + TypeScript + Vite + Pinia + Vue Router y conserva IndexedDB y la aplicación legacy durante la migración progresiva.


## Fase 19 — Gestos táctiles avanzados
Se añade un gestor centralizado para pinch zoom, paneo con dos dedos, arbitraje entre gestos y arrastre, pulsación larga, doble toque y navegación por deslizamiento. Los gestos avanzados pueden desactivarse desde Ajustes y la vibración háptica se usa solo cuando el navegador la admite.


## Estado actual del proyecto

- **Fase 16 — Modernización tecnológica:** ✅
- **Fase 17 — Arquitectura específica para experiencia móvil:** ✅
- **Fase 18 — Tablero móvil:** ✅
- **Fase 19 — Gestos táctiles avanzados:** ✅
- **Fase 20 — Edición y formularios móviles:** ✅
- **Fase 21 — Archivos, fotografías y cámara en móvil:** ✅
- **Fase 22 — Modo investigación móvil:** ✅

La documentación de cada fase se conserva en `docs/FASE*_FINAL.*`.

## Fase 21 — Archivos, fotografías y cámara en móvil

- **261–262:** selector móvil específico con accesos separados a **Cámara**, **Galería** y **Archivos**. ✅
- **263:** captura directa mediante `capture="environment"` cuando el navegador lo permite. ✅
- **264–265:** optimización de imágenes y tratamiento de orientación mediante `createImageBitmap`/`imageOrientation` cuando está disponible. ✅
- **266–267:** miniaturas, vista previa y galería móvil de adjuntos. ✅
- **268–269:** sustitución, apertura y descarga de adjuntos. ✅
- **270–272:** cola secuencial, progreso, cancelación y reintento. ✅
- **273:** detección de cola interrumpida mediante `sessionStorage` durante la sesión. ✅
- **274:** límites de tamaño, procesamiento secuencial y reducción de memoria para imágenes grandes. ✅

### Artefactos de la Fase 21

```text
js/mobile/mobile-files.js
css/18-phase21-mobile-files.css
scripts/phase21-audit.mjs
tests/phase21-mobile-files.test.mjs
docs/FASE21_FINAL.md
src/views/Phase21View.vue
```

### Validación Fase 21

```text
npm run test:phase21
npm run audit:phase21
npm run typecheck
npm run build
```

**FASE 21 — ✅ COMPLETADA**

La siguiente etapa de la hoja de ruta es la **FASE 22 — Modo investigación móvil (275–286)**.

## Fase 22 — Modo investigación móvil

- **275:** modo de investigación móvil específico con panel de captura rápida. ✅
- **276–279:** accesos directos a **Nueva evidencia**, **Nueva nota**, **Nueva persona** y **Nueva conexión**. ✅
- **280:** acceso directo a **Adjuntar fotografía**, reutilizando cámara/galería del gestor móvil. ✅
- **281:** acceso directo a **Buscar**. ✅
- **282:** flujo de **Escanear documento / Adjuntar documento** mediante capacidades del navegador. ✅
- **283:** captura rápida desde un único panel para reducir pasos. ✅
- **284–285:** punto de retorno con caso, tarjeta seleccionada y posición/zoom del tablero. ✅
- **286:** vista móvil centrada en captura y recuperación contextual. ✅

### Artefactos de la Fase 22

```text
js/mobile/mobile-research.js
css/19-phase22-mobile-research.css
scripts/phase22-audit.mjs
tests/phase22-mobile-research.test.mjs
docs/FASE22_FINAL.md
src/views/Phase22View.vue
```

**FASE 22 — ✅ COMPLETADA**

La siguiente etapa es la **FASE 23 — Guardado y recuperación avanzada (287–296)**.


## FASE 24 — Versionado de casos ✅

Implementada la capa de versiones persistentes de casos, separada de Undo/Redo y del historial de actividad. Incluye versiones manuales y automáticas, metadatos, restauración con guardado previo, protección contra borrado accidental y persistencia mediante la capa IndexedDB existente.

Artefactos principales: `js/core/case-versions.js`, `tests/phase24-case-versions.test.mjs`, `scripts/phase24-audit.mjs`, `docs/FASE24_FINAL.md`, `src/views/Phase24View.vue` y `css/21-phase24-case-versions.css`.
