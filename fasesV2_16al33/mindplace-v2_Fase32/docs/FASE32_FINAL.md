# FASE 32 — Backend y sincronización multidispositivo

## Estado

**COMPLETADA — 383–394**

## Implementación

- Backend Node.js + NestJS con módulos de autenticación y casos.
- JWT para sesión y `scrypt` para las contraseñas.
- Validación de DTOs con `class-validator` + `class-transformer`.
- API REST para autenticación, casos, salud y sincronización.
- Versionado optimista mediante `baseVersion` y detección explícita de `SYNC_CONFLICT`.
- Resolución de conflictos conservando servidor o cliente.
- Persistencia JSON del servidor con escritura atómica.
- Cliente local-first: IndexedDB, cola offline, reintento al recuperar conexión y sincronización al volver online.
- API cliente por defecto en `/api`, con proxy Vite durante desarrollo y backend escuchando en `0.0.0.0`, permitiendo acceder a MindPlace desde PC, tablet y móvil dentro de la misma red.
- Endpoint `/api/health` para comprobar disponibilidad del backend.
- Pruebas HTTP reales con servidor NestJS efímero: salud, registro/login, JWT, CRUD, pull y conflicto/resolución.

## Ejecución

### Frontend

```powershell
npm install
npm run dev -- --host 0.0.0.0
```

### Backend

```powershell
cd server
npm install
npm run build
node dist/main.js
```

Para una sesión reproducible en producción local, define `MINDPLACE_JWT_SECRET`.

### Validación

```powershell
npm run test:phase32
cd server
npm run build
npm run test:http
```

## Nota de despliegue

Durante desarrollo, Vite reenvía `/api` al backend local. Desde otro dispositivo se debe abrir la dirección LAN del PC que sirve el frontend. En un despliegue real, un proxy inverso debe servir frontend y `/api` bajo el mismo origen HTTPS.
