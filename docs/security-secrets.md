# Seguridad y secretos

## Principios
- Nunca commitear secretos.
- Usar GitHub Secrets y Vercel Environment Variables.
- Aplicar mínimo privilegio en tokens y claves.

## Variables detectadas en `.env`
- `GITHUB_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Variables recomendadas futuras
- `SUPABASE_ANON_KEY` (si se separa clave pública para frontend)
- `OPENAI_API_KEY` (si se habilita proveedor IA externo)

## Rotación
- Rotar claves periódicamente o ante incidente.
- Invalidar claves expuestas de inmediato.

## Auditoría
- Registrar acciones sensibles en `audit`.
- Evitar logging de datos sensibles.
