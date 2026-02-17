# Testing

## Build check
- `cd app/web`
- `bun run build`

## Runtime smoke
- `cd app/web`
- `bun run dev`
- Verificar:
  - `/`
  - `/app`
  - `/admin/login`
  - `/docs`

## D1 checks (if enabled)
- `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`
