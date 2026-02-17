# Base de datos

Estado actual:
- Primaria: Cloudflare D1 (`tasks-primary-d1`).
- Secundaria: Supabase (transición/backup).
- Migraciones aplicadas:
  - `infra/d1/migrations/0001_init.sql`
  - `infra/d1/migrations/0002_knowledge_repository.sql`

## Modelo activo

Core:
- `users`
- `tasks`
- `learning_tasks`
- `audit`

Knowledge repository:
- `knowledge_items`
- `guides`
- `attachments`
- `projects`
- `project_knowledge_links`
- `tags`
- `item_tags`
- `knowledge_relations`
- `analyses`

## Propósito de las tablas nuevas
- `knowledge_items`: unidad principal de conocimiento (task/concept/guide seed).
- `guides`: contenido consolidado y versionable para lectura/edición/exportación.
- `attachments`: referencias a archivos/fuentes por item.
- `projects`: iniciativas grandes (juegos, herramientas, IA, etc.).
- `project_knowledge_links`: relación N:N entre proyectos e items.
- `tags`/`item_tags`: clasificación flexible por dominio/engine/stack.
- `knowledge_relations`: grafo semántico (`requires`, `extends`, `related`).
- `analyses`: resultados de análisis de fuentes y sus insights.

## Scripts D1
- Migrar:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-migrate.ps1`
- Seed real:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-seed.ps1`
- Reset rápido (destructivo, requiere `-Force`):
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`
- Test de integridad:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`

## Datos de ejemplo cargados
Seed actual (`infra/d1/seeds/0001_real_knowledge_seed.sql`) incluye:
- Proyectos: slime evolution, factory+dungeon, immortal cultivation, aura for unity.
- Items de conocimiento y tareas relacionados.
- Tags, relaciones entre conocimiento y análisis iniciales.

## Nota de compatibilidad D1
- D1 usa SQLite; estructuras tipo JSON se guardan en texto (`*_json`) cuando aplica.
