# Lista de Tareas de Programación

Repositorio para construir una app de dos capas:
1. Gestor de tareas e investigación diaria.
2. Repositorio de conocimiento vivo (editable, relacionable y exportable).

La meta es capturar ideas (internet o archivos), convertirlas en tareas de investigación, y cuando maduren, promoverlas a guías de conocimiento reutilizable para proyectos reales.

## Estado actual del repositorio
- Fase: prototipo web funcional (Astro SSR) + arquitectura y scripts operativos.
- Base de datos primaria activa: `Cloudflare D1` (`tasks-primary-d1`).
- Base de datos secundaria: `Supabase` (transición/backup).
- Frontend web en `app/web` con:
  - `Bun + Astro + Sass` (modo oscuro moderno y responsive).
  - Firebase Auth para signup/login y confirmación de correo.
  - Panel Admin seguro (`/admin`) con autenticación server-side.
  - Personalización visual y de contenido (tema + textos + orden de secciones) con Gridstack.
  - Landing en inglés con secciones de producto, overview, características y contacto.
  - Geolocalización backend (`/api/locale`) con `ip.guide` para adaptar idioma (`en/es`).
  - Dashboard para tareas/proyectos/recursos + panel de configuración IA/Firebase.
  - Vault privado con tags y cifrado local en navegador para datos sensibles.
  - Animaciones con `GSAP` y `anime.js`.
  - Adapter actual: `@astrojs/node` (estable en desarrollo local).

## Stack objetivo
- Frontend: Astro SSR (activo).
- Backend/API: rutas serverless + workers (planificado).
- Datos:
  - Primario: Cloudflare D1.
  - Secundario: Supabase.
- CI/CD: GitHub Actions + Vercel (planificado).

## Capacidades clave del producto
- Tareas normales y tareas de investigación.
- Items de conocimiento por dominio (programación, matemáticas, Unity, Unreal, MCP, etc.).
- Guías derivadas de investigación (contenido editable en modal y exportable a PDF).
- Proyectos e ideas grandes vinculadas a conocimiento relacionado.
- Adjuntos universales (PDF, TXT, DOCX, imágenes, video y assets técnicos).
- Análisis de fuentes web y almacenamiento de insights.

## Scripts operativos actuales
- Migraciones D1: `powershell -ExecutionPolicy Bypass -File scripts/d1-migrate.ps1`
- Seed real: `powershell -ExecutionPolicy Bypass -File scripts/d1-seed.ps1`
- Reset rápido D1 (forzado): `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`
- Pruebas D1: `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`
- Smoke env por checklist: `scripts/run-env-smoke.cmd`
- Prototipo UI Astro (doble clic): `scripts/run-web-prototype.cmd`

## Frontend web (Astro)
Desde `app/web`:
- Instalar dependencias: `bun install`
- Desarrollo: `bun run dev`
- Build: `bun run build`
- Preview: `bun run preview`
- Responsive snapshots (Playwright): `bun run check:responsive`

## Referencias
- Replanteamiento y flujo del agente: `docs/agent-tasks.md`
- Arquitectura: `docs/architecture.md`
- Modelo de datos: `docs/database.md`
- API objetivo: `docs/api.md`
- Deploy: `docs/deploy.md`
