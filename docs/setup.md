# Setup local

## Estado actual
- Este repositorio todavía no contiene aplicación ejecutable.
- No existe `package.json` en la raíz.
- Sí incluye scripts PowerShell para operar base D1, smoke de entorno y reset rápido.

## Prerrequisitos
- Node.js 20+
- npm 10+
- Git
- (Opcional) `gh`, `vercel`, `supabase`
- Recomendado: acceso Cloudflare con token API en `.env`

## Instalación
1. Configurar `.env` con las variables necesarias (ver `docs/security-secrets.md`).
2. Probar variables con checklist:
   `scripts/run-env-smoke.cmd`
3. Validar conexión D1:
   `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`
4. Cuando se cree el scaffold, ejecutar:
   `npm install`

## Arranque local
- Pendiente de implementación. Comando objetivo:
  `npm run dev`

## Reset rápido de entorno D1
- Comando destructivo (solo dev):
  `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`
- Reaplica migraciones y seed real automáticamente.

## Verificación rápida
- `node --version` y `npm --version` responden.
- `.env` incluye claves requeridas.
- Una vez exista la app: `npm run dev`, lint y tests en verde.
