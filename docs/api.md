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

## `GET /api/items`
Returns saved items for the authenticated user.

Authentication: requires Firebase ID token (Authorization: Bearer).

Success response (`200`):
```json
{
  "items": [
    {
      "id": "i-123",
      "kind": "task",
      "title": "Example",
      "summary": "...",
      "status": "inbox",
      "startDate": "2026-02-18",
      "dueDate": "2026-02-20",
      "doneSubtasks": 0,
      "totalSubtasks": 1,
      "resources": ["AI"],
      "tags": ["Brief"],
      "updatedAt": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

## `POST /api/items`
Upserts a single item for the authenticated user.

Authentication: requires Firebase ID token (Authorization: Bearer).

Request body:
```json
{
  "id": "i-123",
  "kind": "task",
  "title": "Example",
  "summary": "...",
  "status": "inbox",
  "startDate": "2026-02-18",
  "dueDate": "2026-02-20",
  "doneSubtasks": 0,
  "totalSubtasks": 1,
  "resources": ["AI"],
  "tags": ["Brief"]
}
```

## `GET /api/vault`
Returns vault entries for the authenticated user.

Authentication: requires Firebase ID token (Authorization: Bearer).

Success response (`200`):
```json
{
  "entries": [
    {
      "id": "vault-123",
      "label": "GitHub Token",
      "tags": ["dev"],
      "cipher": "...",
      "iv": "...",
      "salt": "...",
      "createdAt": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

## `POST /api/vault`
Upserts a vault entry for the authenticated user.

Authentication: requires Firebase ID token (Authorization: Bearer).

Request body:
```json
{
  "id": "vault-123",
  "label": "GitHub Token",
  "tags": ["dev"],
  "cipher": "...",
  "iv": "...",
  "salt": "..."
}
```

## `POST /api/ai/plan`
Creates planning tasks from a user prompt through a server-side provider call.

Authentication: requires Firebase ID token (Authorization: Bearer).

Request body:
```json
{
  "prompt": "Plan my week for Unity and Unreal learning",
  "model": "gpt-4o-mini",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "optional-user-key",
  "email": "user@example.com"
}
```

Only `prompt` is required.

Modes:
- `BYOK` mode: send `apiKey` (user key). No trial credit is consumed.
- `Trial` mode: omit `apiKey`. Server uses shared trial providers and consumes one credit from `email`.

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
  ],
  "provider": "cerebras",
  "trial": {
    "creditsRemaining": 0,
    "trialUsed": 1,
    "updatedAt": "2026-02-17T17:30:00.000Z"
  }
}
```

Error responses:
- `400`: invalid JSON payload or missing `prompt`.
- `400`: trial mode without `email`.
- `402`: no trial credits remaining.
- `502`: all upstream providers failed or invalid provider JSON response format.
- `503`: no API key available on server/request.

Configuration resolution order:
- `baseUrl`: request `baseUrl` -> `NOTEJOB_AI_BASE_URL` -> `AI_BASE_URL` -> `https://api.openai.com/v1`
- `model`: request `model` -> `NOTEJOB_AI_MODEL` -> `AI_MODEL` -> `gpt-4o-mini`
- `apiKey` BYOK: request `apiKey` only
- Trial providers:
  - Cerebras key: `CEREBRAS_TRIAL_API_KEY` -> `NOTEJOB_AI_API_KEY` -> `AI_API_KEY`
  - Cerebras base URL: `CEREBRAS_BASE_URL` (default `https://api.cerebras.ai/v1`)
  - Groq key: `GROQ_TRIAL_API_KEY` -> `GROQ_API_KEY`
  - Groq base URL: `GROQ_BASE_URL` (default `https://api.groq.com/openai/v1`)

Notes:
- This endpoint is consumed by the web app chat planner and keeps provider orchestration on the server.
- Response is normalized to a stable `tasks[]` structure before returning to the client.
- Current trial credits store is in-memory (resets on server restart/redeploy). For production, move to persistent DB.

## `GET /api/admin/ai-credits`
Reads trial status for a user email (admin session required).

Query params:
- `email` (required)

Success response (`200`):
```json
{
  "email": "user@example.com",
  "trial": {
    "creditsRemaining": 1,
    "trialUsed": 0,
    "updatedAt": "2026-02-17T17:30:00.000Z"
  }
}
```

Error responses:
- `400`: missing `email`.
- `401`: unauthorized admin session.
- `503`: admin auth missing on server.

## `POST /api/admin/ai-credits`
Mutates trial credits for a user email (admin session required).

Request body:
```json
{
  "email": "user@example.com",
  "action": "reset"
}
```

or

```json
{
  "email": "user@example.com",
  "action": "grant",
  "amount": 10
}
```

Success response (`200`):
```json
{
  "ok": true,
  "email": "user@example.com",
  "trial": {
    "creditsRemaining": 11,
    "trialUsed": 0,
    "updatedAt": "2026-02-17T17:30:00.000Z"
  }
}
```
