# Troubleshooting

## `npm install` falla
- Verificar versión de Node/npm.
- Limpiar caché y reinstalar dependencias.

## Error de conexión con Cloudflare D1
- Validar `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_D1_DATABASE_NAME` en `.env`.
- Ejecutar:
  `npx wrangler whoami`
- Ejecutar:
  `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`

## `d1-reset-dev.ps1` falla
- Confirmar uso de `-Force`.
- Verificar que `wrangler` pueda autenticarse.
- Si falla por red/timeout, relanzar el comando.

## Deploy falla en Vercel
- Revisar variables de entorno en el proyecto.
- Revisar logs del build y del runtime.

## CI en rojo
- Inspeccionar job fallido.
- Corregir lint/tests y volver a ejecutar pipeline.
