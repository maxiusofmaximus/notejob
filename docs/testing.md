# Testing

## Objetivo
Validar integridad de la capa de datos y la operación diaria del entorno antes de avanzar a UI/API completa.

## Estado actual
- No hay suite Node/Next implementada aún.
- Sí hay pruebas operativas para D1 y entorno.

## Pruebas operativas actuales
- Smoke de variables por checklist:
  - `scripts/run-env-smoke.cmd`
  - o `powershell -ExecutionPolicy Bypass -File scripts/smoke-env.ps1`
- Test de base D1:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-test.ps1`
- Flujo reset + seed:
  - `powershell -ExecutionPolicy Bypass -File scripts/d1-reset-dev.ps1 -Force`

## Resultado esperado de `d1-test`
- Todas las tablas requeridas existen.
- Hay datos seed en `knowledge_items`, `projects` y `project_knowledge_links`.
- Join de proyecto-item devuelve al menos un resultado.

## Próximas pruebas (cuando exista app)
- Unit tests:
  - parser de intención, validadores, mapeo de adjuntos.
- Integration tests:
  - API + D1 (lectura/escritura, relaciones y guías).
- E2E:
  - flujo inbox -> investigación -> guía -> exportación PDF.
