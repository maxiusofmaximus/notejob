# Setup local

## Prerrequisitos
- Bun 1.3+
- Git
- Variables en `.env` (ver `docs/security-secrets.md`)

## Instalación y arranque
1. Entrar al frontend:
   - `cd app/web`
2. Instalar dependencias:
   - `bun install`
3. Ejecutar en desarrollo:
   - `bun run dev`
4. Build de validación:
   - `bun run build`

## Base de datos D1 (opcional en local)
- Migrar:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-migrate.ps1`
- Seed:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-seed.ps1`
- Test:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`
- Reset dev:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`
