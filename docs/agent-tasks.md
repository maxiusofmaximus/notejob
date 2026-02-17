# Lista de Tareas del Agente — Proyecto "Lista de Tareas"

Propósito: ejecutar el proyecto como sistema de tareas + repositorio de conocimiento, con operación D1-first y Supabase como respaldo temporal.

## Regla operativa
- El agente no ejecuta acciones destructivas sin confirmación explícita del usuario.
- Toda operación con impacto externo debe quedar documentada en `docs/` y, cuando exista backend, en `audit`.

## Objetivo funcional del producto
- Capturar ideas/tareas desde internet o fuentes locales.
- Investigar y enriquecer esos temas.
- Convertir investigación completa en guía editable y exportable a PDF.
- Vincular conocimiento a proyectos grandes (Unity, Unreal, MCP, etc.).
- Soportar adjuntos universales y análisis de fuentes.

## Estrategia de datos
- Primaria: Cloudflare D1.
- Secundaria: Supabase (compatibilidad/transición).
- Nuevos cambios apuntan primero a D1.

## Flujo operativo del agente
1. Verificar entorno y secretos (`.env`, CLIs, conectividad).
2. Correr smoke interactivo (`scripts/run-env-smoke.cmd`).
3. Ejecutar migraciones D1 si aplica.
4. Cargar seed real para desarrollo si aplica.
5. Ejecutar pruebas D1 (`scripts/d1-test.ps1`).
6. Documentar resultados y decisiones.
7. Recién luego avanzar a implementación de UI/API.

## Scripts clave
- `scripts/smoke-env.ps1`: chequeo por conexión individual o múltiple.
- `scripts/run-env-smoke.cmd`: launcher para doble clic (modo checklist).
- `scripts/d1-migrate.ps1`: aplica migraciones D1.
- `scripts/d1-seed.ps1`: carga datos de ejemplo reales.
- `scripts/d1-reset-dev.ps1 -Force`: reset rápido de entorno D1 (dev).
- `scripts/d1-test.ps1`: validación de tablas, datos y joins.

## Modelo de dominio mínimo
- Tareas: `tasks`, `learning_tasks`.
- Conocimiento: `knowledge_items`, `guides`, `attachments`.
- Relación con iniciativas: `projects`, `project_knowledge_links`.
- Clasificación y grafo: `tags`, `item_tags`, `knowledge_relations`.
- Investigación: `analyses`.
- Trazabilidad: `audit`.

## Backlog inmediato
1. Scaffold de frontend para tablero de tareas + biblioteca de conocimiento.
2. Modal de guía: ver, editar y exportar PDF.
3. Ingesta de adjuntos por tipo y extracción básica.
4. Endpoint de análisis web (URL -> resumen -> item/guía).
5. Vista de proyecto con conocimiento vinculado.

## Datos seed alineados al objetivo
El seed actual ya incluye conceptos reales:
- Slime evolution game.
- Factory + dungeon strategy loop.
- Immortal cultivation RPG.
- Aura-like assistant for Unity.
