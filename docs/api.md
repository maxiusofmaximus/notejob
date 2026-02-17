# API Reference (Implemented Endpoints)

This document describes the endpoints currently implemented in `app/web/src/pages/api`.

## Conventions
- Content type: `application/json`.
- Authentication:
  - Firebase auth is client-side for end users.
  - Admin panel auth uses `HttpOnly` session cookie (`notejob_admin_session`).
- Error responses use `{ "error": "..." }` when applicable.

## `POST /api/admin/login`
Creates an admin session cookie after validating credentials.

Request body:
```json
{
  "username": "admin",
  "password": "your-password"
}
```

Success response (`200`):
```json
{
  "ok": true
}
```

Error responses:
- `400`: invalid JSON payload.
- `401`: invalid credentials.
- `403`: invalid origin (origin/host mismatch).
- `429`: too many attempts from same IP in rolling window.
- `503`: server admin auth is not configured.

Server env required:
- `NOTEJOB_ADMIN_USER`
- `NOTEJOB_ADMIN_PASSWORD`
- `NOTEJOB_ADMIN_SESSION_SECRET`

Notes:
- Applies in-memory rate limit by IP (`8` attempts / `10` minutes).
- On success sets `notejob_admin_session` with `HttpOnly`, `SameSite=Strict`, path `/`, max-age `8h`.

## `POST /api/admin/logout`
Clears the admin session cookie.

Request body:
- none

Success response (`200`):
```json
{
  "ok": true
}
```

Notes:
- Sets `notejob_admin_session` with `maxAge: 0` to invalidate session.

## `GET /api/admin/session`
Checks current admin session state.

Request body:
- none

Success response (`200`, authenticated):
```json
{
  "authenticated": true,
  "username": "admin"
}
```

Success response (`200`, unauthenticated):
```json
{
  "authenticated": false
}
```

Success response (`200`, missing config):
```json
{
  "authenticated": false,
  "reason": "missing-server-config"
}
```

Notes:
- Reads cookie `notejob_admin_session`.
- Verifies signed payload and expiration server-side.

## `GET /api/locale`
Infers locale and location metadata using request headers and `ip.guide`.

Request body:
- none

Success response (`200`):
```json
{
  "locale": "es",
  "country": "Colombia",
  "city": "Bogotá",
  "ip": "203.0.113.10"
}
```

Notes:
- Uses `x-forwarded-for` when available.
- Falls back to `accept-language` mapping if geo lookup fails.
- Returns `cache-control: max-age=300`.
- Locale mapping currently supports Spanish detection for: `ES`, `MX`, `CO`, `AR`, `CL`, `PE`; default is `en`.

## `POST /api/ai/plan`
Creates planning tasks from a user prompt through a server-side provider call.

Request body:
```json
{
  "prompt": "Plan my week for Unity and Unreal learning",
  "model": "gpt-4o-mini",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "optional-override-key"
}
```

Only `prompt` is required. `model`, `baseUrl`, and `apiKey` are optional overrides.

Success response (`200`):
```json
{
  "tasks": [
    {
      "title": "Unity ECS practice",
      "summary": "Build one prototype focused on systems.",
      "kind": "task",
      "status": "inbox",
      "startDate": "2026-02-17",
      "dueDate": "2026-02-19",
      "doneSubtasks": 0,
      "totalSubtasks": 3,
      "resources": ["Unity", "ECS"]
    }
  ]
}
```

Error responses:
- `400`: invalid JSON payload or missing `prompt`.
- `502`: upstream provider error or invalid provider JSON response format.
- `503`: no API key available on server/request.

Configuration resolution order:
- `baseUrl`: request `baseUrl` -> `NOTEJOB_AI_BASE_URL` -> `AI_BASE_URL` -> `PUBLIC_AI_BASE_URL` -> `https://api.openai.com/v1`
- `model`: request `model` -> `NOTEJOB_AI_MODEL` -> `AI_MODEL` -> `PUBLIC_AI_MODEL` -> `gpt-4o-mini`
- `apiKey`: request `apiKey` -> `NOTEJOB_AI_API_KEY` -> `AI_API_KEY` -> `OPENAI_API_KEY` -> `PUBLIC_AI_API_KEY`

Notes:
- This endpoint is consumed by the web app chat planner and keeps provider orchestration on the server.
- Response is normalized to a stable `tasks[]` structure before returning to the client.
