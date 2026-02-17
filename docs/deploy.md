# Deploy

## Estado actual
- Pipeline CI/CD no implementado aún.
- Este documento define el flujo objetivo para la primera versión.
- Estrategia de datos actual: `Cloudflare D1` como primaria y `Supabase` como secundaria de respaldo/transición.
- Scripts operativos disponibles para validar y resetear D1 en desarrollo.
- Frontend web migrado a `Bun + Astro SSR` en `app/web` con:
  - Modo oscuro + Sass.
  - Landing page en inglés (marketing + contacto).
  - Dashboard de tareas/proyectos/recursos.
  - Geolocalización backend por `ip.guide` para idioma por región.
  - Firebase Auth (email/password + verificación de correo).
  - Animaciones (`GSAP`, `anime.js`) y pruebas responsive con Playwright.

## Entornos
- Local
- Preview (PR)
- Producción

## Configuracion Vercel (Astro SSR)
1. En Vercel, configura `Root Directory` = `app/web`.
2. Framework preset: `Astro`.
3. Install command: `bun install`
4. Build command: `bun run build`
5. Nota: en este repo el adapter actual es `@astrojs/node` para estabilidad local (Windows).
6. Para producción en Vercel, puedes cambiar a `@astrojs/vercel` en CI/Linux si necesitas funciones Edge específicas.

## Variables recomendadas en Vercel
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `OPENAI_API_KEY` (o proveedor OpenAI-compatible)
- `AI_BASE_URL` (opcional, default `https://api.openai.com/v1`)
- `AI_MODEL` (opcional, default `gpt-4o-mini`)
- `NOTEJOB_DEFAULT_LOCALE` (opcional, fallback `en`)
- `PUBLIC_AI_BASE_URL` (para frontend, opcional)
- `PUBLIC_AI_MODEL` (para frontend, opcional)
- `PUBLIC_AI_API_KEY` (solo si aceptas exponerla al cliente; preferible que el usuario la defina en Settings)
- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_APP_ID`
- Admin panel (server-side auth):
  - `NOTEJOB_ADMIN_USER`
  - `NOTEJOB_ADMIN_PASSWORD`
  - `NOTEJOB_ADMIN_SESSION_SECRET` (cadena larga aleatoria)
- Si usas `bun-ai-api` de midudev como gateway secuencial:
  - `AI_BASE_URL` -> URL del gateway (`https://.../v1` o `http://localhost:3000/v1` en local).
  - `OPENAI_API_KEY` -> la key del proveedor que exponga endpoint OpenAI-compatible (ej. Cerebras).

## OAuth y confirmacion de correo (Firebase Auth)
1. En Firebase Console > Authentication:
   - Habilitar `Email/Password`.
   - Habilitar proveedores OAuth (`Google`, `GitHub`) si aplica.
2. En Firebase Console > Authentication > Settings:
   - Authorized domains: agrega `https://<tu-app>.vercel.app` y dominio custom.
   - Configura URL de acción para verificación de correo hacia `/confirm-email`.
3. En la app:
   - Abrir `Config` y cargar `Firebase API Key`, `Auth Domain`, `Project ID`, `App ID`.
   - Usar `Signup`/`Login` por correo+password desde navbar.
   - Confirmar correo antes del primer login si `Email verification` está activa.

## Seguridad admin (implementado)
- Ruta protegida: `/admin`
- Login: `/admin/login`
- API server-side:
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
  - `GET /api/admin/session`
- Controles aplicados:
  - Sesión firmada con HMAC en cookie `HttpOnly`, `SameSite=Strict`, expiración corta.
  - `Secure` cookie en producción.
  - Rate limit básico en endpoint de login.
  - Verificación de `origin` para mitigar solicitudes cruzadas.
- Recomendación:
  - No reutilizar credenciales de usuario normal para acceso admin.
  - Rotar `NOTEJOB_ADMIN_SESSION_SECRET` periódicamente.

## Estrategia de base de datos
- Primaria: `Cloudflare D1` (`tasks-primary-d1`).
- Secundaria: `Supabase` (mantenida activa hasta decisión final de retiro).
- Criterio de operación: nuevas pruebas y desarrollo apuntan primero a D1; Supabase se conserva para compatibilidad.

## Operación local frontend (dev)
1. Por terminal:
   - `cd app/web`
   - `bun install`
   - `bun run dev`

## Operación de despliegue de datos (dev)
1. Reset rápido si se requiere ambiente limpio:
   `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`
2. Validación de integridad:
   `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`

## Pipeline recomendado
1. Lint + tests en GitHub Actions.
2. Deploy preview automático por PR.
3. Aprobación manual para producción.

## Checklist pre-deploy
- Secrets configurados.
- Tests en verde.
- Migraciones revisadas.
- Cambios auditados.
- Aprobación humana explícita.

## Rollback
- Revertir a deployment estable anterior en Vercel.
- Si aplica, ejecutar rollback de migración según plan.
