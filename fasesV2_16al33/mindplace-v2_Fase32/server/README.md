# MindPlace API — Fase 32

Backend local Node.js + NestJS para autenticación y sincronización multidispositivo.

## Ejecutar

Desde la raíz del proyecto:

```powershell
npm --prefix server install
npm --prefix server run build
npm --prefix server start
```

O entrando en `server`:

```powershell
cd server
npm install
npm run build
node dist/main.js
```

El servidor escucha en todas las interfaces (`0.0.0.0`) en el puerto `3000` por defecto.

## Variables

Copia `.env.example` a `.env` y define al menos:

```text
PORT=3000
MINDPLACE_JWT_SECRET=una-clave-larga-y-secreta
```

Sin `MINDPLACE_JWT_SECRET`, el servidor usa una clave fija de desarrollo y muestra una advertencia. No debe utilizarse esa configuración en producción.

## Desarrollo multidispositivo

El frontend usa `/api` como origen de sincronización. Vite hace proxy de `/api` hacia `http://127.0.0.1:3000` y expone el frontend en `0.0.0.0:5173`.

Para probar desde otro dispositivo de la misma red:

1. Arranca el backend.
2. Arranca el frontend con `npm run dev -- --host 0.0.0.0`.
3. En el móvil/tablet abre `http://IP-DEL-PC:5173`.

En producción se recomienda servir frontend y `/api` bajo el mismo origen HTTPS mediante un proxy inverso.

## API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/cases`
- `GET /api/cases/:id`
- `PUT /api/cases/:id`
- `POST /api/cases/:id/resolve`
- `POST /api/sync/push`
- `POST /api/sync/pull`

Todas las rutas salvo `/api/health` y registro/login requieren `Authorization: Bearer <JWT>`.

## Persistencia

Los casos y usuarios se almacenan localmente en `server/data/users.json` y `server/data/cases.json`. El repositorio usa escritura atómica para evitar archivos parcialmente escritos.

## Prueba HTTP real

Con las dependencias instaladas y el backend compilado:

```powershell
npm run test:http
```

La prueba levanta NestJS en un puerto efímero y comprueba salud, registro, login, JWT, casos, pull, detección de conflicto y resolución.
