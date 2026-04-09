# Seguridad y secretos

## Principios
- Nunca commitear secretos.
- Usar GitHub Secrets y Vercel Environment Variables.
- Aplicar minimo privilegio en tokens y claves.

## Variables detectadas en `.env`
- `GITHUB_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_DATABASE_NAME`

## Variables recomendadas futuras
- `SUPABASE_ANON_KEY` (si se separa clave publica para frontend)
- `OPENAI_API_KEY` (si se habilita proveedor IA externo)

## Firebase Admin (server-side)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Rotacion
- Rotar claves periodicamente o ante incidente.
- Invalidar claves expuestas de inmediato.

## Auditoria
- Registrar acciones sensibles en `audit`.
- Evitar logging de datos sensibles.
