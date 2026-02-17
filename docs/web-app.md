# NoteJob Web App Guide

## ¿Qué es NoteJob?
NoteJob es una app web para convertir ideas sueltas en trabajo ejecutable:
1. Capturas una idea.
2. La conviertes en tarea/proyecto con fechas y subtareas.
3. La cierras como recurso reutilizable (conocimiento).

## Estructura de la app
- `/`: landing de producto.
- `/app`: workspace principal (usuario).
- `/confirm-email`: confirmación de correo.
- `/admin/login` y `/admin`: panel admin para personalización visual/contenido.
- `/docs`: centro de documentación en la app desplegada.

## Funcionalidades principales
### Inicio (Landing)
- Explica propuesta de valor.
- Muestra secciones de flujo (`Capture -> Execute -> Reuse`).
- Contacto y overview del producto.

### Home / Workspace
- Resumen con métricas (tareas, proyectos, recursos, vencidas).
- Lista de items con fechas y tags.
- Chat IA para generar plan de tareas/proyectos.
- Vault privado para guardar secretos con tags (cifrado local).

### Tareas
- Crear tareas con:
  - título
  - resumen
  - fechas inicio/fin
  - subtareas
  - tags

### Proyectos
- Igual que tareas, pero orientado a trabajo de mayor alcance.
- Permite seguimiento por estados y fechas.

### Recursos
- Resultado consolidado de tareas/proyectos.
- Objetivo: que el conocimiento quede reutilizable.

## IA en la app
La app usa endpoint OpenAI-compatible para el chat planificador.

### ¿Para qué sirve la API Key?
- Autorizar llamadas a tu proveedor de IA.
- Sin API key, el chat no puede generar planes.

### ¿Qué es AI Base URL?
- URL del proveedor o gateway compatible con OpenAI.
- Ejemplo: `https://api.openai.com/v1` o gateway propio tipo bun-ai-api.

### ¿Qué es AI Model?
- Nombre del modelo que se enviará en `chat/completions`.

## Seguridad y por qué es necesaria
## ¿Por qué OAuth/Auth en web?
En una app web real necesitas identidad para:
- separar datos por usuario
- proteger contenido privado
- habilitar sesiones seguras
- evitar acceso no autorizado a funciones sensibles

### Seguridad de usuario
- Firebase Auth para signup/login.
- Verificación de correo para fortalecer control de cuenta.

### Seguridad admin
- Login admin server-side.
- Cookie `HttpOnly` firmada (no expone token en JS).
- Verificación de sesión en middleware para rutas `/admin`.
- Rate limiting y validación de origin en login admin.

### Seguridad en Vault
- Secretos cifrados localmente con AES-GCM + passphrase.
- Los datos en storage quedan cifrados, no texto plano.

## Personalización admin
El panel admin permite:
- Cambiar colores de marca.
- Cambiar textos de hero/tagline/CTA.
- Reordenar secciones con Gridstack.

## Flujo recomendado para equipo
1. Cambios en rama de GitHub.
2. Pull Request.
3. Preview en Vercel.
4. Merge a `main` para producción.

## Variables de entorno clave
- Usuario:
  - `PUBLIC_FIREBASE_API_KEY`
  - `PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `PUBLIC_FIREBASE_PROJECT_ID`
  - `PUBLIC_FIREBASE_APP_ID`
  - `PUBLIC_AI_BASE_URL`
  - `PUBLIC_AI_MODEL`
  - `PUBLIC_AI_API_KEY` (opcional; también se puede guardar en Settings usuario)
- Admin:
  - `NOTEJOB_ADMIN_USER`
  - `NOTEJOB_ADMIN_PASSWORD`
  - `NOTEJOB_ADMIN_SESSION_SECRET`

## Qué revisar si algo falla
- `docs/deploy.md`
- `docs/troubleshooting.md`
- `docs/security-secrets.md`
