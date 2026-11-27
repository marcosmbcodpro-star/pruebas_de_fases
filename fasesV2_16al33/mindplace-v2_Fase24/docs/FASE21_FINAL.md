# FASE 21 — Archivos, fotografías y cámara en móvil

Puntos **261–274 completados** sobre la arquitectura existente de MindPlace.

## Implementación

- **261. Selector de archivos móvil:** se añade un gestor específico de adjuntos dentro de cada tarjeta, con controles grandes y `input[type=file]` ocultos.
- **262. Cámara, galería y archivos:** el usuario dispone de accesos separados a cámara, galería de imágenes y selector general de archivos.
- **263. Captura directa:** el selector de cámara utiliza `capture="environment"` cuando el navegador/dispositivo lo soporta.
- **264. Optimización:** fotografías grandes se redimensionan y recomprimen antes de guardarse cuando resulta conveniente; se mantiene el límite de 25 MB por archivo.
- **265. Orientación:** la lectura de imágenes intenta utilizar `createImageBitmap(..., { imageOrientation: 'from-image' })` para respetar la orientación EXIF antes de generar la versión optimizada.
- **266. Vista previa:** los adjuntos de imagen se muestran como miniaturas y pueden abrirse en una vista del navegador; los demás archivos muestran extensión/tipo.
- **267. Galería móvil:** se incorpora una galería compacta de adjuntos por elemento con información de nombre, tamaño y tipo.
- **268. Sustitución:** cada adjunto puede sustituirse sin cambiar el resto de elementos del caso.
- **269. Descarga:** cada adjunto tiene acceso directo a apertura y descarga desde el navegador móvil.
- **270. Cola de subida:** varias selecciones se incorporan a una cola local y se procesan secuencialmente para reducir picos de memoria en dispositivos modestos.
- **271. Progreso:** cada elemento de la cola muestra estado y porcentaje por etapas: preparación, optimización/procesado, guardado y finalización.
- **272. Cancelación:** las tareas pendientes pueden cancelarse antes de su almacenamiento; las tareas con error pueden reintentarse.
- **273. Recuperación:** la cola pendiente se registra de forma temporal en `sessionStorage`, permitiendo detectar una cola interrumpida durante la sesión y avisar de su recuperación.
- **274. Archivos grandes:** se respetan los límites del repositorio existente, se evita procesar varias imágenes pesadas simultáneamente y se optimizan fotografías grandes antes de persistirlas.

## Persistencia y compatibilidad

La persistencia principal continúa siendo **IndexedDB** mediante `createAttachmentRepository`. No se duplica un segundo almacén de archivos. Los metadatos siguen vinculados a `node.attachments` y los blobs continúan en el object store `attachments`.

La capa de Fase 21 es específica para móvil y se monta sobre la interfaz legacy/Vue existente. Escritorio conserva su flujo anterior.

## Pruebas

```text
npm test
npm run test:phase21
npm run audit:phase21
npm run typecheck
npm run build
```

La auditoría específica comprueba la existencia de los artefactos y la implementación de los requisitos 261–274.
